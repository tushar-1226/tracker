"use client";

import { useMemo, useOptimistic, useSyncExternalStore, useTransition } from "react";
import { enqueue, getOutbox, getServerOutbox, isOffline, subscribeOutbox } from "@/lib/offline/outbox";
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
  // Check-ins made offline are shown straight away and sync later (see OutboxSync).
  const queued = useSyncExternalStore(subscribeOutbox, getOutbox, getServerOutbox);
  const withQueued = useMemo(
    () => queued.reduce((acc, i) => (i.kind === "habit" ? applyChange(acc, { habitId: i.habitId, date: i.date, value: i.value }) : acc), habits),
    [habits, queued],
  );
  const [optimistic, apply] = useOptimistic(withQueued, applyChange);
  const [, startTransition] = useTransition();

  const setValue = (habitId: string, date: Day, value: number) => {
    startTransition(async () => {
      apply({ habitId, date, value });
      if (!navigator.onLine) return void enqueue({ kind: "habit", habitId, date, value });
      try {
        await setHabitValue(habitId, date, value);
      } catch (e) {
        if (isOffline(e)) return void enqueue({ kind: "habit", habitId, date, value });
        // The optimistic value rolls back automatically when the transition ends.
        console.error(e);
      }
    });
  };

  return { habits: optimistic, setValue };
}
