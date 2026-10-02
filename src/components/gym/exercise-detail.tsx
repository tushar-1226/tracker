"use client";

import { ArrowLeft, Trophy } from "lucide-react";
import Link from "next/link";
import { ChartCard } from "@/components/charts/chart-card";
import { LineChart } from "@/components/charts/line-chart";
import { NumberTicker } from "@/components/motion/number-ticker";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { Card, CardLabel } from "@/components/ui/card";
import { type Day, toDate } from "@/lib/dates";

const short = (d: Day) => toDate(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const long = (d: Day) => toDate(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function ExerciseDetail({
  name,
  muscle,
  metricLabel,
  metricUnit,
  stats,
  progress,
  sessions,
}: {
  name: string;
  muscle: string;
  metricLabel: string;
  metricUnit: string;
  stats: { label: string; value: number; unit: string }[];
  progress: { date: Day; value: number }[];
  sessions: { workoutId: string; date: Day; workoutName: string; summary: string; pr: boolean }[];
}) {
  return (
    <>
      <Reveal>
        <Link href="/gym/exercises" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Exercises
        </Link>
      </Reveal>
      <Reveal className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">{name}</h1>
        <p className="mt-2 text-sm text-muted">{muscle}</p>
      </Reveal>

      <Stagger className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <StaggerItem key={s.label}>
            <Card className="flex h-full flex-col justify-between gap-6">
              <CardLabel>{s.label}</CardLabel>
              <p className="flex items-baseline gap-1.5">
                <NumberTicker value={s.value} decimals={Number.isInteger(s.value) ? 0 : 1} className="tabular text-4xl font-medium" />
                <span className="text-sm text-muted">{s.unit}</span>
              </p>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>

      <Reveal className="mt-4">
        <ChartCard
          title={metricLabel}
          subtitle="Best set of each session"
          table={{ columns: ["Date", `${metricLabel} (${metricUnit})`], rows: [...progress].reverse().map((p) => [long(p.date), p.value]) }}
        >
          {progress.length > 1 ? (
            <LineChart
              ariaLabel={`${metricLabel} over time for ${name}`}
              labels={progress.map((p) => short(p.date))}
              titles={progress.map((p) => long(p.date))}
              series={[{ name: metricLabel, tone: "fg", values: progress.map((p) => p.value), area: true }]}
              format={(v) => `${Math.round(v * 10) / 10} ${metricUnit}`}
              formatAxis={(v) => String(v)}
              baseline="fit"
            />
          ) : (
            <p className="flex h-40 items-center justify-center rounded-2xl border border-dashed text-sm text-muted">
              Log this exercise in two sessions to see your progress line.
            </p>
          )}
        </ChartCard>
      </Reveal>

      <Reveal className="mt-4">
        <Card>
          <CardLabel>History</CardLabel>
          {sessions.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Not logged yet.</p>
          ) : (
            <ul className="-mx-2 mt-3">
              {sessions.map((s) => (
                <li key={s.workoutId}>
                  <Link href={`/gym/workout/${s.workoutId}`} className="flex items-center gap-4 rounded-2xl px-2 py-3 text-sm transition-colors hover:bg-subtle">
                    <span className="w-28 shrink-0 text-xs text-muted">{long(s.date)}</span>
                    <span className="flex-1 truncate">{s.summary}</span>
                    {s.pr && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-foreground px-2 py-0.5 text-[10px] text-background">
                        <Trophy className="size-3" /> PR
                      </span>
                    )}
                    <span className="hidden text-xs text-muted sm:inline">{s.workoutName}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </Reveal>
    </>
  );
}
