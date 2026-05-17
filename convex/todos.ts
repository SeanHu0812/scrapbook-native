import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const categoryValidator = v.union(
  v.literal("errand"),
  v.literal("date"),
  v.literal("trip"),
  v.literal("read"),
  v.literal("home"),
);

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
      .query("todos")
      .withIndex("by_space", (q) => q.eq("spaceId", membership.spaceId))
      .order("desc")
      .take(200);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    notes: v.optional(v.string()),
    assigneeId: v.optional(v.id("users")),
    category: categoryValidator,
    due: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!membership) throw new Error("No space found");
    return ctx.db.insert("todos", {
      ...args,
      spaceId: membership.spaceId,
      createdBy: userId,
      createdAt: Date.now(),
      done: false,
    });
  },
});

export const toggle = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const todo = await ctx.db.get(id);
    if (!todo) throw new Error("Not found");
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!membership || membership.spaceId !== todo.spaceId) throw new Error("Forbidden");
    await ctx.db.patch(id, { done: !todo.done });
  },
});

export const update = mutation({
  args: {
    id: v.id("todos"),
    title: v.optional(v.string()),
    notes: v.optional(v.string()),
    assigneeId: v.optional(v.id("users")),
    category: v.optional(categoryValidator),
    due: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const todo = await ctx.db.get(id);
    if (!todo) throw new Error("Not found");
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!membership || membership.spaceId !== todo.spaceId) throw new Error("Forbidden");
    const patch = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const todo = await ctx.db.get(id);
    if (!todo) return;
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!membership || membership.spaceId !== todo.spaceId) throw new Error("Forbidden");
    await ctx.db.delete(id);
  },
});
