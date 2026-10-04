"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { isDay, isValidTimeZone } from "@/lib/dates";
import { isTime } from "@/lib/reminders";

const placeSchema = z.object({
  name: z.string().trim().min(1).max(80),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  tz: z.string().refine(isValidTimeZone, { error: "Unknown time zone" }),
});

const birthSchema = z.object({
  date: z.string().refine((d) => isDay(d) && d >= "1900-01-01", { error: "Pick your birth date" }),
  time: z.string().refine(isTime).nullable(),
  place: placeSchema,
});

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
