"use client";

import { ArrowUpRight, Dumbbell, Play, Plus, Trophy, X } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useTransition } from "react";
import { BarList } from "@/components/charts/bar-list";
import { ChartCard } from "@/components/charts/chart-card";
import { Heatmap, HeatmapLegend } from "@/components/charts/heatmap";
import { Magnetic } from "@/components/motion/magnetic";
import { NumberTicker } from "@/components/motion/number-ticker";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { PageHeader } from "@/components/module/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardLabel } from "@/components/ui/card";
import { type Day, addDays, toDate, formatDate } from "@/lib/dates";
import type { Units } from "@/lib/fitness";
import { deleteTemplate, startWorkout } from "@/server/actions/gym";
import { BodyWeightCard } from "./body-weight-card";

type WorkoutSummary = {
  id: string;
  name: string;
  date: Day;
  durationMin: number | null;
  inProgress: boolean;
  sets: number;
  volume: number;
  prs: number;
  exercises: string[];
};

const dateLabel = (d: Day, today: Day) =>
  d === today
    ? "Today"
    : d === addDays(today, -1)
      ? "Yesterday"
      : formatDate(toDate(d), { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export function GymOverview({
  today,
  units,
  weeklyTarget,
  active,
  stats,
  heat,
  workouts,
  templates,
  records,
  muscles,
  body,
  weekStartsOn,
}: {
  today: Day;
  units: Units;
  weeklyTarget: number;
  active: { id: string; name: string } | null;
  stats: { thisWeek: number; streak: number; volumeMonth: number; prs30: number };
  heat: Record<Day, number>;
  workouts: WorkoutSummary[];
  templates: { id: string; name: string; exercises: string[] }[];
  records: { exerciseId: string; name: string; best: string; sessions: number }[];
  muscles: { muscle: string; sets: number }[];
  body: { date: Day; weight: number; bodyFat: number | null }[];
  weekStartsOn: 0 | 1;
}) {
  const [pending, startTransition] = useTransition();
  const start = (templateId?: string) => startTransition(() => startWorkout(templateId));
  const finished = workouts.filter((w) => !w.inProgress);

  return (
    <>
      <PageHeader
        title="Gym"
        description="Workouts, personal records and body progress."
        actions={
          active ? (
            <Magnetic>
              <Button asChild data-cursor-label="Resume">
                <Link href={`/gym/workout/${active.id}`}>
                  <Play /> Resume {active.name}
                </Link>
              </Button>
            </Magnetic>
          ) : (
            <Magnetic>
              <Button onClick={() => start()} disabled={pending} data-cursor-label="Start">
                <Plus /> Start workout
              </Button>
            </Magnetic>
          )
        }
      />

      {active && (
        <Reveal className="mb-6">
          <Link
            href={`/gym/workout/${active.id}`}
            className="flex items-center gap-3 rounded-3xl bg-foreground px-5 py-4 text-background transition-opacity hover:opacity-90"
          >
            <span className="size-2 animate-pulse rounded-full bg-background" />
            <span className="flex-1 text-sm font-medium">{active.name} is in progress</span>
            <ArrowUpRight className="size-4" />
          </Link>
        </Reveal>
      )}

      <Stagger className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="This week" value={stats.thisWeek} unit={`of ${weeklyTarget} workouts`} />
        <Stat label="Week streak" value={stats.streak} unit={stats.streak === 1 ? "week" : "weeks"} />
        <Stat label="Volume this month" value={Math.round(stats.volumeMonth)} unit={units} />
        <Stat label="PRs, last 30 days" value={stats.prs30} unit={stats.prs30 === 1 ? "record" : "records"} />
      </Stagger>

      <Reveal className="mt-10 mb-4">
        <h2 className="text-xl font-semibold tracking-tight">Templates</h2>
      </Reveal>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {templates.map((t, i) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="group relative"
          >
            <button
              type="button"
              disabled={pending || !!active}
              onClick={() => start(t.id)}
              data-cursor-label="Start"
              className="flex h-full w-full flex-col gap-3 rounded-3xl bg-surface p-5 text-left transition-colors hover:bg-subtle disabled:opacity-50"
            >
              <span className="flex items-center gap-2 font-medium">
                <Dumbbell className="size-4 text-muted" /> {t.name}
              </span>
              <span className="line-clamp-2 text-xs text-muted">{t.exercises.join(" · ")}</span>
            </button>
            <button
              type="button"
              aria-label={`Delete template ${t.name}`}
              onClick={() => startTransition(() => deleteTemplate(t.id))}
              className="absolute top-3 right-3 inline-flex size-7 items-center justify-center rounded-full text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-subtle hover:text-foreground focus:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          </motion.div>
        ))}
        {!templates.length && <p className="text-sm text-muted">Finish a workout and save it as a template.</p>}
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <Reveal className="md:col-span-2">
          <Card className="h-full">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
              <div>
                <CardLabel>Training days</CardLabel>
                <p className="mt-1 text-sm text-muted">
                  <span className="text-foreground tabular-nums">{finished.filter((w) => w.date >= addDays(today, -182)).length}</span> workouts in the last 6 months
                </p>
              </div>
              <HeatmapLegend />
            </div>
            <Heatmap levels={heat} end={today} weeks={27} weekStartsOn={weekStartsOn} describe={(d, l) => `${d} · ${l ? "trained" : "rest"}`} />
          </Card>
        </Reveal>
        <Reveal delay={0.05}>
          <BodyWeightCard points={body} units={units} today={today} />
        </Reveal>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Reveal className="md:col-span-2">
          <Card className="h-full">
            <CardLabel>Recent workouts</CardLabel>
            {finished.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-foreground/[0.035] px-4 py-10 text-center text-sm text-muted">
                Your workouts will show up here. Start one from a template above.
              </p>
            ) : (
              <ul className="-mx-2 mt-3">
                {finished.slice(0, 8).map((w) => (
                  <li key={w.id}>
                    <Link
                      href={`/gym/workout/${w.id}`}
                      data-cursor-label="Open"
                      className="flex items-center gap-4 rounded-2xl px-2 py-3 transition-colors hover:bg-subtle"
                    >
                      <span className="w-20 shrink-0 text-xs text-muted">{dateLabel(w.date, today)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                          {w.name}
                          {w.prs > 0 && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-foreground px-1.5 py-0.5 text-[10px] text-background">
                              <Trophy className="size-2.5" /> {w.prs}
                            </span>
                          )}
                        </span>
                        <span className="block truncate text-xs text-muted">{w.exercises.join(" · ") || "No sets logged"}</span>
                      </span>
                      <span className="hidden shrink-0 text-right text-xs text-muted tabular-nums sm:block">
                        {w.sets} sets
                        {w.durationMin ? ` · ${w.durationMin} min` : ""}
                        <br />
                        {w.volume > 0 && `${Math.round(w.volume).toLocaleString("en-IN")} ${units}`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Reveal>
        <Reveal delay={0.05}>
          <ChartCard
            title="Sets per muscle"
            subtitle="This week"
            className="h-full"
            table={{ columns: ["Muscle", "Sets"], rows: muscles.map((m) => [m.muscle, m.sets]) }}
          >
            {muscles.length ? (
              <BarList items={muscles.map((m) => ({ key: m.muscle, label: m.muscle, value: m.sets }))} format={(v) => `${v}`} />
            ) : (
              <p className="py-10 text-center text-sm text-muted">No sets logged this week.</p>
            )}
          </ChartCard>
        </Reveal>
      </div>

      <Reveal className="mt-10 mb-4 flex items-end justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Personal records</h2>
        <Link href="/gym/exercises" className="text-xs text-muted transition-colors hover:text-foreground">
          All exercises →
        </Link>
      </Reveal>
      {records.length ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {records.map((r) => (
            <Link
              key={r.exerciseId}
              href={`/gym/exercises/${r.exerciseId}`}
              data-cursor-label="Open"
              className="rounded-3xl bg-surface p-5 transition-colors hover:bg-subtle"
            >
              <p className="truncate text-sm text-muted">{r.name}</p>
              <p className="mt-3 truncate text-xl font-semibold tracking-tight">{r.best}</p>
              <p className="mt-1 text-xs text-muted">
                {r.sessions} session{r.sessions === 1 ? "" : "s"}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="rounded-3xl bg-foreground/[0.035] px-4 py-10 text-center text-sm text-muted">
          Records appear after your first workout. Beat them to earn PR XP.
        </p>
      )}
    </>
  );
}

function Stat({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <StaggerItem>
      <Card className="flex h-full flex-col justify-between gap-6">
        <CardLabel>{label}</CardLabel>
        <p className="flex flex-wrap items-baseline gap-x-1.5">
          <NumberTicker value={value} className="tabular text-4xl font-medium" />
          <span className="text-sm text-muted">{unit}</span>
        </p>
      </Card>
    </StaggerItem>
  );
}
