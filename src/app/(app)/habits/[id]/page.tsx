import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HabitDetail } from "@/components/habits/habit-detail";
import { getCurrentUser, verifySession } from "@/lib/auth/dal";
import { getHabit } from "@/server/queries/habits";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { reminders } from "@/db/schema";
import { getToday } from "@/server/today";

export async function generateMetadata({ params }: PageProps<"/habits/[id]">): Promise<Metadata> {
  const [{ userId }, { id }] = await Promise.all([verifySession(), params]);
  const habit = await getHabit(userId, id);
  return { title: habit?.name ?? "Habit" };
}

export default async function HabitPage({ params }: PageProps<"/habits/[id]">) {
  const [user, { id }, today] = await Promise.all([getCurrentUser(), params, getToday()]);
  const habit = await getHabit(user.id, id);
  if (!habit) notFound();
  const { archived, ...view } = habit;
  const reminder = await db.query.reminders.findFirst({
    where: and(eq(reminders.userId, user.id), eq(reminders.kind, "habit"), eq(reminders.refId, habit.id)),
  });

  return (
    <HabitDetail
      habit={view}
      archived={archived}
      today={today}
      weekStartsOn={user.settings.weekStartsOn ?? 1}
      reminder={reminder ? { id: reminder.id, kind: reminder.kind, refId: reminder.refId, title: reminder.title, body: reminder.body, url: reminder.url, time: reminder.time, days: reminder.days, enabled: reminder.enabled } : null}
    />
  );
}
