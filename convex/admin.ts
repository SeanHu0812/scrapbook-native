import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";

const ADMIN_EMAIL = "sh7285@nyu.edu";

async function assertAdmin(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user || user.email !== ADMIN_EMAIL) throw new Error("Forbidden");
}

export const isAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const user = await ctx.db.get(userId);
    return user?.email === ADMIN_EMAIL;
  },
});

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx);
    const users = await ctx.db.query("users").collect();
    return await Promise.all(
      users.map(async (user) => {
        const membership = await ctx.db
          .query("memberships")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .first();
        const space = membership ? await ctx.db.get(membership.spaceId) : null;
        return {
          _id: user._id,
          _creationTime: user._creationTime,
          name: user.name,
          email: user.email,
          spaceName: space?.name ?? null,
          spaceStatus: space?.status ?? null,
          joinedAt: membership?.joinedAt ?? null,
        };
      }),
    );
  },
});

export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await assertAdmin(ctx);
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const m of memberships) {
      const spaceMembers = await ctx.db
        .query("memberships")
        .withIndex("by_space", (q) => q.eq("spaceId", m.spaceId))
        .collect();
      await ctx.db.delete(m._id);
      if (spaceMembers.length === 1) {
        await ctx.db.delete(m.spaceId);
      }
    }
    await ctx.db.delete(userId);
  },
});

export const listInvites = query({
  args: {},
  handler: async (ctx) => {
    await assertAdmin(ctx);
    const invites = await ctx.db.query("invites").collect();
    return await Promise.all(
      invites.map(async (invite) => {
        const creator = await ctx.db.get(invite.createdBy);
        const usedByUser = invite.usedBy ? await ctx.db.get(invite.usedBy) : null;
        const space = await ctx.db.get(invite.spaceId);
        return {
          _id: invite._id,
          code: invite.code,
          spaceName: space?.name ?? "Unknown",
          creatorName: creator?.name ?? "Unknown",
          creatorEmail: creator?.email ?? "",
          usedByName: usedByUser?.name ?? null,
          usedAt: invite.usedAt ?? null,
          expiresAt: invite.expiresAt ?? null,
        };
      }),
    );
  },
});

export const revokeInvite = mutation({
  args: { inviteId: v.id("invites") },
  handler: async (ctx, { inviteId }) => {
    await assertAdmin(ctx);
    await ctx.db.delete(inviteId);
  },
});
