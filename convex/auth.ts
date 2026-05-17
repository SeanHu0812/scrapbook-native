import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import Apple from "@auth/core/providers/apple";
import Google from "@auth/core/providers/google";
import type { MutationCtx } from "./_generated/server";

// To swap providers (e.g. migrate to Clerk): replace the providers array
// and the createOrUpdateUser callback with Clerk's Convex integration.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, Apple, Google],
  callbacks: {
    async createOrUpdateUser(ctx, { existingUserId, profile }) {
      if (existingUserId) {
        // Pre-fill name from OAuth profile if user hasn't set one yet
        const existing = await ctx.db.get(existingUserId);
        if (existing && !existing.name && profile.name) {
          await ctx.db.patch(existingUserId, { name: profile.name });
        }
        return existingUserId;
      }
      // Email-based deduplication: link to existing account if same email exists
      if (profile.email) {
        const db = (ctx as unknown as MutationCtx).db;
        const byEmail = await db
          .query("users")
          .withIndex("by_email", (q) => q.eq("email", profile.email!))
          .first();
        if (byEmail) return byEmail._id;
      }
      return ctx.db.insert("users", {
        name: profile.name ?? "",
        email: profile.email ?? "",
      });
    },
  },
});
