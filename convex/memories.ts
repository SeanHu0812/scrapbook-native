import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";

async function resolveUrl(
  ctx: QueryCtx,
  asset: { storageId?: Id<"_storage"> | null; r2Url?: string | null },
): Promise<string | null> {
  if (asset.r2Url) return asset.r2Url;
  if (asset.storageId) return ctx.storage.getUrl(asset.storageId);
  return null;
}

const sceneValidator = v.union(
  v.literal("coffee"), v.literal("couple"), v.literal("sunset"),
  v.literal("flowers"), v.literal("airplane"), v.literal("river"),
  v.literal("photo"),
);

// ── Auth helpers ──────────────────────────────────────────────────────────────

/** Returns the current user's membership, throwing on auth failure. */
async function requireMembership(ctx: MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const m = await ctx.db
    .query("memberships")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  if (!m) throw new Error("No space found");
  return { userId, spaceId: m.spaceId };
}

/**
 * Fetches a memory and verifies the current user is a member of its space.
 * Throws on auth failure or if the memory doesn't exist.
 */
async function requireMemoryAccess(ctx: MutationCtx, memoryId: Id<"memories">) {
  const { userId, spaceId } = await requireMembership(ctx);
  const memory = await ctx.db.get(memoryId);
  if (!memory) throw new Error("Not found");
  if (memory.spaceId !== spaceId) throw new Error("Forbidden");
  return { userId, spaceId, memory: memory as Doc<"memories"> };
}

// ── Queries ───────────────────────────────────────────────────────────────────

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!membership) return [];
    const rows = await ctx.db
      .query("memories")
      .withIndex("by_space_date", (q) => q.eq("spaceId", membership.spaceId))
      .order("desc")
      .take(100);
    return Promise.all(
      rows.map(async (m) => {
        const firstAsset = await ctx.db
          .query("mediaAssets")
          .withIndex("by_memory", (q) => q.eq("memoryId", m._id))
          .first();
        const firstPhotoUrl = firstAsset ? await resolveUrl(ctx, firstAsset) : null;
        return { ...m, firstPhotoUrl };
      })
    );
  },
});

export const get = query({
  args: { id: v.id("memories") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const memory = await ctx.db.get(id);
    if (!memory) return null;
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!membership || membership.spaceId !== memory.spaceId) return null;

    // collect() instead of .take(10) — no silent cap on photo count
    const assets = await ctx.db
      .query("mediaAssets")
      .withIndex("by_memory", (q) => q.eq("memoryId", id))
      .collect();

    type PhotoEntry = { url: string; storageId: (typeof assets)[number]["storageId"] };
    const photos: PhotoEntry[] = [];
    for (const a of assets.filter((a) => a.kind === "photo")) {
      const url = await resolveUrl(ctx, a);
      if (url) photos.push({ url, storageId: a.storageId });
    }

    const audioUrl = memory.audioStorageId
      ? await ctx.storage.getUrl(memory.audioStorageId)
      : null;

    // photoUrls removed — was redundant with photos[i].url
    return { ...memory, photos, audioUrl };
  },
});

export const listAllPhotos = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!membership) return [];

    const memories = await ctx.db
      .query("memories")
      .withIndex("by_space_date", (q) => q.eq("spaceId", membership.spaceId))
      .order("desc")
      .take(200);

    const result: {
      url: string;
      storageId: Id<"_storage"> | null;
      memoryId: Id<"memories"> | null;
      memoryTitle: string;
      date: string;
      uploadedAt: number;
    }[] = [];

    for (const memory of memories) {
      const assets = await ctx.db
        .query("mediaAssets")
        .withIndex("by_memory", (q) => q.eq("memoryId", memory._id))
        .collect();
      for (const asset of assets.filter((a) => a.kind === "photo")) {
        const url = await resolveUrl(ctx, asset);
        if (url) {
          result.push({
            url,
            storageId: asset.storageId ?? null,
            memoryId: memory._id,
            memoryTitle: memory.title,
            date: memory.date,
            uploadedAt: asset._creationTime,
          });
        }
      }
    }

    // Also include standalone photos uploaded directly to album
    const standaloneAssets = await ctx.db
      .query("mediaAssets")
      .withIndex("by_space", (q) => q.eq("spaceId", membership.spaceId))
      .filter((q) => q.and(
        q.eq(q.field("kind"), "photo"),
        q.eq(q.field("memoryId"), undefined),
      ))
      .order("desc")
      .take(500);

    for (const asset of standaloneAssets) {
      const url = await resolveUrl(ctx, asset);
      if (url) {
        result.push({
          url,
          storageId: asset.storageId ?? null,
          memoryId: null,
          memoryTitle: "Photo",
          date: new Date(asset._creationTime).toISOString().slice(0, 10),
          uploadedAt: asset._creationTime,
        });
      }
    }

    result.sort((a, b) => b.uploadedAt - a.uploadedAt);

    return result;
  },
});

