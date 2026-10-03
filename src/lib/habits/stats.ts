import { type Day, addDays, dayOfWeek, diffDays, eachDay, startOfWeek } from "@/lib/dates";

export type HabitType = "check" | "count" | "duration" | "quit";

export type Frequency =
  | { kind: "daily" }
  | { kind: "weekdays"; days: number[] } // 0 = Sunday … 6 = Saturday
  | { kind: "weekly"; times: number };

export type HabitLike = {
  type: HabitType;
  target: number;
  frequency: Frequency;
  startDate: Day;
};

/** date → logged value. For "quit" habits a log marks a slip. */
export type LogMap = Map<Day, number>;

export type HabitStats = {
  current: number;
  best: number;
  unit: "days" | "weeks";
  /** 0–1 completion over the last 30 days */
  rate30: number;
  totalDone: number;
  /** Streak freezes banked right now. */
  freezes: number;
  /** Missed days that a freeze covered. */
  frozenDays: Day[];
};

/** Every 7 days in a row earns a freeze; at most 2 are banked. */
export const FREEZE_EVERY = 7;
export const FREEZE_MAX = 2;

/** Logs dated before the start date (backfilled) move the effective start earlier. */
export function effectiveStart(habit: HabitLike, logs: LogMap): Day {
  let start = habit.startDate;
  for (const day of logs.keys()) if (day < start) start = day;
  return start;
}

export function isDue(habit: HabitLike, day: Day) {
  const f = habit.frequency;
  if (f.kind === "weekdays") return f.days.includes(dayOfWeek(day));
  return true;
}

export function isDone(habit: HabitLike, value: number | undefined) {
  if (habit.type === "quit") return !value;
  return (value ?? 0) >= Math.max(1, habit.target);
}

/** Heatmap intensity 0–4. */
export function dayLevel(habit: HabitLike, value: number | undefined): number {
  if (habit.type === "quit") return value ? 0 : 4;
  if (!value) return 0;
  const ratio = value / Math.max(1, habit.target);
  return ratio >= 1 ? 4 : ratio >= 0.66 ? 3 : ratio >= 0.33 ? 2 : 1;
}

export function computeStats(
  habit: HabitLike,
  logs: LogMap,
  today: Day,
  weekStartsOn: 0 | 1 = 1,
): HabitStats {
  const start = effectiveStart(habit, logs);
  if (start > today) return { current: 0, best: 0, unit: "days", rate30: 0, totalDone: 0, freezes: 0, frozenDays: [] };

  if (habit.type === "quit") return quitStats(logs, start, today);
  if (habit.frequency.kind === "weekly") {
    return weeklyStats(habit, habit.frequency.times, logs, start, today, weekStartsOn);
  }

  let run = 0;
  let best = 0;
  let totalDone = 0;
  let freezes = 0;
  const frozenDays: Day[] = [];
  for (const day of eachDay(start, today)) {
    const done = isDone(habit, logs.get(day));
    if (done) totalDone++;
    if (!isDue(habit, day)) {
      // Doing it on an off day still counts as a bonus, but never breaks a streak.
      continue;
    }
    if (done) {
      run++;
      if (run % FREEZE_EVERY === 0) freezes = Math.min(FREEZE_MAX, freezes + 1);
    } else if (day !== today) {
      // today isn't over yet; a past miss spends a freeze if one is banked
      if (freezes > 0 && run > 0) {
        freezes--;
        frozenDays.push(day);
      } else {
        run = 0;
        freezes = 0;
      }
    }
    best = Math.max(best, run);
  }

  const windowStart = maxDay(start, addDays(today, -29));
  let due = 0;
  let doneDue = 0;
  for (const day of eachDay(windowStart, today)) {
    if (!isDue(habit, day)) continue;
    const done = isDone(habit, logs.get(day));
    if (day === today && !done) continue;
    due++;
    if (done) doneDue++;
  }

  return { current: run, best, unit: "days", rate30: due ? doneDue / due : 0, totalDone, freezes, frozenDays };
}

function weeklyStats(
  habit: HabitLike,
  times: number,
  logs: LogMap,
  start: Day,
  today: Day,
  weekStartsOn: 0 | 1,
): HabitStats {
  const target = Math.max(1, times);
  const thisWeek = startOfWeek(today, weekStartsOn);
  let run = 0;
  let best = 0;
  let totalDone = 0;

  for (let week = startOfWeek(start, weekStartsOn); week <= thisWeek; week = addDays(week, 7)) {
    let count = 0;
    for (const day of eachDay(week, addDays(week, 6))) {
      if (day < start || day > today) continue;
      if (isDone(habit, logs.get(day))) count++;
    }
    totalDone += count;
    if (count >= target) run++;
    else if (week !== thisWeek) run = 0;
    best = Math.max(best, run);
  }

  const windowStart = maxDay(start, addDays(today, -29));
  let done = 0;
  for (const day of eachDay(windowStart, today)) if (isDone(habit, logs.get(day))) done++;
  const expected = (target * (diffDays(windowStart, today) + 1)) / 7;

  return { current: run, best, unit: "weeks", rate30: Math.min(1, done / expected), totalDone, freezes: 0, frozenDays: [] };
}

function quitStats(logs: LogMap, start: Day, today: Day): HabitStats {
  const slips = [...logs.entries()]
    .filter(([day, v]) => v && day >= start && day <= today)
    .map(([day]) => day)
    .sort();

  // Treat the day before the start as a virtual slip so the first day counts as day 1.
  const anchors = [addDays(start, -1), ...slips];
  let best = 0;
  for (let i = 1; i < anchors.length; i++) best = Math.max(best, diffDays(anchors[i - 1], anchors[i]) - 1);
  const current = diffDays(anchors[anchors.length - 1], today);
  best = Math.max(best, current);

  const windowStart = maxDay(start, addDays(today, -29));
  const windowDays = diffDays(windowStart, today) + 1;
  const windowSlips = slips.filter((d) => d >= windowStart).length;
  const totalDays = diffDays(start, today) + 1;

  return {
    current,
    best,
    unit: "days",
    rate30: (windowDays - windowSlips) / windowDays,
    totalDone: totalDays - slips.length,
    freezes: 0,
    frozenDays: [],
  };
}

/**
 * Whether a habit counts toward a day's tally (life score, week strip).
 * Weekly-target habits have no fixed days, so they only count on days they were done.
 */
export function countsToward(habit: HabitLike, logs: LogMap, day: Day) {
  if (day < effectiveStart(habit, logs)) return false;
  if (habit.frequency.kind === "weekly") return isDone(habit, logs.get(day));
  return isDue(habit, day);
}

/** Share of the day's habits that are done (null when nothing was due). */
export function dayCompletion(items: { habit: HabitLike; logs: LogMap }[], day: Day) {
  let due = 0;
  let done = 0;
  for (const { habit, logs } of items) {
    if (!countsToward(habit, logs, day)) continue;
    due++;
    if (isDone(habit, logs.get(day))) done++;
  }
  return { due, done, ratio: due ? done / due : null };
}

function maxDay(a: Day, b: Day) {
  return a > b ? a : b;
}
