"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { CURRENCIES } from "@/lib/money/math";

const prefsSchema = z
  .object({
    currency: z.enum(CURRENCIES),
    units: z.enum(["kg", "lb"]),
    weekStartsOn: z.union([z.literal(0), z.literal(1)]),
    cursor: z.boolean(),
    workoutTarget: z.number().int().min(1).max(14),
    learningTarget: z.number().int().min(5).max(600),
    readingGoal: z.number().int().min(1).max(500),
    horoscopeLang: z.enum(["en", "hinglish", "hi"]),
  })
  .partial();

/** Merges preference changes into the user's settings. */
export async function updatePreferences(patch: z.input<typeof prefsSchema>) {
  const user = await getCurrentUser();
  const data = prefsSchema.parse(patch);
  await db.update(users).set({ settings: { ...user.settings, ...data } }).where(eq(users.id, user.id));
  refresh();
}

export async function updateName(name: string) {
  const user = await getCurrentUser();
  await db.update(users).set({ name: z.string().trim().min(1).max(50).parse(name) }).where(eq(users.id, user.id));
  refresh();
}

export async function changePassword(current: string, next: string) {
  const user = await getCurrentUser();
  const row = await db.query.users.findFirst({ where: eq(users.id, user.id), columns: { passwordHash: true } });
  if (!row || !(await bcrypt.compare(current, row.passwordHash))) return { error: "Current password is wrong" };
  if (next.length < 8) return { error: "New password needs at least 8 characters" };
  await db.update(users).set({ passwordHash: await bcrypt.hash(next, 12) }).where(eq(users.id, user.id));
  return { ok: true };
}
