"use client";

import { useOptimistic, useTransition } from "react";
import type { Day } from "@/lib/dates";
import type { HabitView } from "@/lib/habits/view";
import { setHabitValue } from "@/server/actions/habits";

type Change = { habitId: string; date: Day; value: number };

function applyChange(habits: HabitView[], c: Change): HabitView[] {
  return habits.map((h) => {
    if (h.id !== c.habitId) return h;
    const logs = { ...h.logs };
    if (c.value > 0) logs[c.date] = c.value;
    else delete logs[c.date];
    return { ...h, logs };
  });
}

/** Habit logs with instant optimistic updates; the server result replaces them on refresh. */
export function useHabitLogs(habits: HabitView[]) {
  const [optimistic, apply] = useOptimistic(habits, applyChange);
  const [, startTransition] = useTransition();

  const setValue = (habitId: string, date: Day, value: number) => {
    startTransition(async () => {
      apply({ habitId, date, value });
      try {
        await setHabitValue(habitId, date, value);
      } catch (e) {
        // The optimistic value rolls back automatically when the transition ends.
        console.error(e);
      }
    });
  };

  return { habits: optimistic, setValue };
}
