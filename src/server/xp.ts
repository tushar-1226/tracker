import "server-only";
import { and, eq, like, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, xpEvents } from "@/db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const XP = {
  habit: 10,
  habitDay: 25,
  workout: 30,
  workoutPr: 20,
} as const;

/** Grants XP once per (source, key); repeated calls are no-ops. */
export async function grantXp(tx: Tx, userId: string, source: string, sourceKey: string, amount: number) {
  const inserted = await tx
    .insert(xpEvents)
    .values({ userId, source, sourceKey, amount })
    .onConflictDoNothing()
    .returning({ amount: xpEvents.amount });
  if (inserted.length) {
    await tx.update(users).set({ xp: sql`${users.xp} + ${amount}` }).where(eq(users.id, userId));
  }
}

/** Removes a previous grant (e.g. a habit was unchecked). */
export async function revokeXp(tx: Tx, userId: string, source: string, sourceKey: string) {
  const removed = await tx
    .delete(xpEvents)
    .where(and(eq(xpEvents.userId, userId), eq(xpEvents.source, source), eq(xpEvents.sourceKey, sourceKey)))
    .returning({ amount: xpEvents.amount });
  await subtract(tx, userId, removed);
}

/** Removes every grant whose key starts with `prefix`. */
export async function revokeXpByPrefix(tx: Tx, userId: string, source: string, prefix: string) {
  const removed = await tx
    .delete(xpEvents)
    .where(and(eq(xpEvents.userId, userId), eq(xpEvents.source, source), like(xpEvents.sourceKey, `${prefix}%`)))
    .returning({ amount: xpEvents.amount });
  await subtract(tx, userId, removed);
}

async function subtract(tx: Tx, userId: string, removed: { amount: number }[]) {
  const total = removed.reduce((sum, r) => sum + r.amount, 0);
  if (total) {
    await tx.update(users).set({ xp: sql`max(0, ${users.xp} - ${total})` }).where(eq(users.id, userId));
  }
}
