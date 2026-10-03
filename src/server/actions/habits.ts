"use server";

import { and, eq, max } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { habitLogs, habits } from "@/db/schema";
import { verifySession } from "@/lib/auth/dal";
import { addDays, isDay } from "@/lib/dates";
import { type HabitFormState, habitFormInput, habitSchema } from "@/lib/validators/habits";
import { getToday } from "@/server/today";
import { revokeXpByPrefix } from "@/server/xp";
import { applyHabitValue } from "@/server/habit-core";

async function ownHabit(userId: string, id: string) {
  const habit = await db.query.habits.findFirst({
    where: and(eq(habits.id, id), eq(habits.userId, userId)),
  });
  if (!habit) throw new Error("Habit not found");
  return habit;
}

export async function saveHabit(_state: HabitFormState, formData: FormData): Promise<HabitFormState> {
  const { userId } = await verifySession();
  const parsed = habitSchema.safeParse(habitFormInput(formData));
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return { errors: fieldErrors as Record<string, string[]> };
  }

  const id = formData.get("id");
  if (typeof id === "string" && id) {
    await ownHabit(userId, id);
    await db.update(habits).set(parsed.data).where(eq(habits.id, id));
  } else {
    const [{ last }] = await db
      .select({ last: max(habits.position) })
      .from(habits)
      .where(eq(habits.userId, userId));
    await db.insert(habits).values({
      ...parsed.data,
      userId,
      startDate: await getToday(),
      position: (last ?? -1) + 1,
    });
  }

  refresh();
  return { ok: true };
}

/** Sets a habit's value for a day (0 clears it) and keeps XP in sync. */
export async function setHabitValue(habitId: string, date: string, value: number) {
  const { userId } = await verifySession();
  const today = await getToday();
  if (!isDay(date) || date > addDays(today, 1)) throw new Error("Invalid date");
  if (!Number.isFinite(value) || value < 0 || value > 100_000) throw new Error("Invalid value");

  const habit = await ownHabit(userId, habitId);

  await applyHabitValue(userId, habit, date, value);
  refresh();
}

export async function reorderHabits(ids: string[]) {
  const { userId } = await verifySession();
  const parsed = z.array(z.uuid()).max(500).parse(ids);
  await db.transaction(async (tx) => {
    for (const [position, id] of parsed.entries()) {
      await tx
        .update(habits)
        .set({ position })
        .where(and(eq(habits.id, id), eq(habits.userId, userId)));
    }
  });
  refresh();
}

export async function setHabitArchived(id: string, archived: boolean) {
  const { userId } = await verifySession();
  await ownHabit(userId, id);
  await db
    .update(habits)
    .set({ archivedAt: archived ? new Date() : null })
    .where(eq(habits.id, id));
  refresh();
}

/** Permanently deletes a habit, its history and the XP it earned. */
export async function deleteHabit(id: string) {
  const { userId } = await verifySession();
  await ownHabit(userId, id);
  await db.transaction(async (tx) => {
    await revokeXpByPrefix(tx, userId, "habit", `${id}:`);
    await tx.delete(habitLogs).where(eq(habitLogs.habitId, id));
    await tx.delete(habits).where(eq(habits.id, id));
  });
  redirect("/habits");
}
