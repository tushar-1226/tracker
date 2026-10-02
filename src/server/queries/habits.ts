import "server-only";
import { cache } from "react";
import { and, asc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { type Habit, habitLogs, habits } from "@/db/schema";
import type { HabitView } from "@/lib/habits/view";

async function withLogs(rows: Habit[]): Promise<HabitView[]> {
  if (!rows.length) return [];
  const logs = await db
    .select({ habitId: habitLogs.habitId, date: habitLogs.date, value: habitLogs.value })
    .from(habitLogs)
    .where(inArray(habitLogs.habitId, rows.map((h) => h.id)));

  const byHabit = new Map<string, Record<string, number>>();
  for (const l of logs) {
    const rec = byHabit.get(l.habitId) ?? {};
    rec[l.date] = l.value;
    byHabit.set(l.habitId, rec);
  }
  return rows.map((h) => ({
    id: h.id,
    name: h.name,
    icon: h.icon,
    type: h.type,
    target: h.target,
    unit: h.unit,
    frequency: h.frequency,
    startDate: h.startDate,
    logs: byHabit.get(h.id) ?? {},
  }));
}

export async function listHabits(userId: string) {
  const rows = await db
    .select()
    .from(habits)
    .where(and(eq(habits.userId, userId), isNull(habits.archivedAt)))
    .orderBy(asc(habits.position), asc(habits.createdAt));
  return withLogs(rows);
}

export async function listArchivedHabits(userId: string) {
  return db
    .select({ id: habits.id, name: habits.name, icon: habits.icon })
    .from(habits)
    .where(and(eq(habits.userId, userId), isNotNull(habits.archivedAt)))
    .orderBy(asc(habits.name));
}

export const getHabit = cache(async (userId: string, id: string) => {
  const row = await db.query.habits.findFirst({
    where: and(eq(habits.id, id), eq(habits.userId, userId)),
  });
  if (!row) return null;
  const [view] = await withLogs([row]);
  return { ...view, archived: row.archivedAt !== null };
});
