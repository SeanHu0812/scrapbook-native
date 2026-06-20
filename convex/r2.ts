"use node";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_PUBLIC_URL = "https://pub-3f386b24ab674bfcae61483e34189f04.r2.dev";

function makeClient() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

// ── Public action: generate presigned upload URL for new photos ───────────────

export const generateUploadUrl = action({
  args: { mimeType: v.string() },
  handler: async (ctx, { mimeType }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
    const key = `photos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const uploadUrl = await getSignedUrl(
      makeClient(),
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        ContentType: mimeType,
      }),
      { expiresIn: 300 },
    );

    return { uploadUrl, r2Url: `${R2_PUBLIC_URL}/${key}` };
  },
});

// ── One-time migration action ─────────────────────────────────────────────────
// Run from the Convex dashboard: Functions → r2:migrateToR2 → Run

export const migrateToR2 = internalAction({
  args: {},
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  handler: async (ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assets: any[] = await ctx.runQuery(internal.r2Helpers.listLegacyAssets);
    console.log(`Found ${assets.length} assets to migrate`);

    let migrated = 0;
    let failed = 0;

    for (const asset of assets) {
      if (!asset.storageId) continue;
      try {
        const url = await ctx.storage.getUrl(asset.storageId);
        if (!url) {
          console.warn(`No URL for asset ${asset._id}, skipping`);
          failed++;
          continue;
        }

        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`Fetch failed for asset ${asset._id}: ${response.status}`);
          failed++;
          continue;
        }

        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get("content-type") ?? "image/jpeg";
        const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
        const key = `photos/migrated-${asset._id}-${Date.now()}.${ext}`;

        const uploadUrl = await getSignedUrl(
          makeClient(),
          new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: key,
            ContentType: contentType,
          }),
          { expiresIn: 300 },
        );

        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          body: buffer,
          headers: { "Content-Type": contentType },
        });

        if (!uploadRes.ok) {
          console.warn(`R2 upload failed for asset ${asset._id}: ${uploadRes.status}`);
          failed++;
          continue;
        }

        await ctx.runMutation(internal.r2Helpers.markMigrated, {
          assetId: asset._id,
          r2Url: `${R2_PUBLIC_URL}/${key}`,
          storageId: asset.storageId,
        });

        console.log(`Migrated asset ${asset._id} → ${key}`);
        migrated++;
      } catch (e) {
        console.error(`Error migrating asset ${asset._id}:`, e);
        failed++;
      }
    }

    return { total: assets.length, migrated, failed };
  },
});
