import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const insertTestUser = internalMutation({
  args: { email: v.string(), secret: v.string() },
  handler: async (ctx, { email, secret }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    const userId =
      existing?._id ??
      (await ctx.db.insert("users", { name: "Test User", email }));

    const existingAccount = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", email)
      )
      .first();

    if (existingAccount) {
      await ctx.db.patch(existingAccount._id, { secret, userId });
    } else {
      await ctx.db.insert("authAccounts", {
        provider: "password",
        providerAccountId: email,
        secret,
        userId,
        emailVerified: email,
      });
    }

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!membership) {
      const spaceId = await ctx.db.insert("spaces", {
        name: "our little space",
        createdBy: userId,
        status: "solo",
      });
      await ctx.db.insert("memberships", { spaceId, userId, joinedAt: Date.now() });
    }

    console.log(`Test account ready: ${email}`);
  },
});
