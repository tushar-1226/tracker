"use client";

import { ArchiveRestore, ChevronDown, Flame, GripVertical, Plus, Snowflake } from "lucide-react";
import { AnimatePresence, Reorder, motion, useDragControls } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Heatmap, HeatmapLegend } from "@/components/charts/heatmap";
import { Magnetic } from "@/components/motion/magnetic";
import { PageHeader } from "@/components/module/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardLabel } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { type Day, addDays, eachDay, toDate, formatDate } from "@/lib/dates";
import { computeStats, dayCompletion, effectiveStart, isDone, isDue } from "@/lib/habits/stats";
import { type HabitView, frequencyLabel, logMap, targetLabel, unitLabel } from "@/lib/habits/view";
import { cn } from "@/lib/utils";
import { reorderHabits, setHabitArchived } from "@/server/actions/habits";
import { HabitControl } from "./habit-control";
import { HABIT_TEMPLATES, type HabitDraft, HabitForm } from "./habit-form";
import { HabitIcon } from "./icons";
import { useHabitLogs } from "./use-habit-logs";
import { WeekStrip } from "./week-strip";

export function HabitsBoard({
  habits: serverHabits,
  archived,
  today,
  weekStartsOn,
  openNew,
}: {
  habits: HabitView[];
  archived: { id: string; name: string; icon: string }[];
  today: Day;
  weekStartsOn: 0 | 1;
  openNew: boolean;
}) {
  const router = useRouter();
  const { habits, setValue } = useHabitLogs(serverHabits);
  const [selected, setSelected] = useState<Day>(today);
  const [form, setForm] = useState<{ open: boolean; draft?: HabitDraft; key: number }>({ open: openNew, key: 0 });

  // Local order while dragging; resets when the server list changes.
  const serverIds = serverHabits.map((h) => h.id).join();
  const [order, setOrder] = useState({ ids: serverHabits.map((h) => h.id), from: serverIds });
  if (order.from !== serverIds) setOrder({ ids: serverHabits.map((h) => h.id), from: serverIds });
  const latestOrder = useRef<string[] | null>(null);
  const byId = new Map(habits.map((h) => [h.id, h]));
  const ordered = order.ids.map((id) => byId.get(id)).filter((h): h is HabitView => !!h);

  const items = habits.map((h) => ({ habit: h, logs: logMap(h) }));
  const completion = (day: Day) => dayCompletion(items, day).ratio;
  const selectedTally = dayCompletion(items, selected);

  const openForm = (draft?: HabitDraft) => setForm((f) => ({ open: true, draft, key: f.key + 1 }));
  const onFormOpenChange = (open: boolean) => {
    setForm((f) => ({ ...f, open }));
    if (!open && openNew) router.replace("/habits", { scroll: false });
  };

  return (
    <Dialog open={form.open} onOpenChange={onFormOpenChange}>
      <PageHeader
        title="Habits"
        description="Build streaks, one day at a time."
        actions={
          <Magnetic>
            <Button onClick={() => openForm()} data-cursor-label="New">
              <Plus /> New habit
            </Button>
          </Magnetic>
        }
      />

      {habits.length === 0 ? (
        <EmptyState onPick={openForm} />
      ) : (
        <div className="space-y-6">
          <Card className="p-4 md:p-5">
            <div className="mb-4 flex items-baseline justify-between px-1">
              <CardLabel>{selected === today ? "Today" : formatDate(toDate(selected), { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" })}</CardLabel>
              <p className="text-sm text-muted">
                <span className="tabular text-foreground">{selectedTally.done}</span> of{" "}
                <span className="tabular">{selectedTally.due}</span> done
              </p>
            </div>
            <WeekStrip today={today} selected={selected} onSelect={setSelected} completion={completion} />
          </Card>

          <Reorder.Group
            axis="y"
            values={order.ids}
            onReorder={(ids) => {
              latestOrder.current = ids;
              setOrder((o) => ({ ...o, ids }));
            }}
            className="space-y-2"
          >
            <AnimatePresence initial={false}>
              {ordered.map((habit) => (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  day={selected}
                  today={today}
                  weekStartsOn={weekStartsOn}
                  onChange={(v) => setValue(habit.id, selected, v)}
                  onDragEnd={() => {
                    const ids = latestOrder.current;
                    latestOrder.current = null;
                    if (ids && ids.join() !== serverIds) reorderHabits(ids);
                  }}
                />
              ))}
            </AnimatePresence>
          </Reorder.Group>

          <ConsistencyCard items={items} today={today} weekStartsOn={weekStartsOn} />
        </div>
      )}

      {archived.length > 0 && <ArchivedList archived={archived} />}

      <HabitForm key={form.key} draft={form.draft} onDone={() => onFormOpenChange(false)} />
    </Dialog>
  );
}

function HabitRow({
  habit,
  day,
  today,
  weekStartsOn,
  onChange,
  onDragEnd,
}: {
  habit: HabitView;
  day: Day;
  today: Day;
  weekStartsOn: 0 | 1;
  onChange: (value: number) => void;
  onDragEnd: () => void;
}) {
  const controls = useDragControls();
  const logs = logMap(habit);
  const stats = computeStats(habit, logs, today, weekStartsOn);
  const value = habit.logs[day];
  const done = isDone(habit, value);
  const offDay = !isDue(habit, day);
  const target = targetLabel(habit);
  const last7 = eachDay(addDays(today, -6), today);

  return (
    <Reorder.Item
      value={habit.id}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      whileDrag={{ scale: 1.02, boxShadow: "0 12px 40px -12px rgb(0 0 0 / 0.25)" }}
      className="group relative flex items-center gap-3 rounded-3xl bg-surface py-3 pr-3 pl-1.5 md:gap-4 md:pr-4"
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        onPointerDown={(e) => controls.start(e)}
        className="flex h-10 w-6 shrink-0 cursor-grab touch-none items-center justify-center text-muted opacity-40 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </button>

      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full bg-subtle transition-colors duration-300",
          done && habit.type !== "quit" ? "bg-foreground text-background" : "bg-subtle",
        )}
      >
        <HabitIcon name={habit.icon} />
      </div>

      <Link href={`/habits/${habit.id}`} data-cursor-label="View" className="min-w-0 flex-1">
        <p className={cn("truncate font-medium transition-opacity", offDay && !done && "opacity-50")}>{habit.name}</p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted">
          <Flame className="size-3 shrink-0" />
          <span className="tabular text-foreground">{stats.current}</span>
          {unitLabel(stats.current, stats.unit)}
          {habit.type === "quit" && " clean"}
          {stats.freezes > 0 && (
            <span className="inline-flex items-center gap-0.5" title={`${stats.freezes} streak freeze${stats.freezes === 1 ? "" : "s"} banked`}>
              <Snowflake className="size-3" />
              {stats.freezes}
            </span>
          )}
          <span aria-hidden>·</span>
          {offDay ? "Off day" : frequencyLabel(habit.frequency)}
          {target && (
            <>
              <span aria-hidden>·</span>
              {target}
            </>
          )}
        </p>
      </Link>

      <div className="hidden items-center gap-1 md:flex" aria-hidden>
        {last7.map((d) => {
          const v = habit.logs[d];
          const started = d >= effectiveStart(habit, logs);
          const due = started && isDue(habit, d);
          const ok = started && isDone(habit, v);
          return (
            <span
              key={d}
              title={d}
              className={cn(
                "size-2 rounded-full transition-colors",
                ok ? "bg-foreground" : due ? "bg-subtle/30" : "bg-hairline",
                d === day && "ring-1 ring-foreground ring-offset-2 ring-offset-surface",
              )}
            />
          );
        })}
      </div>

      <HabitControl habit={habit} value={value} onChange={onChange} />
    </Reorder.Item>
  );
}

function ConsistencyCard({
  items,
  today,
  weekStartsOn,
}: {
  items: { habit: HabitView; logs: Map<Day, number> }[];
  today: Day;
  weekStartsOn: 0 | 1;
}) {
  const start = items.reduce((min, i) => {
    const s = effectiveStart(i.habit, i.logs);
    return s < min ? s : min;
  }, today);
  const levels: Record<Day, number> = {};
  for (const day of eachDay(addDays(today, -7 * 26), today)) {
    const r = dayCompletion(items, day).ratio;
    if (r) levels[day] = r >= 1 ? 4 : r >= 0.66 ? 3 : r >= 0.33 ? 2 : 1;
  }
  const perfectDays = Object.values(levels).filter((l) => l === 4).length;

  return (
    <Card>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <CardLabel>Consistency</CardLabel>
          <p className="mt-1 text-sm text-muted">
            <span className="tabular text-foreground">{perfectDays}</span> perfect days in the last 6 months
          </p>
        </div>
        <HeatmapLegend />
      </div>
      <Heatmap
        levels={levels}
        end={today}
        start={start}
        weeks={27}
        weekStartsOn={weekStartsOn}
        describe={(day) => {
          const t = dayCompletion(items, day);
          return `${day} · ${t.done}/${t.due} done`;
        }}
      />
    </Card>
  );
}

function EmptyState({ onPick }: { onPick: (draft?: HabitDraft) => void }) {
  return (
    <div className="flex flex-col items-center rounded-3xl bg-foreground/[0.035] px-6 py-16 text-center">
      <p className="text-lg font-medium">No habits yet.</p>
      <p className="mt-1 max-w-sm text-sm text-muted">Start with one. Pick a template or create your own.</p>
      <div className="mt-8 flex max-w-lg flex-wrap justify-center gap-2">
        {HABIT_TEMPLATES.map((t) => (
          <motion.button
            key={t.name}
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onPick(t)}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-subtle px-4 text-sm transition-colors hover:bg-subtle"
          >
            <HabitIcon name={t.icon!} />
            {t.name}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function ArchivedList({ archived }: { archived: { id: string; name: string; icon: string }[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <div className="mt-10">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ChevronDown className={cn("size-4 transition-transform duration-300", open && "rotate-180")} />
        Archived ({archived.length})
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            {archived.map((h) => (
              <li key={h.id} className="mt-2 flex items-center gap-3 rounded-2xl bg-foreground/[0.035] px-4 py-3">
                <HabitIcon name={h.icon} className="text-muted" />
                <Link href={`/habits/${h.id}`} className="flex-1 truncate text-sm">
                  {h.name}
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => startTransition(() => setHabitArchived(h.id, false))}
                >
                  <ArchiveRestore /> Restore
                </Button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

