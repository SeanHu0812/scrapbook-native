import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const mySpace = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!membership) return null;

    const space = await ctx.db.get(membership.spaceId);
    if (!space) return null;

    const allMemberships = await ctx.db
      .query("memberships")
      .withIndex("by_space", (q) => q.eq("spaceId", space._id))
      .take(10);

    const members = (
      await Promise.all(
        allMemberships.map(async (m) => {
          const user = await ctx.db.get(m.userId);
          if (!user) return null;
          const avatarUrl = user.avatarStorageId
            ? await ctx.storage.getUrl(user.avatarStorageId)
            : null;
          return {
            userId: m.userId,
            name: user.name,
            avatarPreset: user.avatarPreset ?? null,
            avatarUrl,
          };
        })
      )
    ).filter((m): m is NonNullable<typeof m> => m !== null);

    return { space, members, status: space.status };
  },
});

export const stats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { memoriesCount: 0, photosCount: 0, voiceNotesCount: 0 };

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!membership) return { memoriesCount: 0, photosCount: 0, voiceNotesCount: 0 };

    const spaceId = membership.spaceId;

    // Count memories — bounded at 10000 for safety; real apps should use a counter
    const memories = await ctx.db
      .query("memories")
      .withIndex("by_space", (q) => q.eq("spaceId", spaceId))
      .take(10000);
    const memoriesCount = memories.length;
    const voiceNotesCount = memories.filter((m) => m.audioStorageId != null).length;

    // Count photo assets
    const photoAssets = await ctx.db
      .query("mediaAssets")
      .withIndex("by_space", (q) => q.eq("spaceId", spaceId))
      .take(10000);
    const photosCount = photoAssets.filter((a) => a.kind === "photo").length;

    return { memoriesCount, photosCount, voiceNotesCount };
  },
});

export const updateStartDate = mutation({
  args: { startDate: v.string() },
  handler: async (ctx, { startDate }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!membership) throw new Error("No space found");

    await ctx.db.patch(membership.spaceId, { startDate });
  },
});

// Placeholder — finalized in M1 #11
export const favorites = query({
  args: {},
  handler: async (_ctx) => {
    return [];
  },
});
