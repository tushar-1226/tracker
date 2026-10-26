"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { birthSchema, placeSchema } from "@/lib/validators/horoscope";

export async function saveBirthDetails(input: z.input<typeof birthSchema>, alsoCurrent: boolean) {
  const user = await getCurrentUser();
  const birth = birthSchema.parse(input);
  const settings = { ...user.settings, birth, currentPlace: alsoCurrent || !user.settings.currentPlace ? birth.place : user.settings.currentPlace };
  await db.update(users).set({ settings }).where(eq(users.id, user.id));
  refresh();
}

export async function saveCurrentPlace(input: z.input<typeof placeSchema>) {
  const user = await getCurrentUser();
  await db.update(users).set({ settings: { ...user.settings, currentPlace: placeSchema.parse(input) } }).where(eq(users.id, user.id));
  refresh();
}

export async function clearBirthDetails() {
  const user = await getCurrentUser();
  await db.update(users).set({ settings: { ...user.settings, birth: undefined } }).where(eq(users.id, user.id));
  refresh();
}
