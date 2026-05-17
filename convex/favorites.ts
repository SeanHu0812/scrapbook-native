import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!membership) return null;

    const favorites = await ctx.db
      .query("spaceFavorites")
      .withIndex("by_space", (q) => q.eq("spaceId", membership.spaceId))
      .first();
    if (!favorites) return null;

    // Resolve memory details if memoryId is set
    let memoryTitle: string | null = null;
    let memoryDate: string | null = null;
    let memoryScene: string | null = null;
    if (favorites.memoryId) {
      const memory = await ctx.db.get(favorites.memoryId);
      if (memory) {
        memoryTitle = memory.title;
        memoryDate = memory.date;
        memoryScene = memory.scene;
      }
    }

    // Resolve photo URLs
    const photoUrls: string[] = [];
    for (const storageId of favorites.photoStorageIds ?? []) {
      const url = await ctx.storage.getUrl(storageId);
      if (url) photoUrls.push(url);
    }

    return {
      ...favorites,
      memoryTitle,
      memoryDate,
      memoryScene,
      photoUrls,
    };
  },
});

export const upsert = mutation({
  args: {
    memoryId: v.optional(v.id("memories")),
    photoStorageIds: v.optional(v.array(v.id("_storage"))),
    songName: v.optional(v.string()),
    songArtist: v.optional(v.string()),
    spotifyTrackId: v.optional(v.string()),
    places: v.optional(v.string()),
    movie: v.optional(v.string()),
    activities: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!membership) throw new Error("No space found");

    const existing = await ctx.db
      .query("spaceFavorites")
      .withIndex("by_space", (q) => q.eq("spaceId", membership.spaceId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("spaceFavorites", {
        spaceId: membership.spaceId,
        ...args,
      });
    }
  },
});
