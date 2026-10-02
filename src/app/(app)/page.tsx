import { BookOpen, Dumbbell, Flame, GraduationCap, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { Ring } from "@/components/charts/ring";
import { TodayHabits } from "@/components/habits/today-habits";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { NumberTicker } from "@/components/motion/number-ticker";
import { Greeting } from "@/components/module/greeting";
import { StatCard } from "@/components/module/stat-card";
import { XpBar } from "@/components/module/xp-bar";
import { Card, CardLabel } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/dal";
import { computeStats, dayCompletion } from "@/lib/habits/stats";
import { logMap } from "@/lib/habits/view";
import { levelFromXp } from "@/lib/progress/levels";
import { listHabits } from "@/server/queries/habits";
import { spentOn } from "@/server/queries/money";
import { listWorkouts } from "@/server/queries/gym";
import { listSessions } from "@/server/queries/learning";
import { listBooks } from "@/server/queries/books";
import { startOfWeek, addDays } from "@/lib/dates";
import { formatMoney } from "@/lib/money/math";
import { getToday } from "@/server/today";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const today = await getToday();
  const [habits, spentToday, workouts, sessions, library] = await Promise.all([
    listHabits(user.id),
    spentOn(user.id, today),
    listWorkouts(user.id),
    listSessions(user.id),
    listBooks(user.id),
  ]);
  const studyToday = sessions.filter((s) => s.date === today).reduce((sum, s) => sum + s.minutes, 0);
  const pagesToday = library.logs.filter((l) => l.date === today).reduce((sum, l) => sum + l.pages, 0);
  const readingNow = library.books.find((b) => b.status === "reading");
  const currency = user.settings.currency ?? "INR";
  const { level, current, needed, progress } = levelFromXp(user.xp);
  const weekStartsOn = user.settings.weekStartsOn ?? 1;
  const weekStart = startOfWeek(today, weekStartsOn);
  const workoutsThisWeek = workouts.filter((w) => w.finishedAt && w.date >= weekStart && w.date <= addDays(weekStart, 6)).length;
  const trainedToday = workouts.some((w) => w.finishedAt && w.date === today);

  const items = habits.map((h) => ({ habit: h, logs: logMap(h) }));
  const tally = dayCompletion(items, today);
  const best = items
    .map((i) => ({ name: i.habit.name, ...computeStats(i.habit, i.logs, today, weekStartsOn) }))
    .sort((a, b) => b.current - a.current)[0];

  // Life score grows as more modules come online; for now it is today's habit completion.
  const lifeScore = Math.round((tally.ratio ?? 0) * 100);

  return (
    <>
      <Reveal className="mb-10">
        <Greeting name={user.name} />
      </Reveal>

      <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StaggerItem>
          <Card className="flex h-full flex-col items-center justify-center gap-4 py-8">
            <Ring value={lifeScore / 100}>
              <NumberTicker value={lifeScore} className="tabular text-5xl font-medium" />
              <span className="text-xs text-muted">/ 100</span>
            </Ring>
            <div className="text-center">
              <CardLabel>Life score today</CardLabel>
              <p className="mt-1 text-xs text-muted">
                {tally.due ? `${tally.done} of ${tally.due} habits done` : "Add habits to start scoring"}
              </p>
            </div>
          </Card>
        </StaggerItem>

        <StaggerItem className="md:col-span-2">
          <Card className="flex h-full flex-col justify-between gap-10">
            <div className="flex items-start justify-between">
              <div>
                <CardLabel>Level</CardLabel>
                <p className="tabular mt-2 text-7xl font-medium md:text-8xl">
                  <NumberTicker value={level} />
                </p>
              </div>
              <div className="text-right">
                <CardLabel>Total XP</CardLabel>
                <NumberTicker value={user.xp} className="tabular mt-2 block text-2xl" />
              </div>
            </div>
            <div className="space-y-2">
              <XpBar value={progress} />
              <div className="flex justify-between text-xs text-muted">
                <span className="tabular">
                  {current} / {needed} XP
                </span>
                <span>Level {level + 1}</span>
              </div>
            </div>
          </Card>
        </StaggerItem>

        <StaggerItem className="md:col-span-2 md:row-span-2">
          <TodayHabits habits={habits} today={today} />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            href={best ? "/habits" : "/habits?new=1"}
            icon={Flame}
            label="Top streak"
            value={best?.current ?? 0}
            unit={best?.unit ?? "days"}
            hint={best ? best.name : "Start one today"}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            href={spentToday ? "/money/transactions" : "/money?add=expense"}
            icon={Wallet}
            label="Spent today"
            value={spentToday / 100}
            prefix={formatMoney(0, currency).replace(/[\d.,\s]/g, "")}
            hint={spentToday ? formatMoney(spentToday, currency) : "Log an expense"}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            href="/gym"
            icon={Dumbbell}
            label="Workouts"
            value={workoutsThisWeek}
            unit="this week"
            hint={trainedToday ? "Trained today" : workouts.length ? "Not yet today" : "Log your first session"}
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard href="/learning" icon={GraduationCap} label="Learning" value={studyToday} unit="min" hint={studyToday ? "Studied today" : "Start a focus session"} />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            href={readingNow ? `/books/${readingNow.id}` : "/books?add=1"}
            icon={BookOpen}
            label="Reading"
            value={pagesToday}
            unit="pages"
            hint={readingNow ? readingNow.title : "Pick a book to read"}
          />
        </StaggerItem>
      </Stagger>
    </>
  );
}
