import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

function requireSeedEnv() {
  if (process.env.CONVEX_ALLOW_SEED !== "1") {
    throw new Error(
      "Dev seed is disabled. Set CONVEX_ALLOW_SEED=1 in your Convex environment to enable it."
    );
  }
}

/** Wipes all space-scoped data for the caller's space. Env-gated. */
export const clear = mutation({
  args: {},
  handler: async (ctx) => {
    requireSeedEnv();
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!membership) throw new Error("No space found");
    const { spaceId } = membership;

    for (const table of ["memories", "todos", "mediaAssets"] as const) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_space", (q: any) => q.eq("spaceId", spaceId))
        .collect();
      for (const row of rows) {
        // Delete comments + reactions hanging off this memory before deleting it
        if (table === "memories") {
          const memId = row._id as any;
          const cs = await ctx.db.query("comments").withIndex("by_memory", (q: any) => q.eq("memoryId", memId)).collect();
          for (const c of cs) await ctx.db.delete(c._id);
          const rs = await ctx.db.query("reactions").withIndex("by_memory", (q: any) => q.eq("memoryId", memId)).collect();
          for (const r of rs) await ctx.db.delete(r._id);
        }
        await ctx.db.delete(row._id);
      }
    }

    const dqs = await ctx.db.query("dailyQuestions").filter((q) => q.eq(q.field("spaceId"), spaceId)).collect();
    for (const dq of dqs) await ctx.db.delete(dq._id);

    const answers = await ctx.db
      .query("answers")
      .withIndex("by_space", (q) => q.eq("spaceId", spaceId))
      .collect();
    for (const a of answers) await ctx.db.delete(a._id);
  },
});

