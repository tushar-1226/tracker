import type { ModuleKey } from "./modules";

/** Each part is 0–1, or null when the module isn't in use (it then doesn't count). */
export type LifeParts = Partial<Record<ModuleKey, number | null>>;

export function lifeScore(parts: LifeParts) {
  const used = Object.values(parts).filter((v): v is number => v !== null && v !== undefined);
  if (!used.length) return null;
  const mean = used.reduce((a, b) => a + Math.min(1, Math.max(0, b)), 0) / used.length;
  return Math.round(mean * 100);
}

/** Workout part: 1 if trained, otherwise how well the week is tracking toward its target. */
export function fitnessPart(trainedToday: boolean, workoutsSoFar: number, dayOfWeekIndex: number, weeklyTarget: number) {
  if (trainedToday) return 1;
  const expected = (weeklyTarget * (dayOfWeekIndex + 1)) / 7;
  return expected <= 0 ? 1 : Math.min(1, workoutsSoFar / expected);
}

/** Budget part: 1 when within the day's share of the monthly limit, falling to 0 at double. */
export function budgetPart(spent: number, dailyBudget: number) {
  if (dailyBudget <= 0) return null;
  if (spent <= dailyBudget) return 1;
  return Math.max(0, 1 - (spent - dailyBudget) / dailyBudget);
}
