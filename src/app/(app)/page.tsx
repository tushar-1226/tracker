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
import { computeStats } from "@/lib/habits/stats";
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
import { getProgress, listUnlocked } from "@/server/progress";
import { LifeBreakdown } from "@/components/progress/life-breakdown";
import { RecentAchievements } from "@/components/progress/recent-achievements";
import { WeekCompare } from "@/components/progress/week-compare";
import { TodaySkyCard } from "@/components/horoscope/today-sky-card";
import { getHoroscope } from "@/server/horoscope";
import { getPeriodSummary } from "@/server/summary";

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
  const workoutTarget = user.settings.workoutTarget ?? 3;
  const learningTarget = user.settings.learningTarget ?? 30;

  const items = habits.map((h) => ({ habit: h, logs: logMap(h) }));
  const best = items
    .map((i) => ({ name: i.habit.name, ...computeStats(i.habit, i.logs, today, weekStartsOn) }))
    .sort((a, b) => b.current - a.current)[0];

  const [snapshot, thisWeek, lastWeek] = await Promise.all([
    getProgress(),
    getPeriodSummary(user.id, weekStart, today),
    getPeriodSummary(user.id, addDays(weekStart, -7), addDays(weekStart, -1)),
  ]);
  const lifeScore = snapshot.life.today ?? 0;
  const unlocked = (await listUnlocked(user.id)).sort((a, b) => b.unlockedAt.getTime() - a.unlockedAt.getTime()).slice(0, 3);

  return (
    <>
      <Stagger className="grid grid-cols-2 gap-3 md:grid-cols-6 md:gap-4">
        <StaggerItem className="col-span-2 md:col-span-4">
          <Card className="relative h-full overflow-hidden p-7 md:p-9">
            <span aria-hidden className="tint-glow pointer-events-none absolute inset-0" />
            <span aria-hidden className="pointer-events-none absolute -right-16 -bottom-28 size-72 rounded-full border-[28px] border-tint/[0.07]" />
            <span aria-hidden className="pointer-events-none absolute -right-2 -bottom-14 size-40 rounded-full border-[16px] border-tint/[0.06]" />
            <div className="relative flex h-full flex-col justify-between gap-12">
              <Greeting name={user.name} />
              <div className="space-y-3">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <CardLabel>Level</CardLabel>
                    <p className="tabular mt-1 text-6xl leading-none font-medium md:text-7xl">
                      <NumberTicker value={level} />
                    </p>
                  </div>
                  <div className="text-right">
                    <CardLabel>Total XP</CardLabel>
                    <NumberTicker value={user.xp} className="tabular mt-1 block text-2xl" />
                    <RecentAchievements items={unlocked.map(({ key, tier }) => ({ key, tier }))} />
                  </div>
                </div>
                <XpBar value={progress} />
                <div className="flex justify-between text-xs text-muted">
                  <span className="tabular">
                    {current} / {needed} XP
                  </span>
                  <span>Level {level + 1}</span>
                </div>
              </div>
            </div>
          </Card>
        </StaggerItem>

        <StaggerItem className="col-span-2">
          <Card className="flex h-full flex-col items-center justify-center gap-5 py-8">
            <CardLabel>Life score today</CardLabel>
            <Ring value={lifeScore / 100} size={168}>
              <NumberTicker value={lifeScore} className="tabular text-5xl font-medium" />
              <span className="text-xs text-muted">/ 100</span>
            </Ring>
            <LifeBreakdown parts={snapshot.life.parts} />
          </Card>
        </StaggerItem>

        <StaggerItem className="tint-habits col-span-2 md:col-span-4 md:row-span-2">
          <TodayHabits habits={habits} today={today} />
        </StaggerItem>
        <StaggerItem className="md:col-span-2">
          <StatCard
            href={best ? "/habits" : "/habits?new=1"}
            icon={Flame}
            tint="habits"
            label="Top streak"
            value={best?.current ?? 0}
            unit={best?.unit ?? "days"}
            hint={best ? best.name : "Start one today"}
          />
        </StaggerItem>
        <StaggerItem className="md:col-span-2">
          <StatCard
            href={spentToday ? "/money/transactions" : "/money?add=expense"}
            icon={Wallet}
            tint="money"
            label="Spent today"
            value={spentToday / 100}
            prefix={formatMoney(0, currency).replace(/[\d.,\s]/g, "")}
            hint={spentToday ? formatMoney(spentToday, currency) : "Log an expense"}
          />
        </StaggerItem>
        <StaggerItem className="md:col-span-2">
          <StatCard
            href="/gym"
            icon={Dumbbell}
            tint="fitness"
            label="Workouts"
            value={workoutsThisWeek}
            unit="this week"
            hint={trainedToday ? "Trained today" : workouts.length ? "Not yet today" : "Log your first session"}
            progress={workoutsThisWeek / workoutTarget}
          />
        </StaggerItem>
        <StaggerItem className="md:col-span-2">
          <StatCard
            href="/learning"
            icon={GraduationCap}
            tint="learning"
            label="Learning"
            value={studyToday}
            unit="min"
            hint={studyToday ? "Studied today" : "Start a focus session"}
            progress={studyToday / learningTarget}
          />
        </StaggerItem>
        <StaggerItem className="col-span-2">
          <StatCard
            href={readingNow ? `/books/${readingNow.id}` : "/books?add=1"}
            icon={BookOpen}
            tint="reading"
            label="Reading"
            value={pagesToday}
            unit="pages"
            hint={readingNow ? readingNow.title : "Pick a book to read"}
            progress={readingNow?.totalPages ? readingNow.pagesRead / readingNow.totalPages : undefined}
          />
        </StaggerItem>
      </Stagger>

      <Reveal className="tint-astro mt-4">
        <TodaySkyCard h={getHoroscope(user.settings, today)} />
      </Reveal>

      <Reveal className="mt-4">
        <WeekCompare now={thisWeek} last={lastWeek} money={(m) => formatMoney(m, currency)} />
      </Reveal>
    </>
  );
}
