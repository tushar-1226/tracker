/** What a goal measures. `manual` goals progress through milestones only. */
export type GoalMetric =
  | { type: "manual" }
  | { type: "habit_streak"; habitId: string }
  | { type: "exercise_1rm"; exerciseId: string }
  | { type: "body_weight" }
  | { type: "study_hours"; skillId: string }
  | { type: "books_year" }
  | { type: "savings_goal"; goalId: string }
  | { type: "net_worth" };

export const METRIC_LABEL: Record<GoalMetric["type"], string> = {
  manual: "Milestones",
  habit_streak: "Habit streak",
  exercise_1rm: "Lift (est. 1-rep max)",
  body_weight: "Body weight",
  study_hours: "Study hours",
  books_year: "Books this year",
  savings_goal: "Savings goal",
  net_worth: "Net worth",
};

/**
 * 0–1 progress toward a target. Goals whose target is below the starting value
 * (e.g. losing weight) measure the distance covered from the baseline.
 */
export function goalProgress(current: number | null, target: number, baseline: number | null) {
  if (current === null) return 0;
  if (baseline !== null && target < baseline) {
    const span = baseline - target;
    return span <= 0 ? 1 : Math.min(1, Math.max(0, (baseline - current) / span));
  }
  return target <= 0 ? 1 : Math.min(1, Math.max(0, current / target));
}
