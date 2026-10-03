"use server";

import { and, eq, inArray, max } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { achievementsUnlocked, goalMilestones, goals } from "@/db/schema";
import { verifySession } from "@/lib/auth/dal";
import { isDay } from "@/lib/dates";
import { revokeXp } from "@/server/xp";

export async function markAchievementsSeen(ids: string[]) {
  const { userId } = await verifySession();
  const clean = z.array(z.uuid()).max(100).parse(ids);
  if (!clean.length) return;
  await db
    .update(achievementsUnlocked)
    .set({ seenAt: new Date() })
    .where(and(eq(achievementsUnlocked.userId, userId), inArray(achievementsUnlocked.id, clean)));
}

const metricSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("manual") }),
  z.object({ type: z.literal("habit_streak"), habitId: z.string().min(1) }),
  z.object({ type: z.literal("exercise_1rm"), exerciseId: z.string().min(1) }),
  z.object({ type: z.literal("body_weight") }),
  z.object({ type: z.literal("study_hours"), skillId: z.string().min(1) }),
  z.object({ type: z.literal("books_year") }),
  z.object({ type: z.literal("savings_goal"), goalId: z.string().min(1) }),
  z.object({ type: z.literal("net_worth") }),
]);

const goalSchema = z.object({
  title: z.string().trim().min(1, { error: "Name your goal" }).max(100),
  metric: metricSchema,
  target: z.number().positive({ error: "Set a target" }).max(1e12).nullable(),
  baseline: z.number().nullable(),
  deadline: z.string().refine(isDay).nullable(),
  milestones: z.array(z.string().trim().min(1).max(100)).max(20),
});

export async function createGoal(input: z.input<typeof goalSchema>) {
  const { userId } = await verifySession();
  const data = goalSchema.parse(input);
  if (data.metric.type !== "manual" && data.target === null) throw new Error("Set a target");
  await db.transaction(async (tx) => {
    const [g] = await tx
      .insert(goals)
      .values({ userId, title: data.title, metric: data.metric, target: data.target ?? data.milestones.length, baseline: data.baseline, deadline: data.deadline })
      .returning({ id: goals.id });
    if (data.milestones.length) {
      await tx.insert(goalMilestones).values(data.milestones.map((title, position) => ({ userId, goalId: g.id, title, position })));
    }
  });
  refresh();
}

export async function toggleMilestone(id: string, done: boolean) {
  const { userId } = await verifySession();
  await db
    .update(goalMilestones)
    .set({ doneAt: done ? new Date() : null })
    .where(and(eq(goalMilestones.id, id), eq(goalMilestones.userId, userId)));
  refresh();
}

export async function addMilestone(goalId: string, title: string) {
  const { userId } = await verifySession();
  const goal = await db.query.goals.findFirst({ where: and(eq(goals.id, goalId), eq(goals.userId, userId)) });
  if (!goal) throw new Error("Goal not found");
  const [{ last }] = await db.select({ last: max(goalMilestones.position) }).from(goalMilestones).where(eq(goalMilestones.goalId, goalId));
  await db.insert(goalMilestones).values({ userId, goalId, title: z.string().trim().min(1).max(100).parse(title), position: (last ?? -1) + 1 });
  refresh();
}

export async function archiveGoal(id: string) {
  const { userId } = await verifySession();
  await db.update(goals).set({ archivedAt: new Date() }).where(and(eq(goals.id, id), eq(goals.userId, userId)));
  refresh();
}

export async function deleteGoal(id: string) {
  const { userId } = await verifySession();
  await db.transaction(async (tx) => {
    await revokeXp(tx, userId, "goal", id);
    await tx.delete(goalMilestones).where(and(eq(goalMilestones.goalId, id), eq(goalMilestones.userId, userId)));
    await tx.delete(goals).where(and(eq(goals.id, id), eq(goals.userId, userId)));
  });
  refresh();
}
