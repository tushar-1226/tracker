"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ChartCard } from "@/components/charts/chart-card";
import { ColumnChart } from "@/components/charts/column-chart";
import { LineChart } from "@/components/charts/line-chart";
import { useWidth } from "@/components/charts/use-width";
import { NumberTicker } from "@/components/motion/number-ticker";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { PageHeader } from "@/components/module/page-header";
import { XpBar } from "@/components/module/xp-bar";
import { Card, CardLabel } from "@/components/ui/card";
import { type Day, toDate } from "@/lib/dates";
import { ACHIEVEMENTS, TIER_NAMES, type AchievementMetrics, tiersReached, titleFor } from "@/lib/progress/achievements";
import { type ModuleKey, SOURCE_LABEL } from "@/lib/progress/modules";
import { cn } from "@/lib/utils";
import { AchievementBadge } from "./badge";
import { MODULE_ICON } from "./module-icon";

type ModuleLevel = { key: ModuleKey; label: string; href: string; xp: number; level: number; progress: number; current: number; needed: number };

const short = (d: Day) => toDate(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

export function ProgressView({
  overall,
  totalXp,
  modules,
  lifeSeries,
  weeklyXp,
  metrics,
  unlocked,
  recent,
}: {
  overall: { level: number; current: number; needed: number; progress: number };
  totalXp: number;
  modules: ModuleLevel[];
  lifeSeries: { date: Day; score: number | null }[];
  weeklyXp: { week: Day; xp: number }[];
  metrics: AchievementMetrics;
  unlocked: Record<string, number>;
  recent: { source: string; amount: number; at: number }[];
}) {
  const earned = Object.values(unlocked).reduce((s, n) => s + n, 0);
  const possible = ACHIEVEMENTS.reduce((s, a) => s + a.thresholds.length, 0);

  return (
    <>
      <PageHeader title="Progress" description="Levels, XP and achievements across everything you track." />

      <div className="grid gap-4 md:grid-cols-3">
        <Reveal className="md:col-span-2">
          <Card className="flex h-full flex-col justify-between gap-10">
            <div className="flex items-start justify-between">
              <div>
                <CardLabel>Level</CardLabel>
                <p className="tabular mt-2 text-8xl font-medium md:text-9xl">
                  <NumberTicker value={overall.level} />
                </p>
              </div>
              <div className="text-right">
                <CardLabel>Total XP</CardLabel>
                <NumberTicker value={totalXp} className="tabular mt-2 block text-2xl" />
                <p className="mt-4 text-xs text-muted">
                  {earned} of {possible} achievements
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <XpBar value={overall.progress} />
              <div className="flex justify-between text-xs text-muted">
                <span className="tabular">
                  {overall.current} / {overall.needed} XP
                </span>
                <span>{overall.needed - overall.current} XP to level {overall.level + 1}</span>
              </div>
            </div>
          </Card>
        </Reveal>
        <Reveal delay={0.05}>
          <ChartCard
            title="Skill wheel"
            subtitle="Level in each area"
            className="h-full"
            table={{ columns: ["Area", "Level", "XP"], rows: modules.map((m) => [m.label, m.level, m.xp]) }}
          >
            <Radar modules={modules} />
          </ChartCard>
        </Reveal>
      </div>

      <Stagger className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {modules.map((m) => {
          const Icon = MODULE_ICON[m.key];
          return (
            <StaggerItem key={m.key}>
              <Link href={m.href} data-cursor-label="Open" className="flex h-full flex-col gap-4 rounded-3xl border bg-surface p-4 transition-colors hover:bg-subtle">
                <span className="flex items-center justify-between text-sm">
                  {m.label}
                  <Icon className="size-4 text-muted" />
                </span>
                <span>
                  <span className="text-3xl font-semibold tracking-tight">Lv {m.level}</span>
                  <span className="mt-2 block h-1 overflow-hidden rounded-none bg-hairline">
                    <motion.span
                      className="block h-full rounded-none bg-foreground"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(2, m.progress * 100)}%` }}
                      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                    />
                  </span>
                  <span className="mt-1.5 block text-[11px] text-muted tabular-nums">{m.xp} XP</span>
                </span>
              </Link>
            </StaggerItem>
          );
        })}
      </Stagger>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Reveal>
          <ChartCard
            title="Life score"
            subtitle="Last 30 days"
            className="h-full"
            table={{ columns: ["Day", "Score"], rows: lifeSeries.map((p) => [short(p.date), p.score ?? "—"]).reverse() }}
          >
            <LineChart
              ariaLabel="Life score over the last 30 days"
              labels={lifeSeries.map((p) => short(p.date))}
              series={[{ name: "Life score", tone: "fg", values: lifeSeries.map((p) => p.score), area: true }]}
              format={(v) => `${v} / 100`}
              formatAxis={(v) => String(v)}
              height={200}
            />
          </ChartCard>
        </Reveal>
        <Reveal delay={0.05}>
          <ChartCard
            title="XP earned"
            subtitle="Per week, last 12 weeks"
            className="h-full"
            table={{ columns: ["Week of", "XP"], rows: weeklyXp.map((w) => [short(w.week), w.xp]).reverse() }}
          >
            <ColumnChart
              ariaLabel="XP earned per week"
              labels={weeklyXp.map((w, i) => ((weeklyXp.length - 1 - i) % 3 === 0 ? short(w.week) : ""))}
              titles={weeklyXp.map((w) => `Week of ${short(w.week)}`)}
              series={[{ name: "XP", tone: "fg", values: weeklyXp.map((w) => w.xp) }]}
              format={(v) => `${v} XP`}
              formatAxis={(v) => String(v)}
              height={200}
            />
          </ChartCard>
        </Reveal>
      </div>

      <Reveal className="mt-10 mb-4">
        <h2 className="border-t-2 border-foreground pt-3 text-2xl font-bold tracking-[-0.03em] uppercase">Trophy case</h2>
        <p className="text-sm text-muted">Outline = bronze · hatched = silver · solid = gold</p>
      </Reveal>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ACHIEVEMENTS.map((a, i) => {
          const reached = Math.max(unlocked[a.key] ?? 0, tiersReached(a, metrics));
          const next = a.thresholds[reached];
          const value = metrics[a.metric];
          const prev = reached ? a.thresholds[reached - 1] : 0;
          return (
            <motion.div
              key={a.key}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (i % 6) * 0.04, duration: 0.5 }}
              className={cn("flex items-center gap-4 rounded-3xl border p-4", reached ? "bg-surface" : "border-dashed")}
            >
              <AchievementBadge module={a.module} tier={reached - 1} size={56} />
              <div className="min-w-0 flex-1">
                <p className={cn("truncate font-medium", !reached && "text-muted")}>{titleFor(a, Math.max(0, reached - 1))}</p>
                <p className="text-xs text-muted">
                  {next !== undefined ? a.describe(next) : `${a.thresholds.length > 1 ? "Gold — " : ""}${a.describe(a.thresholds.at(-1)!)}`}
                </p>
                {next !== undefined ? (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="h-1 flex-1 overflow-hidden rounded-none bg-hairline">
                      <span className="block h-full rounded-none bg-foreground" style={{ width: `${Math.min(1, (value - prev) / (next - prev)) * 100}%` }} />
                    </span>
                    <span className="text-[10px] text-muted tabular-nums">
                      {Math.min(value, next).toLocaleString("en-IN")}/{next.toLocaleString("en-IN")}
                    </span>
                  </div>
                ) : (
                  <p className="mt-1 text-[10px] font-medium tracking-wide uppercase">{a.thresholds.length > 1 ? TIER_NAMES[2] : "Unlocked"}</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <Reveal className="mt-4">
        <Card>
          <CardLabel>Recent XP</CardLabel>
          {recent.length ? (
            <ul className="mt-3 divide-y">
              {recent.map((r, i) => (
                <li key={i} className="flex items-center justify-between py-2.5 text-sm">
                  <span>{SOURCE_LABEL[r.source] ?? r.source}</span>
                  <span className="flex items-center gap-4">
                    <span className="text-xs text-muted">{new Date(r.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                    <span className="w-14 text-right font-medium tabular-nums">+{r.amount}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">Check off a habit, log a workout or write in your journal to earn XP.</p>
          )}
        </Card>
      </Reveal>
    </>
  );
}

/** Six-axis radar of module levels, scaled to the highest level (min 5). */
function Radar({ modules }: { modules: ModuleLevel[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const size = Math.min(width, 280);
  const c = size / 2;
  const r = c - 34;
  const max = Math.max(5, ...modules.map((m) => m.level));
  const point = (i: number, v: number) => {
    const angle = (Math.PI * 2 * i) / modules.length - Math.PI / 2;
    return [c + Math.cos(angle) * r * v, c + Math.sin(angle) * r * v] as const;
  };
  const poly = modules.map((m, i) => point(i, m.level / max).join(",")).join(" ");
  return (
    <div ref={ref} className="flex justify-center">
      {size > 0 && (
        <svg width={size} height={size} role="img" aria-label={`Levels: ${modules.map((m) => `${m.label} ${m.level}`).join(", ")}`}>
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <polygon key={f} points={modules.map((_, i) => point(i, f).join(",")).join(" ")} fill="none" stroke="var(--hairline)" strokeWidth={1} />
          ))}
          {modules.map((_, i) => {
            const [x, y] = point(i, 1);
            return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="var(--hairline)" strokeWidth={1} />;
          })}
          <motion.polygon
            points={poly}
            fill="var(--foreground)"
            fillOpacity={0.1}
            stroke="var(--foreground)"
            strokeWidth={2}
            strokeLinejoin="round"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: `${c}px ${c}px` }}
          />
          {modules.map((m, i) => {
            const [x, y] = point(i, m.level / max);
            const [lx, ly] = point(i, 1.22);
            return (
              <g key={m.key}>
                <circle cx={x} cy={y} r={4} fill="var(--foreground)" stroke="var(--surface)" strokeWidth={2} />
                <text x={lx} y={ly} textAnchor="middle" dy="0.32em" className="fill-muted text-[10px]">
                  {m.label} · {m.level}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

