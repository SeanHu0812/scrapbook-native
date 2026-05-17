import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return ctx.db.get(userId);
  },
});

export const updateProfile = mutation({
  args: {
    name: v.string(),
    avatarPreset: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    nickname: v.optional(v.string()),
    birthday: v.optional(v.string()),
  },
  handler: async (ctx, { name, avatarPreset, avatarStorageId, nickname, birthday }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.patch(userId, { name, avatarPreset, avatarStorageId, nickname, birthday });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return ctx.storage.generateUploadUrl();
  },
});

export const getStorageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => ctx.storage.getUrl(storageId),
});

// Idempotent — safe to call on every authenticated mount.
// Creates the user doc if missing (safety valve), then auto-creates a solo
// space + membership if the user has none yet.
export const ensureProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const existing = await ctx.db.get(userId);
    // User doc is created by createOrUpdateUser in auth.ts. If somehow missing,
    // we can't insert with a specific ID in Convex — bail out gracefully.
    if (!existing) return;
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (membership) return;
    const spaceId = await ctx.db.insert("spaces", {
      name: "our little space",
      createdBy: userId,
      status: "solo",
    });
    await ctx.db.insert("memberships", {
      spaceId,
      userId,
      joinedAt: Date.now(),
    });
  },
});