export const uploadToAlbum = mutation({
  args: { r2Urls: v.array(v.string()) },
  handler: async (ctx, { r2Urls }) => {
    const { userId, spaceId } = await requireMembership(ctx);
    for (const r2Url of r2Urls) {
      await ctx.db.insert("mediaAssets", {
        r2Url,
        uploadedBy: userId,
        spaceId,
        kind: "photo",
      });
    }
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    date: v.string(),
    weekday: v.string(),
    location: v.optional(v.string()),
    scene: sceneValidator,
    r2PhotoUrls: v.optional(v.array(v.string())),
    audioStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, { r2PhotoUrls, audioStorageId, body, ...args }) => {
    const { userId, spaceId } = await requireMembership(ctx);

    const memoryId = await ctx.db.insert("memories", {
      ...args,
      body,
      caption: body.trim().slice(0, 80),
      spaceId,
      authorId: userId,
      ...(audioStorageId ? { audioStorageId } : {}),
    });

    for (const r2Url of r2PhotoUrls ?? []) {
      await ctx.db.insert("mediaAssets", {
        r2Url,
        uploadedBy: userId,
        spaceId,
        kind: "photo",
        memoryId,
      });
    }

    return memoryId;
  },
});

export const addPhotos = mutation({
  args: {
    id: v.id("memories"),
    r2PhotoUrls: v.array(v.string()),
  },
  handler: async (ctx, { id, r2PhotoUrls }) => {
    const { userId, memory } = await requireMemoryAccess(ctx, id);
    for (const r2Url of r2PhotoUrls) {
      await ctx.db.insert("mediaAssets", {
        r2Url,
        uploadedBy: userId,
        spaceId: memory.spaceId,
        kind: "photo",
        memoryId: id,
      });
    }
    if (r2PhotoUrls.length > 0) {
      await ctx.db.patch(id, { scene: "photo" });
    }
  },
});

export const removePhoto = mutation({
  args: { memoryId: v.id("memories"), storageId: v.optional(v.id("_storage")), r2Url: v.optional(v.string()) },
  handler: async (ctx, { memoryId, storageId, r2Url }) => {
    await requireMemoryAccess(ctx, memoryId);
    const asset = await ctx.db
      .query("mediaAssets")
      .withIndex("by_memory", (q) => q.eq("memoryId", memoryId))
      .filter((q) =>
        storageId
          ? q.eq(q.field("storageId"), storageId)
          : q.eq(q.field("r2Url"), r2Url),
      )
      .first();
    if (asset) {
      if (asset.storageId) await ctx.storage.delete(asset.storageId);
      await ctx.db.delete(asset._id);
    }
    // .first() is enough — only need to know if any photos remain
    const hasRemaining = !!(await ctx.db
      .query("mediaAssets")
      .withIndex("by_memory", (q) => q.eq("memoryId", memoryId))
      .first());
    if (!hasRemaining) {
      const scenes = ["coffee", "couple", "sunset", "flowers", "airplane", "river"] as const;
      await ctx.db.patch(memoryId, { scene: scenes[Math.floor(Math.random() * scenes.length)] });
    }
  },
});

export const update = mutation({
  args: {
    id: v.id("memories"),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    date: v.optional(v.string()),
    weekday: v.optional(v.string()),
    location: v.optional(v.string()),
    scene: v.optional(sceneValidator),
    // caption: removed from API — auto-synced when body changes
    // weather: removed from API — unused field
    // stickers: removed from API — feature not active
  },
  handler: async (ctx, { id, body, ...fields }) => {
    await requireMemoryAccess(ctx, id);
    const patch: Record<string, unknown> = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined)
    );
    if (body !== undefined) {
      patch.body = body;
      patch.caption = body.trim().slice(0, 80);
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(id, patch);
    }
  },
});

export const remove = mutation({
  args: { id: v.id("memories") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const memory = await ctx.db.get(id);
    if (!memory) return; // already deleted — idempotent
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!membership || membership.spaceId !== memory.spaceId)
      throw new Error("Forbidden");

    // Cascade: media assets + their backing storage files
    const assets = await ctx.db
      .query("mediaAssets")
      .withIndex("by_memory", (q) => q.eq("memoryId", id))
      .collect();
    for (const a of assets) {
      if (a.storageId) await ctx.storage.delete(a.storageId);
      await ctx.db.delete(a._id);
    }
    if (memory.audioStorageId) {
      await ctx.storage.delete(memory.audioStorageId);
    }

    // Cascade: comments
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_memory", (q) => q.eq("memoryId", id))
      .collect();
    for (const c of comments) await ctx.db.delete(c._id);

    // Cascade: reactions
    const reactions = await ctx.db
      .query("reactions")
      .withIndex("by_memory", (q) => q.eq("memoryId", id))
      .collect();
    for (const r of reactions) await ctx.db.delete(r._id);

    await ctx.db.delete(id);
  },
});
