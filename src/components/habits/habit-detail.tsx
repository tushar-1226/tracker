"use client";

import { Archive, ArchiveRestore, ArrowLeft, LoaderCircle, Pencil, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Heatmap, HeatmapLegend } from "@/components/charts/heatmap";
import { NumberTicker } from "@/components/motion/number-ticker";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Card, CardLabel } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { type Day, addDays, eachDay, toDate } from "@/lib/dates";
import { computeStats, dayLevel, effectiveStart, isDone, isDue } from "@/lib/habits/stats";
import { type HabitView, HABIT_TYPE_LABEL, frequencyLabel, logMap, targetLabel, unitLabel } from "@/lib/habits/view";
import { cn } from "@/lib/utils";
import { deleteHabit, setHabitArchived } from "@/server/actions/habits";
import { HabitControl } from "./habit-control";
import { HabitForm } from "./habit-form";
import { HabitIcon } from "./icons";
import { HabitReminder } from "./habit-reminder";
import type { ReminderView } from "@/components/settings/reminders-card";
import { useHabitLogs } from "./use-habit-logs";

export function HabitDetail({
  habit: serverHabit,
  archived,
  today,
  weekStartsOn,
  reminder,
}: {
  habit: HabitView;
  archived: boolean;
  today: Day;
  weekStartsOn: 0 | 1;
  reminder: ReminderView | null;
}) {
  const { habits, setValue } = useHabitLogs([serverHabit]);
  const habit = habits[0];
  const logs = logMap(habit);
  const stats = computeStats(habit, logs, today, weekStartsOn);
  const start = effectiveStart(habit, logs);
  const [editKey, setEditKey] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const levels: Record<Day, number> = {};
  for (const day of eachDay(addDays(today, -7 * 53), today)) {
    if (day < start) continue;
    const l = dayLevel(habit, habit.logs[day]);
    if (l) levels[day] = l;
  }

  const target = targetLabel(habit);
  const isQuit = habit.type === "quit";

  return (
    <>
      <Reveal>
        <Link
          href="/habits"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Habits
        </Link>
      </Reveal>

      <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-foreground text-background md:size-16">
            <HabitIcon name={habit.icon} className="size-6" />
          </div>
          <div>
            <h1 className="text-4xl leading-[0.9] font-bold tracking-[-0.045em] md:text-7xl">{habit.name}</h1>
            <p className="mt-1.5 text-sm text-muted">
              {HABIT_TYPE_LABEL[habit.type]} · {frequencyLabel(habit.frequency)}
              {target && ` · ${target}`}
              {archived && " · Archived"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => setEditKey((k) => k + 1)}>
                <Pencil /> Edit
              </Button>
            </DialogTrigger>
            <HabitForm key={editKey} draft={serverHabit} onDone={() => setEditOpen(false)} />
          </Dialog>
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => startTransition(() => setHabitArchived(habit.id, !archived))}
          >
            {archived ? <ArchiveRestore /> : <Archive />}
            {archived ? "Restore" : "Archive"}
          </Button>
          <DeleteButton id={habit.id} name={habit.name} />
        </div>
      </Reveal>

      <Stagger className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StaggerItem className="col-span-2 md:col-span-1 md:row-span-2">
          <Card className="flex h-full flex-col items-center justify-center gap-5 py-8 text-center">
            <CardLabel>Today</CardLabel>
            <HabitControl habit={habit} value={habit.logs[today]} onChange={(v) => setValue(habit.id, today, v)} size="lg" />
            <p className="text-sm text-muted">
              {isQuit
                ? habit.logs[today]
                  ? "Slipped today. Tomorrow is a fresh start."
                  : "Clean so far today."
                : isDone(habit, habit.logs[today])
                  ? "Done. Nice."
                  : isDue(habit, today)
                    ? "Not done yet."
                    : "Off day — a bonus if you do it."}
            </p>
          </Card>
        </StaggerItem>
        <Stat label={isQuit ? "Days clean" : "Current streak"} value={stats.current} unit={stats.unit} />
        <Stat label="Best streak" value={stats.best} unit={stats.unit} />
        <Stat label="Last 30 days" value={Math.round(stats.rate30 * 100)} unit="%" />
        <Stat label={isQuit ? "Clean days total" : "Times done"} value={stats.totalDone} unit="total" />
        {!isQuit && habit.frequency.kind !== "weekly" && (
          <StaggerItem className="col-span-2 md:col-span-1">
            <Card className="flex h-full flex-col justify-between gap-4">
              <CardLabel>Streak freezes</CardLabel>
              <p className="flex items-baseline gap-1.5">
                <span className="tabular text-4xl font-medium">{stats.freezes}</span>
                <span className="text-sm text-muted">of 2 banked</span>
              </p>
              <p className="text-xs text-muted">
                {stats.frozenDays.length
                  ? `Saved your streak on ${stats.frozenDays.slice(-2).map((d) => toDate(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })).join(", ")}`
                  : "Earn one every 7 days in a row. A missed day spends it instead of breaking the streak."}
              </p>
            </Card>
          </StaggerItem>
        )}
        {!isQuit && (
          <StaggerItem className="col-span-2 md:col-span-1">
            <HabitReminder habit={{ id: habit.id, name: habit.name }} reminder={reminder} />
          </StaggerItem>
        )}
        <StaggerItem className="col-span-2 md:col-span-4">
          <MonthlyBars habit={habit} today={today} />
        </StaggerItem>
      </Stagger>

      <Reveal className="mt-4">
        <Card>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
            <div>
              <CardLabel>Last 12 months</CardLabel>
              <p className="mt-1 text-sm text-muted">
                Since {toDate(start).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
              </p>
            </div>
            <HeatmapLegend />
          </div>
          <Heatmap
            levels={levels}
            end={today}
            start={start}
            weekStartsOn={weekStartsOn}
            describe={(day) => {
              const v = habit.logs[day];
              if (isQuit) return `${day} · ${v ? "slipped" : "clean"}`;
              if (habit.type === "check") return `${day} · ${v ? "done" : "—"}`;
              return `${day} · ${v ?? 0} / ${habit.target} ${habit.unit ?? ""}`;
            }}
          />
        </Card>
      </Reveal>
    </>
  );
}

