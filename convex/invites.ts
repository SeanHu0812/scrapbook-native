import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Public — no auth required. Returns inviter info + validity status.
export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();

    if (!invite) return { status: "not_found" as const };
    if (invite.usedBy) return { status: "used" as const };
    if (invite.expiresAt && invite.expiresAt < Date.now())
      return { status: "expired" as const };

    const inviter = await ctx.db.get(invite.createdBy);
    const avatarUrl = inviter?.avatarStorageId
      ? await ctx.storage.getUrl(inviter.avatarStorageId)
      : null;

    return {
      status: "valid" as const,
      inviterName: inviter?.name ?? "",
      avatarPreset: inviter?.avatarPreset ?? null,
      avatarUrl,
      expiresAt: invite.expiresAt ?? null,
    };
  },
});

export const accept = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const joinerId = await getAuthUserId(ctx);
    if (!joinerId) throw new Error("Not authenticated");

    const invite = await ctx.db
      .query("invites")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();

    if (!invite) throw new Error("Invite not found");
    if (invite.usedBy) throw new Error("Invite already accepted");
    if (invite.expiresAt && invite.expiresAt < Date.now())
      throw new Error("Invite expired");
    if (invite.createdBy === joinerId) throw new Error("Cannot accept your own invite");

    const joinerMembership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", joinerId))
      .first();
    if (!joinerMembership) throw new Error("No space found");

    const joinerSpace = await ctx.db.get(joinerMembership.spaceId);
    if (joinerSpace?.status === "paired") throw new Error("Already in a paired space");

    const joinerSpaceId = joinerMembership.spaceId;
    const inviterSpaceId = invite.spaceId;

    // Re-parent all space-scoped data onto the inviter's space
    const memories = await ctx.db
      .query("memories")
      .withIndex("by_space", (q) => q.eq("spaceId", joinerSpaceId))
      .take(200);
    for (const doc of memories) await ctx.db.patch(doc._id, { spaceId: inviterSpaceId });

    const todos = await ctx.db
      .query("todos")
      .withIndex("by_space", (q) => q.eq("spaceId", joinerSpaceId))
      .take(200);
    for (const doc of todos) await ctx.db.patch(doc._id, { spaceId: inviterSpaceId });

    const answers = await ctx.db
      .query("answers")
      .withIndex("by_space", (q) => q.eq("spaceId", joinerSpaceId))
      .take(200);
    for (const doc of answers) await ctx.db.patch(doc._id, { spaceId: inviterSpaceId });

    const mediaAssets = await ctx.db
      .query("mediaAssets")
      .withIndex("by_space", (q) => q.eq("spaceId", joinerSpaceId))
      .take(200);
    for (const doc of mediaAssets) await ctx.db.patch(doc._id, { spaceId: inviterSpaceId });

    const dailyQs = await ctx.db
      .query("dailyQuestions")
      .withIndex("by_space_date", (q) => q.eq("spaceId", joinerSpaceId))
      .take(200);
    for (const doc of dailyQs) await ctx.db.patch(doc._id, { spaceId: inviterSpaceId });

    // Dissolve joiner's solo space
    await ctx.db.delete(joinerMembership._id);
    await ctx.db.delete(joinerSpaceId);

    // Join inviter's space
    await ctx.db.insert("memberships", {
      spaceId: inviterSpaceId,
      userId: joinerId,
      joinedAt: Date.now(),
    });

    // Flip space to paired + mark invite used
    await ctx.db.patch(inviterSpaceId, { status: "paired" });
    await ctx.db.patch(invite._id, { usedBy: joinerId, usedAt: Date.now() });
  },
});

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

function mintCode(): string {
  return Array.from({ length: 6 }, () =>
    CROCKFORD[Math.floor(Math.random() * 32)]
  ).join("");
}

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!membership) return null;
    const invites = await ctx.db
      .query("invites")
      .withIndex("by_space", (q) => q.eq("spaceId", membership.spaceId))
      .take(20);
    const now = Date.now();
    return invites.find((inv) => !inv.usedBy && inv.expiresAt && inv.expiresAt > now) ?? null;
  },
});

// Idempotent — returns existing active invite or mints a fresh one.
export const create = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!membership) throw new Error("No space found");

    const now = Date.now();
    const existing = await ctx.db
      .query("invites")
      .withIndex("by_space", (q) => q.eq("spaceId", membership.spaceId))
      .take(20);
    const active = existing.find(
      (inv) => !inv.usedBy && inv.expiresAt && inv.expiresAt > now
    );
    if (active) return { code: active.code, expiresAt: active.expiresAt! };

    const code = mintCode();
    const expiresAt = now + TTL_MS;
    await ctx.db.insert("invites", {
      spaceId: membership.spaceId,
      code,
      createdBy: userId,
      expiresAt,
    });
    return { code, expiresAt };
  },
});

export const revoke = mutation({
  args: { inviteId: v.id("invites") },
  handler: async (ctx, { inviteId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const invite = await ctx.db.get(inviteId);
    if (!invite) return;
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!membership || invite.spaceId !== membership.spaceId)
      throw new Error("Forbidden");
    await ctx.db.delete(inviteId);
  },
});
