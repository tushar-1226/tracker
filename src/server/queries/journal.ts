import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { journalEntries } from "@/db/schema";

export async function listEntries(userId: string) {
  return db
    .select({
      date: journalEntries.date,
      mood: journalEntries.mood,
      energy: journalEntries.energy,
      sleepHours: journalEntries.sleepHours,
      gratitude: journalEntries.gratitude,
      content: journalEntries.content,
    })
    .from(journalEntries)
    .where(eq(journalEntries.userId, userId))
    .orderBy(asc(journalEntries.date));
}