/** Seeds the caller's space with reference data from lib/data.ts. Idempotent (clears first). */
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    requireSeedEnv();
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!membership) throw new Error("No space found");
    const { spaceId } = membership;

    // -- Clear existing seed data --
    for (const table of ["memories", "todos"] as const) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_space", (q: any) => q.eq("spaceId", spaceId))
        .collect();
      for (const row of rows) {
        if (table === "memories") {
          const memId = row._id as any;
          const cs = await ctx.db.query("comments").withIndex("by_memory", (q: any) => q.eq("memoryId", memId)).collect();
          for (const c of cs) await ctx.db.delete(c._id);
          const rs = await ctx.db.query("reactions").withIndex("by_memory", (q: any) => q.eq("memoryId", memId)).collect();
          for (const r of rs) await ctx.db.delete(r._id);
        }
        await ctx.db.delete(row._id);
      }
    }
    const dqs = await ctx.db.query("dailyQuestions").filter((q) => q.eq(q.field("spaceId"), spaceId)).collect();
    for (const dq of dqs) await ctx.db.delete(dq._id);
    const oldAnswers = await ctx.db.query("answers").withIndex("by_space", (q) => q.eq("spaceId", spaceId)).collect();
    for (const a of oldAnswers) await ctx.db.delete(a._id);

    // -- Memories --
    const memorySeeds = [
      {
        date: "2024-05-18", weekday: "Saturday", weather: "sunny" as const,
        title: "A perfect little day",
        caption: "little coffee date in the morning ☕",
        body: "It was such a cozy day! We went to our favorite cafe, took a walk by the river and watched the sunset together. ❤",
        scene: "couple", location: "Riverside Cafe", stickers: ["🌷", "🌼", "💗"],
      },
      {
        date: "2024-05-16", weekday: "Thursday", weather: "sunny" as const,
        title: "Long walk, longer talks",
        caption: "sunset by the bridge",
        body: "We picked up flowers on the way home and watched the planes blink across the sky.",
        scene: "sunset", location: "East Bridge", stickers: ["🌸", "✈️"],
      },
      {
        date: "2024-05-06", weekday: "Monday", weather: "cloudy" as const,
        title: "Our quiet Monday",
        caption: "rainy reading day",
        body: "Stayed in, made banana bread, read out loud. The good kind of slow.",
        scene: "flowers", location: "Home", stickers: ["📖", "🍞"],
      },
      {
        date: "2024-04-28", weekday: "Sunday", weather: "sunny" as const,
        title: "Down by the river",
        caption: "skipped stones for an hour",
        body: "Found a quiet bend in the river. Jake skipped a stone seven times. I'm still impressed.",
        scene: "river", location: "Greenfield Park", stickers: ["🪨", "💦"],
      },
    ];

    const memoryIds: typeof memorySeeds[0] extends infer T ? any[] : never = [];
    for (const m of memorySeeds) {
      const id = await ctx.db.insert("memories", {
        ...m,
        spaceId,
        authorId: userId,
      });
      memoryIds.push(id);
    }

    // -- Reactions (hearts on first two memories) --
    for (const memId of memoryIds.slice(0, 2)) {
      await ctx.db.insert("reactions", { memoryId: memId, userId, emoji: "heart" });
    }

    // -- Comments on first memory --
    const commentBodies = [
      "This was such a perfect day ☁️",
      "Can we do this every weekend?",
      "The cafe was 10/10 🌸",
      "I love us 💗",
    ];
    for (const body of commentBodies.slice(0, 3)) {
      await ctx.db.insert("comments", {
        memoryId: memoryIds[0],
        authorId: userId,
        body,
        createdAt: Date.now() - Math.random() * 86_400_000,
      });
    }
    await ctx.db.insert("comments", {
      memoryId: memoryIds[3],
      authorId: userId,
      body: "Seven skips 🪨 legendary",
      createdAt: Date.now() - 2 * 86_400_000,
    });

    // -- Todos --
    const todoSeeds = [
      { title: "Pick up flowers for friday", category: "errand" as const, due: "Fri", notes: "the peach ones from the corner shop", done: false },
      { title: "Book sunset picnic spot", category: "date" as const, due: "Sat", done: false },
      { title: "Plan summer trip ideas", category: "trip" as const, due: "May 25", notes: "3 places each, then vote 💌", done: false },
      { title: "Finish reading 'A Little Life' chapter", category: "read" as const, done: false },
      { title: "Water the plants 🌿", category: "home" as const, due: "Today", done: true },
      { title: "Movie night — bring popcorn", category: "date" as const, done: true },
    ];
    for (const t of todoSeeds) {
      await ctx.db.insert("todos", {
        ...t,
        spaceId,
        createdBy: userId,
        createdAt: Date.now(),
      });
    }

    // -- Daily questions (5 past days) --
    const questionSeeds = [
      { prompt: "What made you smile today?", emoji: "🌼", tint: "yellow" as const, myAnswer: "Seeing you laugh at your own joke 😂", partnerAnswer: "The coffee was perfect this morning ☕" },
      { prompt: "What's a small thing you'd love to do this weekend?", emoji: "🌿", tint: "green" as const, myAnswer: "A long walk by the water", partnerAnswer: "Sleep in and have pancakes 🥞" },
      { prompt: "What's your favourite memory of us from the last month?", emoji: "🌸", tint: "pink" as const, myAnswer: "The riverside evening, definitely", partnerAnswer: "Banana bread Monday ❤️" },
      { prompt: "Describe our relationship in exactly three words.", emoji: "💬", tint: "blue" as const, myAnswer: "Warm, cozy, home.", partnerAnswer: "You, me, forever." },
      { prompt: "What's one thing you're grateful for about us today?", emoji: "🙏", tint: "green" as const, myAnswer: "That we always find time for each other", partnerAnswer: "How you always know what I need" },
    ];

    // Get partner if paired
    const allMemberships = await ctx.db
      .query("memberships")
      .withIndex("by_space", (q) => q.eq("spaceId", spaceId))
      .collect();
    const partnerMembership = allMemberships.find((m) => m.userId !== userId);

    for (let i = 0; i < questionSeeds.length; i++) {
      const qs = questionSeeds[i];
      const date = new Date(Date.now() - (i + 1) * 86_400_000).toISOString().slice(0, 10);
      const qId = await ctx.db.insert("dailyQuestions", {
        spaceId,
        prompt: qs.prompt,
        emoji: qs.emoji,
        tint: qs.tint,
        date,
      });
      await ctx.db.insert("answers", {
        questionId: qId,
        userId,
        spaceId,
        body: qs.myAnswer,
        createdAt: Date.now() - (i + 1) * 86_400_000,
      });
      if (partnerMembership) {
        await ctx.db.insert("answers", {
          questionId: qId,
          userId: partnerMembership.userId,
          spaceId,
          body: qs.partnerAnswer,
          createdAt: Date.now() - (i + 1) * 86_400_000 + 3600_000,
        });
      }
    }
  },
});
