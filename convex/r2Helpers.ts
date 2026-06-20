import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const listLegacyAssets = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("mediaAssets")
      .filter((q) =>
        q.and(
          q.neq(q.field("storageId"), undefined),
          q.eq(q.field("r2Url"), undefined),
        ),
      )
      .collect();
  },
});

export const markMigrated = internalMutation({
  args: {
    assetId: v.id("mediaAssets"),
    r2Url: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { assetId, r2Url, storageId }) => {
    await ctx.db.patch(assetId, { r2Url, storageId: undefined });
    await ctx.storage.delete(storageId);
  },
});
