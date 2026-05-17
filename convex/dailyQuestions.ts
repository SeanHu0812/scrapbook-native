import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { QUESTION_POOL, pickForDay } from "./questionPool";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function getSpaceMembership(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  if (!membership) return null;
  return { userId, spaceId: membership.spaceId };
}

/** Idempotently creates today's 3 question rows for the space. Call on page mount. */
export const ensureTriad = mutation({
  args: {},
  handler: async (ctx) => {
    const m = await getSpaceMembership(ctx);
    if (!m) return;
    const { spaceId } = m;
    const date = todayIso();

    const existing = await ctx.db
      .query("dailyQuestions")
      .withIndex("by_space_date", (q: any) => q.eq("spaceId", spaceId).eq("date", date))
      .collect();

    if (existing.length >= 3) return;

    const indices = pickForDay(spaceId, date);
    for (const idx of indices) {
      const q = QUESTION_POOL[idx];
      await ctx.db.insert("dailyQuestions", {
        spaceId,
        prompt: q.prompt,
        emoji: q.emoji,
        tint: q.tint,
        date,
      });
    }
  },
});

/** Returns today's 3 questions with the caller's answer and partner-answer status. */
export const todayTriad = query({
  args: {},
  handler: async (ctx) => {
    const m = await getSpaceMembership(ctx);
    if (!m) return [];
    const { userId, spaceId } = m;
    const date = todayIso();

    const questions = await ctx.db
      .query("dailyQuestions")
      .withIndex("by_space_date", (q: any) => q.eq("spaceId", spaceId).eq("date", date))
      .collect();

    return Promise.all(
      questions.map(async (q) => {
        const myAnswer = await ctx.db
          .query("answers")
          .withIndex("by_question", (aq: any) => aq.eq("questionId", q._id))
          .filter((aq: any) => aq.eq(aq.field("userId"), userId))
          .first();

        const partnerAnswer = myAnswer
          ? await ctx.db
              .query("answers")
              .withIndex("by_question", (aq: any) => aq.eq("questionId", q._id))
              .filter((aq: any) => aq.neq(aq.field("userId"), userId))
              .first()
          : null;

        return {
          ...q,
          myAnswer: myAnswer?.body ?? null,
          partnerAnswer: myAnswer
            ? partnerAnswer?.body ?? null
            : "locked" as const,
        };
      })
    );
  },
});

/** Upsert the caller's answer for a question. */
export const answer = mutation({
  args: { questionId: v.id("dailyQuestions"), body: v.string() },
  handler: async (ctx, { questionId, body }) => {
    const m = await getSpaceMembership(ctx);
    if (!m) throw new Error("Not authenticated");
    const { userId, spaceId } = m;

    const existing = await ctx.db
      .query("answers")
      .withIndex("by_question", (q) => q.eq("questionId", questionId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { body });
    } else {
      await ctx.db.insert("answers", {
        questionId,
        userId,
        spaceId,
        body,
        createdAt: Date.now(),
      });
    }
  },
});

/** Returns past answered question groups (days where the caller has at least one answer). */
export const history = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 30 }) => {
    const m = await getSpaceMembership(ctx);
    if (!m) return [];
    const { userId, spaceId } = m;

    const myAnswers = await ctx.db
      .query("answers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit * 3);

    const results = await Promise.all(
      myAnswers.map(async (a) => {
        const question = await ctx.db.get(a.questionId);
        if (!question || question.spaceId !== spaceId) return null;
        const partnerAnswer = await ctx.db
          .query("answers")
          .withIndex("by_question", (q) => q.eq("questionId", a.questionId))
          .filter((q) => q.neq(q.field("userId"), userId))
          .first();
        return {
          date: question.date,
          prompt: question.prompt,
          emoji: question.emoji,
          tint: question.tint,
          myAnswer: a.body,
          partnerAnswer: partnerAnswer?.body ?? null,
        };
      })
    );

    return results.filter(Boolean).slice(0, limit);
  },
});
