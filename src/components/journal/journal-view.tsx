"use client";

import { Angry, ChevronLeft, ChevronRight, Frown, Laugh, Meh, Minus, Plus, Smile } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChartCard } from "@/components/charts/chart-card";
import { ColumnChart } from "@/components/charts/column-chart";
import { Heatmap } from "@/components/charts/heatmap";
import { LineChart } from "@/components/charts/line-chart";
import { Reveal } from "@/components/motion/reveal";
import { Card, CardLabel } from "@/components/ui/card";
import { type Day, addDays, eachDay, toDate, formatDate } from "@/lib/dates";
import { MOOD_LABEL } from "@/lib/growth";
import { cn } from "@/lib/utils";
import { saveEntry } from "@/server/actions/journal";

export type Entry = {
  date: Day;
  mood: number | null;
  energy: number | null;
  sleepHours: number | null;
  gratitude: string | null;
  content: string | null;
};

const MOOD_ICONS = [Angry, Frown, Meh, Smile, Laugh];
const long = (d: Day) => formatDate(toDate(d), { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const short = (d: Day) => formatDate(toDate(d), { day: "numeric", month: "short", timeZone: "UTC" });

export function JournalView({
  today,
  date,
  entries,
  insights,
  weekStartsOn,
}: {
  today: Day;
  date: Day;
  entries: Entry[];
  insights: string[];
  weekStartsOn: 0 | 1;
}) {
  const entry = entries.find((e) => e.date === date);
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const memories = [
    { label: "A month ago", date: addDays(date, -30) },
    { label: "A year ago", date: `${Number(date.slice(0, 4)) - 1}${date.slice(4)}` },
  ]
    .map((m) => ({ ...m, entry: byDate.get(m.date) }))
    .filter((m) => m.entry);

  const last30 = eachDay(addDays(today, -29), today);
  const moodLevels: Record<Day, number> = {};
  for (const e of entries) if (e.mood) moodLevels[e.date] = Math.ceil((e.mood * 4) / 5);
  let streak = 0;
  for (let d = byDate.has(today) ? today : addDays(today, -1); byDate.has(d); d = addDays(d, -1)) streak++;

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 md:mb-10">
        <div>
          <h1 className="text-4xl leading-[0.9] font-semibold tracking-tight md:text-7xl">Journal</h1>
          <p className="mt-2 text-sm text-muted md:text-base">{date === today ? "Today, " : ""}{long(date)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/journal?date=${addDays(date, -1)}`} scroll={false} aria-label="Previous day" className="inline-flex size-9 items-center justify-center rounded-full bg-subtle transition-colors hover:bg-foreground hover:text-background">
            <ChevronLeft className="size-4" />
          </Link>
          {date !== today && (
            <Link href="/journal" scroll={false} className="h-9 rounded-full bg-subtle px-4 text-sm leading-9 transition-colors hover:bg-subtle">
              Today
            </Link>
          )}
          {date < today && (
            <Link href={`/journal?date=${addDays(date, 1)}`} scroll={false} aria-label="Next day" className="inline-flex size-9 items-center justify-center rounded-full bg-subtle transition-colors hover:bg-foreground hover:text-background">
              <ChevronRight className="size-4" />
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <EntryEditor key={date} date={date} entry={entry} />
        </div>
        <div className="space-y-4">
          <Card>
            <CardLabel>Journaling streak</CardLabel>
            <p className="mt-3 flex items-baseline gap-1.5">
              <span className="text-4xl font-semibold tracking-tight">{streak}</span>
              <span className="text-sm text-muted">{streak === 1 ? "day" : "days"}</span>
            </p>
            <p className="mt-1 text-xs text-muted">{entries.length} entries in total</p>
          </Card>
          <Card>
            <CardLabel>On this day</CardLabel>
            {memories.length ? (
              <ul className="mt-3 space-y-4">
                {memories.map((m) => (
                  <li key={m.label}>
                    <Link href={`/journal?date=${m.date}`} className="block rounded-xl transition-opacity hover:opacity-70">
                      <p className="text-xs text-muted">
                        {m.label}
                        {m.entry!.mood && ` · ${MOOD_LABEL[m.entry!.mood]}`}
                      </p>
                      <p className="mt-1 line-clamp-3 text-sm">{m.entry!.content || m.entry!.gratitude || "No words, just a check-in."}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">Entries from a month and a year ago will resurface here.</p>
            )}
          </Card>
          <Card>
            <CardLabel>Patterns</CardLabel>
            {insights.length ? (
              <ul className="mt-3 space-y-3 text-sm">
                {insights.map((s) => (
                  <li key={s} className="border-l-2 border-foreground pl-3">
                    {s}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">After a couple of weeks of entries, links between your mood, sleep, workouts and habits show up here.</p>
            )}
          </Card>
        </div>
      </div>

      <Reveal className="mt-4">
        <Card>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
            <CardLabel>Mood over the year</CardLabel>
            <span className="text-[10px] text-muted">Lighter = lower mood · empty = no entry</span>
          </div>
          <Heatmap levels={moodLevels} end={today} weekStartsOn={weekStartsOn} describe={(d) => `${d} · ${byDate.get(d)?.mood ? MOOD_LABEL[byDate.get(d)!.mood!] : "no entry"}`} />
        </Card>
      </Reveal>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Reveal>
          <ChartCard
            title="Mood"
            subtitle="Last 30 days, 1 (awful) to 5 (great)"
            table={{ columns: ["Day", "Mood"], rows: last30.filter((d) => byDate.get(d)?.mood).map((d) => [short(d), MOOD_LABEL[byDate.get(d)!.mood!]]).reverse() }}
          >
            <LineChart
              ariaLabel="Mood over the last 30 days"
              labels={last30.map(short)}
              series={[{ name: "Mood", tone: "fg", values: last30.map((d) => byDate.get(d)?.mood ?? null) }]}
              format={(v) => `${v} · ${MOOD_LABEL[Math.round(v)] ?? ""}`}
              formatAxis={(v) => String(v)}
              height={180}
            />
          </ChartCard>
        </Reveal>
        <Reveal delay={0.05}>
          <ChartCard
            title="Sleep"
            subtitle="Hours, last 30 days"
            table={{ columns: ["Day", "Hours"], rows: last30.filter((d) => byDate.get(d)?.sleepHours != null).map((d) => [short(d), byDate.get(d)!.sleepHours!]).reverse() }}
          >
            <ColumnChart
              ariaLabel="Hours slept over the last 30 days"
              labels={last30.map((d, i) => (i % 5 === 0 || i === 29 ? short(d) : ""))}
              titles={last30.map(short)}
              series={[{ name: "Sleep", tone: "fg", values: last30.map((d) => byDate.get(d)?.sleepHours ?? 0) }]}
              format={(v) => `${v} h`}
              formatAxis={(v) => `${v}h`}
              height={180}
            />
          </ChartCard>
        </Reveal>
      </div>
    </>
  );
}

function EntryEditor({ date, entry }: { date: Day; entry?: Entry }) {
  const [state, setState] = useState({
    mood: entry?.mood ?? null,
    energy: entry?.energy ?? null,
    sleepHours: entry?.sleepHours ?? null,
    gratitude: entry?.gratitude ?? "",
    content: entry?.content ?? "",
  });
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<typeof state | null>(null);

  const flush = async () => {
    timer.current = null;
    const s = pending.current;
    pending.current = null;
    if (!s) return;
    try {
      await saveEntry(date, { ...s, gratitude: s.gratitude || null, content: s.content || null });
      setStatus((x) => (pending.current ? x : "saved"));
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  };
  const update = (patch: Partial<typeof state>, delay = 700) => {
    const next = { ...state, ...patch };
    setState(next);
    pending.current = next;
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, delay);
  };

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (pending.current) void saveEntry(date, { ...pending.current, gratitude: pending.current.gratitude || null, content: pending.current.content || null });
    },
    [date],
  );

  return (
    <Card className="flex h-full flex-col gap-7">
      <div className="flex items-center justify-between">
        <CardLabel>How was the day?</CardLabel>
        <span className="text-xs text-muted" aria-live="polite">
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Couldn’t save" : ""}
        </span>
      </div>

      <div role="radiogroup" aria-label="Mood" className="grid grid-cols-5 gap-2">
        {MOOD_ICONS.map((Icon, i) => {
          const value = i + 1;
          const on = state.mood === value;
          return (
            <motion.button
              key={value}
              type="button"
              role="radio"
              aria-checked={on}
              whileTap={{ scale: 0.9 }}
              onClick={() => update({ mood: on ? null : value }, 200)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-2xl bg-subtle py-3 transition-colors",
                on ? "bg-foreground text-background" : "text-muted hover:bg-foreground/10 hover:text-foreground",
              )}
            >
              <Icon className="size-6" strokeWidth={1.5} />
              <span className="text-[11px]">{MOOD_LABEL[value]}</span>
            </motion.button>
          );
        })}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs text-muted">Energy</p>
          <div role="radiogroup" aria-label="Energy" className="flex h-10 items-end gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={state.energy === n}
                aria-label={`Energy ${n} of 5`}
                onClick={() => update({ energy: state.energy === n ? null : n }, 200)}
                className={cn("flex-1 rounded-md transition-colors", (state.energy ?? 0) >= n ? "bg-foreground" : "bg-hairline hover:bg-muted/40")}
                style={{ height: `${30 + n * 14}%` }}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs text-muted">Sleep</p>
          <div className="flex h-10 items-center gap-2">
            <button type="button" aria-label="Less sleep" onClick={() => update({ sleepHours: Math.max(0, (state.sleepHours ?? 7.5) - 0.5) }, 400)} className="inline-flex size-9 items-center justify-center rounded-full bg-subtle transition-colors hover:bg-foreground hover:text-background">
              <Minus className="size-4" />
            </button>
            <span className="min-w-20 text-center text-xl font-semibold tracking-tight">{state.sleepHours === null ? "—" : `${state.sleepHours} h`}</span>
            <button type="button" aria-label="More sleep" onClick={() => update({ sleepHours: Math.min(24, (state.sleepHours ?? 7) + 0.5) }, 400)} className="inline-flex size-9 items-center justify-center rounded-full bg-subtle transition-colors hover:bg-foreground hover:text-background">
              <Plus className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="gratitude" className="mb-2 block text-xs text-muted">
          Grateful for
        </label>
        <input
          id="gratitude"
          value={state.gratitude}
          onChange={(e) => update({ gratitude: e.target.value })}
          placeholder="Three small good things…"
          className="h-11 w-full rounded-2xl bg-subtle px-4 text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-foreground/15"
        />
      </div>

      <div className="flex flex-1 flex-col">
        <label htmlFor="journal-content" className="mb-2 block text-xs text-muted">
          Notes
        </label>
        <textarea
          id="journal-content"
          value={state.content}
          onChange={(e) => update({ content: e.target.value })}
          placeholder="What happened, what you felt, what you’d do differently…"
          rows={8}
          data-lenis-prevent
          className="w-full flex-1 resize-none rounded-2xl bg-subtle px-4 py-3 text-sm leading-relaxed outline-none placeholder:text-muted focus:ring-2 focus:ring-foreground/15"
        />
      </div>
    </Card>
  );
}
