import type { Metadata } from "next";
import { LearningView } from "@/components/learning/learning-view";
import { getCurrentUser } from "@/lib/auth/dal";
import { startOfWeek } from "@/lib/dates";
import { dayStreak } from "@/lib/growth";
import { listResources, listSessions, listSkills, listTils } from "@/server/queries/learning";
import { getToday } from "@/server/today";

export const metadata: Metadata = { title: "Learning" };

export default async function LearningPage({ searchParams }: PageProps<"/learning">) {
  const user = await getCurrentUser();
  const [today, skills, sessions, tils, resources, params] = await Promise.all([
    getToday(),
    listSkills(user.id),
    listSessions(user.id),
    listTils(user.id),
    listResources(user.id),
    searchParams,
  ]);
  const weekStart = startOfWeek(today, user.settings.weekStartsOn ?? 1);
  const sum = (list: typeof sessions) => list.reduce((s, x) => s + x.minutes, 0);

  return (
    <LearningView
      today={today}
      skills={skills.map((s) => ({ id: s.id, name: s.name, icon: s.icon, targetHours: s.targetHours }))}
      sessions={sessions}
      tils={tils}
      resources={resources}
      openLog={params.log === "1"}
      stats={{
        todayMin: sum(sessions.filter((s) => s.date === today)),
        weekMin: sum(sessions.filter((s) => s.date >= weekStart && s.date <= today)),
        streak: dayStreak(
          sessions.map((s) => s.date),
          today,
        ),
        totalMin: sum(sessions),
      }}
    />
  );
}
