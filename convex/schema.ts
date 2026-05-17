/*
 * ADR — schema design decisions
 *
 * 1. Avatar storage: users carry avatarPreset (string key) XOR avatarStorageId
 *    (Convex storage id). Only one should be set; the other is undefined.
 *    Preset covers the gallery of built-in illustrations; custom upload
 *    sets storageId and clears the preset string.
 *
 * 2. No-role memberships: both seats in a space are equal. There is no
 *    "owner" / "partner" distinction in the memberships table. createdBy on
 *    spaces records who initiated, but that confers no special permissions.
 *
 * 3. Soft-merge invite accept: when a user accepts an invite, a membership
 *    row is inserted and the invite's usedBy / usedAt fields are populated.
 *    The invite record is kept (not deleted) so the share history is auditable.
 *
 * 4. Free-text `due` on todos: MVP stores due as a plain string ("Today",
 *    "Sat", "May 22"). No date parsing or calendar binding until a later
 *    milestone explicitly requires it.
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.string(),
    email: v.string(),
    avatarPreset: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    nickname: v.optional(v.string()),
    birthday: v.optional(v.string()),
  }).index("by_email", ["email"]),

  spaces: defineTable({
    name: v.string(),
    createdBy: v.id("users"),
    status: v.union(v.literal("solo"), v.literal("paired")),
    startDate: v.optional(v.string()),
  }),

  memberships: defineTable({
    spaceId: v.id("spaces"),
    userId: v.id("users"),
    joinedAt: v.number(),
  })
    .index("by_space", ["spaceId"])
    .index("by_user", ["userId"]),

  invites: defineTable({
    spaceId: v.id("spaces"),
    code: v.string(),
    createdBy: v.id("users"),
    usedBy: v.optional(v.id("users")),
    usedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_space", ["spaceId"]),

  memories: defineTable({
    spaceId: v.id("spaces"),
    authorId: v.id("users"),
    title: v.string(),
    caption: v.string(),
    body: v.string(),
    date: v.string(),
    weekday: v.string(),
    weather: v.optional(v.union(v.literal("sunny"), v.literal("cloudy"), v.literal("rainy"))),
    location: v.optional(v.string()),
    stickers: v.optional(v.array(v.string())),
    scene: v.string(),
    audioStorageId: v.optional(v.id("_storage")),
  })
    .index("by_space", ["spaceId"])
    .index("by_space_date", ["spaceId", "date"]),

  comments: defineTable({
    memoryId: v.id("memories"),
    authorId: v.id("users"),
    body: v.string(),
    createdAt: v.number(),
    photoStorageId: v.optional(v.id("_storage")),
  }).index("by_memory", ["memoryId"]),

  reactions: defineTable({
    memoryId: v.id("memories"),
    userId: v.id("users"),
    emoji: v.string(),
    photoStorageId: v.optional(v.id("_storage")),
  })
    .index("by_memory", ["memoryId"])
    .index("by_memory_user", ["memoryId", "userId"]),

  todos: defineTable({
    spaceId: v.id("spaces"),
    title: v.string(),
    notes: v.optional(v.string()),
    assigneeId: v.optional(v.id("users")),
    due: v.optional(v.string()),
    category: v.union(
      v.literal("errand"),
      v.literal("date"),
      v.literal("trip"),
      v.literal("read"),
      v.literal("home"),
    ),
    done: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_space", ["spaceId"])
    .index("by_space_done", ["spaceId", "done"]),

  dailyQuestions: defineTable({
    spaceId: v.id("spaces"),
    prompt: v.string(),
    emoji: v.string(),
    tint: v.union(
      v.literal("pink"),
      v.literal("yellow"),
      v.literal("blue"),
      v.literal("green"),
    ),
    date: v.string(),
  }).index("by_space_date", ["spaceId", "date"]),

  answers: defineTable({
    questionId: v.id("dailyQuestions"),
    userId: v.id("users"),
    spaceId: v.id("spaces"),
    body: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_space", ["spaceId"])
    .index("by_question", ["questionId"]),

  mediaAssets: defineTable({
    storageId: v.id("_storage"),
    uploadedBy: v.id("users"),
    spaceId: v.id("spaces"),
    kind: v.union(v.literal("photo"), v.literal("audio"), v.literal("avatar")),
    memoryId: v.optional(v.id("memories")),
  })
    .index("by_space", ["spaceId"])
    .index("by_memory", ["memoryId"]),

  spaceFavorites: defineTable({
    spaceId: v.id("spaces"),
    memoryId: v.optional(v.id("memories")),
    photoStorageIds: v.optional(v.array(v.id("_storage"))),
    songName: v.optional(v.string()),
    songArtist: v.optional(v.string()),
    spotifyTrackId: v.optional(v.string()),
    places: v.optional(v.string()),
    movie: v.optional(v.string()),
    activities: v.optional(v.string()),
  }).index("by_space", ["spaceId"]),
});
