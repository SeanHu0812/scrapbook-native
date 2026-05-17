"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Scrypt } from "lucia";

// Run once to create a test account:
//   npx convex run seed:createTestAccount
export const createTestAccount = internalAction({
  args: {},
  handler: async (ctx) => {
    const email = "test@scrapbook.app";
    const password = "testpassword123";
    const secret = await new Scrypt().hash(password);
    await ctx.runMutation(internal.seedMutation.insertTestUser, { email, secret });
    return { email, password };
  },
});
