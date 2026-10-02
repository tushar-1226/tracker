import { type Day, addDays, diffDays } from "@/lib/dates";

// ---------- Learning ----------

/** 15 XP per 25-minute block, proportional, capped per session. */
export const studyXp = (minutes: number) => Math.min(120, Math.round(Math.max(0, minutes) * 0.6));

export const HOUR_MILESTONES = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

export function nextMilestone(hours: number) {
  const next = HOUR_MILESTONES.find((m) => m > hours) ?? Math.ceil(hours / 10000 + 1) * 10000;
  const prevIdx = HOUR_MILESTONES.indexOf(next) - 1;
  const prev = prevIdx >= 0 ? HOUR_MILESTONES[prevIdx] : 0;
  return { next, prev, progress: (hours - prev) / (next - prev) };
}

/** Consecutive days with activity, ending today (or yesterday if today has none yet). */
export function dayStreak(days: Iterable<Day>, today: Day) {
  const set = new Set(days);
  let d = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

// ---------- Books ----------

/** Books ahead (+) or behind (−) the even pace needed to hit a yearly goal. */
export function readingPace(goal: number, finished: number, today: Day) {
  const year = today.slice(0, 4);
  const dayOfYear = diffDays(`${year}-01-01`, today) + 1;
  const daysInYear = diffDays(`${year}-01-01`, `${Number(year) + 1}-01-01`);
  const expected = (goal * dayOfYear) / daysInYear;
  return { expected, delta: finished - expected };
}

/** Days to finish at the recent reading pace (avg pages per day over the last 14 days). */
export function bookEta(pagesLeft: number, logs: { date: Day; pages: number }[], today: Day) {
  if (pagesLeft <= 0) return 0;
  const since = addDays(today, -13);
  const recent = logs.filter((l) => l.date >= since && l.date <= today).reduce((s, l) => s + l.pages, 0);
  const perDay = recent / 14;
  return perDay > 0 ? Math.ceil(pagesLeft / perDay) : null;
}

// ---------- Journal ----------

export const MOOD_LABEL = ["", "Awful", "Low", "Okay", "Good", "Great"] as const;

/** Mean of a numeric field for entries whose date is (or isn't) in `days`. */
export function compareByDays<T extends { date: Day }>(entries: T[], days: Set<Day>, pick: (e: T) => number | null) {
  const inside: number[] = [];
  const outside: number[] = [];
  for (const e of entries) {
    const v = pick(e);
    if (v === null) continue;
    (days.has(e.date) ? inside : outside).push(v);
  }
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  return { with: mean(inside), without: mean(outside), n: [inside.length, outside.length] as const };
}
