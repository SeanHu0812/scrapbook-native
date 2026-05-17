import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const countsForMemory = query({
  args: { memoryId: v.id("memories") },
  handler: async (ctx, { memoryId }) => {
    const userId = await getAuthUserId(ctx);
    const reactions = await ctx.db
      .query("reactions")
      .withIndex("by_memory", (q) => q.eq("memoryId", memoryId))
      .collect();
    const hearts = reactions.filter((r) => r.emoji === "heart");
    const liked = userId ? hearts.some((r) => r.userId === userId) : false;
    return { heartCount: hearts.length, liked };
  },
});

export const toggle = mutation({
  args: { memoryId: v.id("memories"), kind: v.optional(v.string()) },
  handler: async (ctx, { memoryId, kind = "heart" }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_memory_user", (q) => q.eq("memoryId", memoryId).eq("userId", userId))
      .filter((q) =>
        q.and(q.eq(q.field("emoji"), kind), q.eq(q.field("photoStorageId"), undefined))
      )
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    } else {
      await ctx.db.insert("reactions", { memoryId, userId, emoji: kind });
    }
  },
});

export const likedPhoto = query({
  args: { memoryId: v.id("memories"), storageId: v.id("_storage") },
  handler: async (ctx, { memoryId, storageId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const reaction = await ctx.db
      .query("reactions")
      .withIndex("by_memory_user", (q) => q.eq("memoryId", memoryId).eq("userId", userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("emoji"), "heart"),
          q.eq(q.field("photoStorageId"), storageId)
        )
      )
      .first();
    return !!reaction;
  },
});

export const togglePhoto = mutation({
  args: { memoryId: v.id("memories"), storageId: v.id("_storage") },
  handler: async (ctx, { memoryId, storageId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_memory_user", (q) => q.eq("memoryId", memoryId).eq("userId", userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("emoji"), "heart"),
          q.eq(q.field("photoStorageId"), storageId)
        )
      )
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    } else {
      await ctx.db.insert("reactions", { memoryId, userId, emoji: "heart", photoStorageId: storageId });
    }
  },
});
