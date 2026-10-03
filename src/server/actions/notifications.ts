"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { habits, pushSubscriptions, reminders, users } from "@/db/schema";
import { getCurrentUser, verifySession } from "@/lib/auth/dal";
import { isValidTimeZone } from "@/lib/dates";
import { isTime } from "@/lib/reminders";
import { pushConfigured, sendToUser } from "@/server/push";

const subSchema = z.object({
  endpoint: z.url().max(2000),
  keys: z.object({ p256dh: z.string().min(1).max(500), auth: z.string().min(1).max(500) }),
});

/** Stores this device's push subscription (re-subscribing moves it to the current user). */
export async function saveSubscription(sub: unknown, device: string) {
  const { userId } = await verifySession();
  const { endpoint, keys } = subSchema.parse(sub);
  await db
    .insert(pushSubscriptions)
    .values({ userId, endpoint, p256dh: keys.p256dh, auth: keys.auth, device: device.slice(0, 120) })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId, p256dh: keys.p256dh, auth: keys.auth, device: device.slice(0, 120) } });
  refresh();
}

export async function removeSubscription(endpoint: string) {
  const { userId } = await verifySession();
  await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, userId)));
  refresh();
}

export async function sendTestNotification() {
  const { userId } = await verifySession();
  if (!pushConfigured()) return { sent: 0, error: "Push keys are not configured on the server." };
  const sent = await sendToUser(userId, { title: "Notifications are on", body: "This is how reminders will look. Tap to open Track.", url: "/settings", tag: "test" });
  return { sent };
}

/** Saves the browser's time zone so the scheduler knows the user's local time. */
export async function saveTimeZone(tz: string) {
  const user = await getCurrentUser();
  if (!isValidTimeZone(tz) || user.settings.timeZone === tz) return;
  await db.update(users).set({ settings: { ...user.settings, timeZone: tz } }).where(eq(users.id, user.id));
}

const reminderSchema = z.object({
  id: z.string().optional(),
  kind: z.enum(["habit", "journal", "workout", "study", "reading", "spending", "custom"]),
  refId: z.string().nullable(),
  title: z.string().trim().min(1, { error: "Add a title" }).max(80),
  body: z.string().trim().max(160).nullable(),
  url: z.string().startsWith("/").max(200),
  time: z.string().refine(isTime, { error: "Pick a time" }),
  days: z.array(z.number().int().min(0).max(6)).max(7),
});

export async function saveReminder(input: z.input<typeof reminderSchema>) {
  const { userId } = await verifySession();
  const { id, ...data } = reminderSchema.parse(input);
  if (data.kind === "habit") {
    const habit = data.refId && (await db.query.habits.findFirst({ where: and(eq(habits.id, data.refId), eq(habits.userId, userId)) }));
    if (!habit) throw new Error("Habit not found");
  }
  const days = [...new Set(data.days)].sort();
  if (id) {
    // Changing the time today should still allow it to fire later today.
    await db
      .update(reminders)
      .set({ ...data, days: days.length === 7 ? [] : days, lastSentDate: null })
      .where(and(eq(reminders.id, id), eq(reminders.userId, userId)));
  } else {
    await db.insert(reminders).values({ ...data, days: days.length === 7 ? [] : days, userId });
  }
  refresh();
}

export async function setReminderEnabled(id: string, enabled: boolean) {
  const { userId } = await verifySession();
  await db.update(reminders).set({ enabled }).where(and(eq(reminders.id, id), eq(reminders.userId, userId)));
  refresh();
}

export async function deleteReminder(id: string) {
  const { userId } = await verifySession();
  await db.delete(reminders).where(and(eq(reminders.id, id), eq(reminders.userId, userId)));
  refresh();
}
