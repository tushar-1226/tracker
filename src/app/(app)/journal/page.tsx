import type { Metadata } from "next";
import { JournalView } from "@/components/journal/journal-view";
import { getCurrentUser } from "@/lib/auth/dal";
import { type Day, isDay } from "@/lib/dates";
import { compareByDays } from "@/lib/growth";
import { dayCompletion } from "@/lib/habits/stats";
import { logMap } from "@/lib/habits/view";
import { listWorkouts } from "@/server/queries/gym";
import { listHabits } from "@/server/queries/habits";
import { listEntries } from "@/server/queries/journal";
import { listSessions } from "@/server/queries/learning";
import { getToday } from "@/server/today";

export const metadata: Metadata = { title: "Journal" };

const MIN_EACH = 3;
const one = (n: number) => Math.round(n * 10) / 10;

export default async function JournalPage({ searchParams }: PageProps<"/journal">) {
  const user = await getCurrentUser();
  const [today, entries, params, workouts, habits, sessions] = await Promise.all([
    getToday(),
    listEntries(user.id),
    searchParams,
    listWorkouts(user.id),
    listHabits(user.id),
    listSessions(user.id),
  ]);
  const date = isDay(params.date) && params.date <= today ? params.date : today;

  // Simple, honest comparisons — only shown when both sides have enough days.
  const insights: string[] = [];
  const say = (days: Set<Day>, what: string, field: "mood" | "sleepHours", unit = "") => {
    const r = compareByDays(entries, days, (e) => e[field]);
    if (r.with === null || r.without === null || r.n[0] < MIN_EACH || r.n[1] < MIN_EACH) return;
    if (Math.abs(r.with - r.without) < 0.3) return;
    const metric = field === "mood" ? "Mood averages" : "You sleep";
    insights.push(`${metric} ${one(r.with)}${unit} ${what}, vs ${one(r.without)}${unit} otherwise.`);
  };
  const gymDays = new Set(workouts.filter((w) => w.finishedAt).map((w) => w.date));
  const studyDays = new Set(sessions.map((s) => s.date));
  const items = habits.map((h) => ({ habit: h, logs: logMap(h) }));
  const perfectDays = new Set(entries.map((e) => e.date).filter((d) => dayCompletion(items, d).ratio === 1));
  const sleptWell = new Set(entries.filter((e) => (e.sleepHours ?? 0) >= 7).map((e) => e.date));

  say(gymDays, "on gym days", "mood");
  say(gymDays, "on gym days", "sleepHours", " h");
  say(perfectDays, "on days you finish every habit", "mood");
  say(studyDays, "on days you study", "mood");
  say(sleptWell, "after 7+ hours of sleep", "mood");

  return (
    <JournalView
      today={today}
      date={date}
      entries={entries}
      insights={insights.slice(0, 4)}
      weekStartsOn={user.settings.weekStartsOn ?? 1}
    />
  );
}

