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
    const now = Date.now();
    const rows = await ctx.db
      .query("notes")
      .withIndex("by_space_created", (q) => q.eq("spaceId", membership.spaceId))
      .order("desc")
      .take(50);
    return rows.filter((n) => !n.expiresAt || n.expiresAt > now);
  },
});

// Used by journal — includes expired notes so nothing disappears from history
export const listAll = query({
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
      .query("notes")
      .withIndex("by_space_created", (q) => q.eq("spaceId", membership.spaceId))
      .order("desc")
      .take(100);
  },
});

export const create = mutation({
  args: {
    body: v.string(),
    template: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!membership) throw new Error("No space found");
    return ctx.db.insert("notes", {
      spaceId: membership.spaceId,
      authorId: userId,
      body: args.body,
      template: args.template,
      createdAt: Date.now(),
      expiresAt: args.expiresAt,
    });
  },
});

export const saveToJournal = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const note = await ctx.db.get(id);
    if (!note) return;
    await ctx.db.patch(id, { expiresAt: undefined });
  },
});

export const remove = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const note = await ctx.db.get(id);
    if (!note) return;
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!membership || membership.spaceId !== note.spaceId) throw new Error("Forbidden");
    await ctx.db.delete(id);
  },
});
