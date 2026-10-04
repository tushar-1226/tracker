import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Card, CardLabel } from "@/components/ui/card";
import type { PeriodSummary } from "@/server/summary";

/** This week so far next to last week, one row per area. */
export function WeekCompare({ now, last, money }: { now: PeriodSummary; last: PeriodSummary; money: (minor: number) => string }) {
  const hours = (m: number) => `${Math.round((m / 60) * 10) / 10}h`;
  const rows: { label: string; a: number | null; b: number | null; fmt: (v: number) => string; lowerIsBetter?: boolean }[] = [
    { label: "Habits", a: now.habits.rate, b: last.habits.rate, fmt: (v) => `${Math.round(v * 100)}%` },
    { label: "Workouts", a: now.fitness.workouts, b: last.fitness.workouts, fmt: String },
    { label: "Spent", a: now.money.spent, b: last.money.spent, fmt: money, lowerIsBetter: true },
    { label: "Learning", a: now.learning.minutes, b: last.learning.minutes, fmt: hours },
    { label: "Pages read", a: now.reading.pages, b: last.reading.pages, fmt: String },
    { label: "XP", a: now.xp.total, b: last.xp.total, fmt: String },
  ];
  return (
    <Card className="p-0">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <CardLabel>This week</CardLabel>
        <Link href="/progress" className="text-xs font-medium text-muted hover:text-foreground">
          Progress →
        </Link>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="px-6 py-2 font-semibold"></th>
            <th className="px-2 py-2 text-right font-semibold">So far</th>
            <th className="px-6 py-2 text-right font-semibold">Last week</th>
          </tr>
        </thead>
        <tbody className="divide-y border-t">
          {rows.map((r) => {
            const up = r.a !== null && r.b !== null && r.a > r.b;
            const down = r.a !== null && r.b !== null && r.a < r.b;
            return (
              <tr key={r.label}>
                <td className="px-6 py-2.5">{r.label}</td>
                <td className="px-2 py-2.5 text-right font-semibold tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    {r.a === null ? "—" : r.fmt(r.a)}
                    {up && <ArrowUpRight className="size-3.5" aria-label="more than last week" />}
                    {down && <ArrowDownRight className="size-3.5 text-muted" aria-label="less than last week" />}
                  </span>
                </td>
                <td className="px-6 py-2.5 text-right text-muted tabular-nums">{r.b === null ? "—" : r.fmt(r.b)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
