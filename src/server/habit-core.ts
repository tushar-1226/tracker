import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { type Habit, habitLogs, habits } from "@/db/schema";
import { dayCompletion, isDone } from "@/lib/habits/stats";
import { XP, grantXp, revokeXp } from "@/server/xp";

/** Sets a habit's value for a day (0 clears it) and keeps per-habit and perfect-day XP in sync. */
export async function applyHabitValue(userId: string, habit: Habit, date: string, value: number) {
  const habitId = habit.id;
  await db.transaction(async (tx) => {
    if (value === 0) {
      await tx.delete(habitLogs).where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, date)));
    } else {
      await tx
        .insert(habitLogs)
        .values({ habitId, userId, date, value })
        .onConflictDoUpdate({ target: [habitLogs.habitId, habitLogs.date], set: { value } });
    }

    // Quit habits are "done" by not logging, so they never award per-check XP.
    if (habit.type !== "quit") {
      const key = `${habitId}:${date}`;
      if (isDone(habit, value)) await grantXp(tx, userId, "habit", key, XP.habit);
      else await revokeXp(tx, userId, "habit", key);
    }

    // Perfect-day bonus when every habit due that day is complete.
    const active = await tx
      .select()
      .from(habits)
      .where(and(eq(habits.userId, userId), isNull(habits.archivedAt)));
    const dayLogs = await tx
      .select({ habitId: habitLogs.habitId, date: habitLogs.date, value: habitLogs.value })
      .from(habitLogs)
      .where(and(eq(habitLogs.userId, userId), eq(habitLogs.date, date)));
    const items = active.map((h) => ({
      habit: h,
      logs: new Map(dayLogs.filter((l) => l.habitId === h.id).map((l) => [l.date, l.value])),
    }));
    const { due, done } = dayCompletion(items, date);
    if (due > 0 && done === due) await grantXp(tx, userId, "habit-day", date, XP.habitDay);
    else await revokeXp(tx, userId, "habit-day", date);
  });
}
