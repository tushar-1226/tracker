import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HabitDetail } from "@/components/habits/habit-detail";
import { getCurrentUser, verifySession } from "@/lib/auth/dal";
import { getHabit } from "@/server/queries/habits";
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

  return <HabitDetail habit={view} archived={archived} today={today} weekStartsOn={user.settings.weekStartsOn ?? 1} />;
}
