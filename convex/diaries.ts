import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

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
    return ctx.db
      .query("diaries")
      .withIndex("by_space_created", (q) => q.eq("spaceId", membership.spaceId))
      .order("desc")
      .take(100);
  },
});

export const create = mutation({
  args: {
    title: v.optional(v.string()),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!membership) throw new Error("No space found");
    return ctx.db.insert("diaries", {
      spaceId: membership.spaceId,
      authorId: userId,
      title: args.title,
      body: args.body,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("diaries") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const diary = await ctx.db.get(id);
    if (!diary) return;
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!membership || membership.spaceId !== diary.spaceId) throw new Error("Forbidden");
    await ctx.db.delete(id);
  },
});
