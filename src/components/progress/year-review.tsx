"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { BookCover } from "@/components/books/book-cover";
import { ChartCard } from "@/components/charts/chart-card";
import { ColumnChart } from "@/components/charts/column-chart";
import { NumberTicker } from "@/components/motion/number-ticker";
import { Reveal } from "@/components/motion/reveal";
import { MOOD_LABEL } from "@/lib/growth";
import { formatMoney } from "@/lib/money/math";
import type { PeriodSummary } from "@/server/summary";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function YearReview({ year, summary, currency, hasPrev, hasNext }: { year: number; summary: PeriodSummary; currency: string; hasPrev: boolean; hasNext: boolean }) {
  const s = summary;
  const money = (m: number) => formatMoney(m, currency, { decimals: false });
  const xpByMonth = MONTHS.map((_, i) => {
    const prefix = `${year}-${String(i + 1).padStart(2, "0")}`;
    return Object.entries(s.xp.byDay).filter(([d]) => d.startsWith(prefix)).reduce((a, [, v]) => a + v, 0);
  });
  const bestMonth = xpByMonth.indexOf(Math.max(...xpByMonth));

  return (
    <>
      <Reveal className="mb-12">
        <div className="flex items-center justify-between border-b pb-2 text-xs font-medium text-muted">
          <Link href="/progress" className="hover:underline">
            ← Progress
          </Link>
          <span className="flex items-center gap-1">
            {hasPrev && (
              <Link href={`/progress/${year - 1}`} aria-label="Previous year" className="inline-flex size-7 items-center justify-center hover:bg-subtle">
                <ChevronLeft className="size-4" />
              </Link>
            )}
            {hasNext && (
              <Link href={`/progress/${year + 1}`} aria-label="Next year" className="inline-flex size-7 items-center justify-center hover:bg-subtle">
                <ChevronRight className="size-4" />
              </Link>
            )}
          </span>
        </div>
        <h1 className="mt-4 text-[3.5rem] leading-[0.95] font-semibold tracking-tight md:text-[7rem]">
          {year}
          <br />
          <span className="text-muted">in review</span>
        </h1>
      </Reveal>

      <Section index="01" title="Experience">
        <Big value={s.xp.total} unit="XP earned" />
        <Fact label="Best month" value={xpByMonth[bestMonth] ? MONTHS[bestMonth] : "—"} />
        <Fact label="Best day" value={s.xp.bestDay ? `${s.xp.bestDay.xp} XP` : "—"} />
      </Section>
      <Reveal className="mb-14">
        <ChartCard title="XP by month" table={{ columns: ["Month", "XP"], rows: MONTHS.map((m, i) => [m, xpByMonth[i]]) }}>
          <ColumnChart ariaLabel={`XP per month in ${year}`} labels={MONTHS} series={[{ name: "XP", tone: "fg", values: xpByMonth }]} format={(v) => `${v} XP`} formatAxis={String} height={200} />
        </ChartCard>
      </Reveal>

      <Section index="02" title="Habits">
        <Big value={s.habits.rate === null ? 0 : Math.round(s.habits.rate * 100)} unit="% of habits done" />
        <Fact label="Perfect days" value={String(s.habits.perfectDays)} />
        <Fact label="Check-ins" value={s.habits.done.toLocaleString("en-IN")} />
        <Fact label="Most done" value={s.habits.top?.count ? `${s.habits.top.name} · ${s.habits.top.count}×` : "—"} />
        <Fact label="Best streak" value={s.habits.bestStreak ? `${s.habits.bestStreak.best} days · ${s.habits.bestStreak.name}` : "—"} />
      </Section>

      <Section index="03" title="Fitness">
        <Big value={s.fitness.workouts} unit="workouts" />
        <Fact label="Time trained" value={`${Math.round(s.fitness.minutes / 60)} h`} />
        <Fact label="Volume moved" value={`${s.fitness.volume.toLocaleString("en-IN")} ${s.fitness.units}`} />
        <Fact label="Personal records" value={String(s.fitness.prs)} />
        <Fact label="Favourite lift" value={s.fitness.topExercise ? `${s.fitness.topExercise.name} · ${s.fitness.topExercise.sessions} sessions` : "—"} />
      </Section>

      <Section index="04" title="Money">
        <Big text={money(s.money.income - s.money.spent)} unit={s.money.income >= s.money.spent ? "saved" : "overspent"} />
        <Fact label="Earned" value={money(s.money.income)} />
        <Fact label="Spent" value={money(s.money.spent)} />
        <Fact label="Savings rate" value={s.money.income ? `${Math.round(((s.money.income - s.money.spent) / s.money.income) * 100)}%` : "—"} />
        <Fact label="Top spending" value={s.money.topCategories.map((c) => c.name).join(", ") || "—"} />
      </Section>

      <Section index="05" title="Mind">
        <Big value={Math.round(s.learning.minutes / 60)} unit="hours learning" />
        <Fact label="Pages read" value={s.reading.pages.toLocaleString("en-IN")} />
        <Fact label="Books finished" value={String(s.reading.finished.length)} />
        <Fact label="Journal entries" value={String(s.journal.entries)} />
        <Fact label="Average mood" value={s.journal.mood ? `${s.journal.mood.toFixed(1)} · ${MOOD_LABEL[Math.round(s.journal.mood)]}` : "—"} />
        <Fact label="Average sleep" value={s.journal.sleep ? `${s.journal.sleep.toFixed(1)} h` : "—"} />
      </Section>

      {s.reading.finished.length > 0 && (
        <Reveal className="mb-14">
          <p className="mb-4 text-xs font-medium text-muted">Bookshelf</p>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-5 md:grid-cols-8">
            {s.reading.finished.map((b, i) => (
              <div key={i}>
                <BookCover src={b.coverUrl} title={b.title} />
                <p className="mt-1.5 line-clamp-2 text-[11px] font-medium">{b.title}</p>
                {b.rating && <p className="text-[10px] text-muted">{"★".repeat(b.rating)}</p>}
              </div>
            ))}
          </div>
        </Reveal>
      )}
    </>
  );
}

function Section({ index, title, children }: { index: string; title: string; children: React.ReactNode }) {
  return (
    <Reveal className="mb-14">
      <div className="mb-6 flex items-baseline gap-4">
        <span className="text-[15px] text-muted">{index}</span>
        <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">{title}</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </Reveal>
  );
}

function Big({ value, text, unit }: { value?: number; text?: string; unit: string }) {
  return (
    <div className="rounded-3xl bg-surface p-6 sm:col-span-2 lg:row-span-2">
      <p className="text-6xl leading-none font-semibold tracking-tight md:text-8xl">{text ?? <NumberTicker value={value ?? 0} />}</p>
      <p className="mt-3 text-xs font-medium text-muted">{unit}</p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-surface p-6">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