function Stat({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <StaggerItem>
      <Card className="flex h-full flex-col justify-between gap-6">
        <CardLabel>{label}</CardLabel>
        <p className="flex items-baseline gap-1.5">
          <NumberTicker value={value} className="tabular text-4xl font-medium" />
          <span className="text-sm text-muted">{unitLabel(value, unit)}</span>
        </p>
      </Card>
    </StaggerItem>
  );
}

/** Completion rate for each of the last 6 calendar months. */
function MonthlyBars({ habit, today }: { habit: HabitView; today: Day }) {
  const logs = logMap(habit);
  const start = effectiveStart(habit, logs);
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = toDate(today);
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - (5 - i));
    const first = d.toISOString().slice(0, 10);
    d.setUTCMonth(d.getUTCMonth() + 1);
    d.setUTCDate(0);
    const last = d.toISOString().slice(0, 10);
    let due = 0;
    let done = 0;
    for (const day of eachDay(first, last)) {
      if (day < start || day > today) continue;
      const ok = isDone(habit, logs.get(day));
      if (habit.frequency.kind === "weekdays" && !isDue(habit, day)) continue;
      if (day === today && !ok) continue;
      due++;
      if (ok) done++;
    }
    const label = toDate(first).toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" });
    return { label, ratio: due ? done / due : null };
  });

  return (
    <Card className="h-full">
      <CardLabel>Monthly completion</CardLabel>
      <div className="mt-5 flex h-28 items-end gap-3">
        {months.map((m, i) => (
          <div key={m.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <div
              className={cn(
                "relative w-full flex-1 overflow-hidden rounded-lg",
                m.ratio === null ? "border border-dashed" : "bg-hairline",
              )}
            >
              <motion.div
                className="absolute inset-x-0 bottom-0 rounded-lg bg-foreground"
                initial={{ height: 0 }}
                whileInView={{ height: `${(m.ratio ?? 0) * 100}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: i * 0.05 }}
              />
            </div>
            <span className="text-[10px] text-muted">{m.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function DeleteButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Delete habit">
          <Trash2 />
        </Button>
      </DialogTrigger>
      <DialogContent title={`Delete “${name}”?`} description="Its full history and the XP it earned will be removed. Archive it instead to keep the history.">
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button disabled={pending} onClick={() => startTransition(() => deleteHabit(id))}>
            {pending ? <LoaderCircle className="animate-spin" /> : "Delete forever"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
