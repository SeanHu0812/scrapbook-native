"use node";
import { action } from "./_generated/server";
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
