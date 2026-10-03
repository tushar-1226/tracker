import "server-only";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { habitLogs, habits, journalEntries, readingLogs, reminders, studySessions, users, workouts } from "@/db/schema";
import { isDone, isDue as habitIsDue } from "@/lib/habits/stats";
import { isDue, localClock } from "@/lib/reminders";
import { sendToUser } from "./push";

/**
 * Sends every reminder that is due right now. Safe to call as often as you like:
 * each reminder fires at most once per local day, and is skipped when the thing
 * it nudges about is already done.
 */
export async function runReminders(now = new Date()) {
  const rows = await db
    .select({ r: reminders, settings: users.settings })
    .from(reminders)
    .innerJoin(users, eq(users.id, reminders.userId))
    .where(eq(reminders.enabled, true));

  let sent = 0;
  for (const { r, settings } of rows) {
    const clock = localClock(now, settings.timeZone || "UTC");
    if (!isDue(r, clock)) continue;

    const skip = await alreadyDone(r.userId, r.kind, r.refId, clock.day);
    // Mark as handled either way so a skipped reminder isn't re-checked all evening.
    await db.update(reminders).set({ lastSentDate: clock.day }).where(eq(reminders.id, r.id));
    if (skip) continue;

    sent += await sendToUser(r.userId, {
      title: r.title,
      body: r.body ?? undefined,
      url: r.url,
      tag: `reminder-${r.id}`,
      habitId: r.kind === "habit" && r.refId ? r.refId : undefined,
    });
  }
  return sent;
}

async function alreadyDone(userId: string, kind: string, refId: string | null, day: string) {
  const exists = async (q: Promise<{ n: number }[]>) => ((await q)[0]?.n ?? 0) > 0;
  const n = sql<number>`count(*)`;
  switch (kind) {
    case "habit": {
      if (!refId) return true;
      const habit = await db.query.habits.findFirst({ where: and(eq(habits.id, refId), eq(habits.userId, userId), isNull(habits.archivedAt)) });
      if (!habit || habit.type === "quit") return true; // nothing to nudge (or deleted)
      if (!habitIsDue(habit, day) && habit.frequency.kind !== "weekly") return true;
      const log = await db.query.habitLogs.findFirst({ where: and(eq(habitLogs.habitId, refId), eq(habitLogs.date, day)) });
      return isDone(habit, log?.value);
    }
    case "journal":
      return exists(db.select({ n }).from(journalEntries).where(and(eq(journalEntries.userId, userId), eq(journalEntries.date, day))));
    case "workout":
      return exists(db.select({ n }).from(workouts).where(and(eq(workouts.userId, userId), eq(workouts.date, day), isNotNull(workouts.finishedAt))));
    case "study":
      return exists(db.select({ n }).from(studySessions).where(and(eq(studySessions.userId, userId), eq(studySessions.date, day))));
    case "reading":
      return exists(db.select({ n }).from(readingLogs).where(and(eq(readingLogs.userId, userId), eq(readingLogs.date, day))));
    default:
      return false;
  }
}
