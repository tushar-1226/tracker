import type { Metadata } from "next";
import { HabitsBoard } from "@/components/habits/habits-board";
import { getCurrentUser } from "@/lib/auth/dal";
import { listArchivedHabits, listHabits } from "@/server/queries/habits";
import { getToday } from "@/server/today";

export const metadata: Metadata = { title: "Habits" };

export default async function HabitsPage({ searchParams }: PageProps<"/habits">) {
  const user = await getCurrentUser();
  const [habits, archived, today, params] = await Promise.all([
    listHabits(user.id),
    listArchivedHabits(user.id),
    getToday(),
    searchParams,
  ]);

  return (
    <HabitsBoard
      habits={habits}
      archived={archived}
      today={today}
      weekStartsOn={user.settings.weekStartsOn ?? 1}
      openNew={params.new === "1"}
    />
  );
}
