"use client";

import { ArrowUpRight, Plus } from "lucide-react";
import Link from "next/link";
import { Card, CardLabel } from "@/components/ui/card";
import type { Day } from "@/lib/dates";
import { countsToward, dayCompletion, isDone } from "@/lib/habits/stats";
import { type HabitView, logMap, targetLabel } from "@/lib/habits/view";
import { cn } from "@/lib/utils";
import { HabitControl } from "./habit-control";
import { HabitIcon } from "./icons";
import { useHabitLogs } from "./use-habit-logs";

/** Dashboard card: today's habits with one-tap check-ins. */
export function TodayHabits({ habits: serverHabits, today }: { habits: HabitView[]; today: Day }) {
  const { habits, setValue } = useHabitLogs(serverHabits);
  const items = habits.map((h) => ({ habit: h, logs: logMap(h) }));
  const tally = dayCompletion(items, today);
  // Due today first, then the rest (weekly targets / off days).
  const list = [...items].sort(
    (a, b) => Number(countsToward(b.habit, b.logs, today)) - Number(countsToward(a.habit, a.logs, today)),
  );

  return (
    <Card className="h-full">
      <div className="mb-4 flex items-center justify-between">
        <CardLabel>Today’s habits</CardLabel>
        <Link
          href="/habits"
          className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-foreground"
        >
          {tally.done}/{tally.due} done <ArrowUpRight className="size-3.5" />
        </Link>
      </div>

      {habits.length === 0 ? (
        <Link
          href="/habits?new=1"
          className="flex h-32 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed text-sm text-muted transition-colors hover:bg-subtle hover:text-foreground"
        >
          <Plus className="size-5" />
          Add your first habit
        </Link>
      ) : (
        <ul className="-mx-2 max-h-80 overflow-y-auto" data-lenis-prevent>
          {list.map(({ habit }) => {
            const done = isDone(habit, habit.logs[today]);
            const target = targetLabel(habit);
            return (
              <li key={habit.id} className="flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-subtle">
                <HabitIcon name={habit.icon} className="text-muted" />
                <Link href={`/habits/${habit.id}`} className="min-w-0 flex-1">
                  <p className={cn("truncate text-sm transition-colors", done && habit.type !== "quit" && "text-muted line-through decoration-foreground/40")}>
                    {habit.name}
                  </p>
                  {target && <p className="text-xs text-muted">{target}</p>}
                </Link>
                <HabitControl habit={habit} value={habit.logs[today]} onChange={(v) => setValue(habit.id, today, v)} />
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
