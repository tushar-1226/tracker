"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { journalEntries } from "@/db/schema";
import { verifySession } from "@/lib/auth/dal";
import { addDays, isDay } from "@/lib/dates";
import { getToday } from "@/server/today";
import { grantXp, revokeXp } from "@/server/xp";

const JOURNAL_XP = 10;
const scale = z.number().int().min(1).max(5).nullable();
const entrySchema = z.object({
  mood: scale,
  energy: scale,
  sleepHours: z.number().min(0).max(24).nullable(),
  gratitude: z.string().max(1000).nullable(),
  content: z.string().max(50_000).nullable(),
});

/** Upserts the entry for a day; XP once per day that has something written or rated. */
export async function saveEntry(date: string, input: z.input<typeof entrySchema>) {
  const { userId } = await verifySession();
  if (!isDay(date) || date > addDays(await getToday(), 1)) throw new Error("Invalid date");
  const data = entrySchema.parse(input);
  const values = { ...data, gratitude: data.gratitude?.trim() || null, content: data.content?.trim() ? data.content : null, updatedAt: new Date() };
  const hasSomething = values.mood !== null || values.energy !== null || values.sleepHours !== null || !!values.gratitude || !!values.content;

  await db.transaction(async (tx) => {
    if (hasSomething) {
      await tx
        .insert(journalEntries)
        .values({ userId, date, ...values })
        .onConflictDoUpdate({ target: [journalEntries.userId, journalEntries.date], set: values });
      await grantXp(tx, userId, "journal", date, JOURNAL_XP);
    } else {
      await tx.delete(journalEntries).where(and(eq(journalEntries.userId, userId), eq(journalEntries.date, date)));
      await revokeXp(tx, userId, "journal", date);
    }
  });
}
