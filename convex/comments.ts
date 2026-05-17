import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listForMemory = query({
  args: { memoryId: v.id("memories") },
  handler: async (ctx, { memoryId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_memory", (q) => q.eq("memoryId", memoryId))
      .order("asc")
      .take(100);
    return Promise.all(
      comments.map(async (c) => {
        const author = await ctx.db.get(c.authorId);
        let avatarUrl: string | null = null;
        if (author?.avatarStorageId) {
          avatarUrl = await ctx.storage.getUrl(author.avatarStorageId);
        }
        let photoThumbnailUrl: string | null = null;
        if (c.photoStorageId) {
          photoThumbnailUrl = await ctx.storage.getUrl(c.photoStorageId);
        }
        return {
          ...c,
          authorName: author?.name ?? "Unknown",
          authorAvatarPreset: author?.avatarPreset ?? null,
          authorAvatarUrl: avatarUrl,
          photoThumbnailUrl,
        };
      })
    );
  },
});

export const add = mutation({
  args: {
    memoryId: v.id("memories"),
    body: v.string(),
    photoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, { memoryId, body, photoStorageId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const memory = await ctx.db.get(memoryId);
    if (!memory) throw new Error("Memory not found");
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!membership || membership.spaceId !== memory.spaceId) throw new Error("Forbidden");
    return ctx.db.insert("comments", {
      memoryId,
      authorId: userId,
      body: body.trim(),
      createdAt: Date.now(),
      ...(photoStorageId ? { photoStorageId } : {}),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("comments") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const comment = await ctx.db.get(id);
    if (!comment) return;
    if (comment.authorId !== userId) throw new Error("Forbidden");
    await ctx.db.delete(id);
  },
});
