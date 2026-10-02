import { type Day, addDays, startOfWeek } from "@/lib/dates";

export type Muscle =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "legs"
  | "glutes"
  | "core"
  | "full_body"
  | "cardio";

/**
 * strength: weight × reps · bodyweight: reps (optional added weight)
 * cardio: distance + time · timed: time only (planks, holds)
 */
export type ExerciseKind = "strength" | "bodyweight" | "cardio" | "timed";
export type Units = "kg" | "lb";

export const MUSCLE_LABEL: Record<Muscle, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  legs: "Legs",
  glutes: "Glutes",
  core: "Core",
  full_body: "Full body",
  cardio: "Cardio",
};

export type SetLike = {
  id?: string;
  reps: number | null;
  weight: number | null;
  distance: number | null;
  durationSec: number | null;
  done: boolean;
};

// ---------- Units ----------

const LB_PER_KG = 2.20462;

export const toDisplayWeight = (kg: number, units: Units) =>
  units === "lb" ? Math.round(kg * LB_PER_KG * 10) / 10 : Math.round(kg * 100) / 100;

export const fromDisplayWeight = (value: number, units: Units) => (units === "lb" ? value / LB_PER_KG : value);

export function formatWeight(kg: number, units: Units) {
  const v = toDisplayWeight(kg, units);
  return `${Number.isInteger(v) ? v : v.toFixed(1)} ${units}`;
}

export function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return m ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}

// ---------- Set maths ----------

/** Estimated one-rep max (Epley). Only meaningful up to ~12 reps. */
export function e1rm(weight: number, reps: number) {
  if (reps <= 0 || weight <= 0) return 0;
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

/** Whether a set has enough data to count. */
export function isComplete(kind: ExerciseKind, s: SetLike) {
  if (!s.done) return false;
  if (kind === "strength") return (s.reps ?? 0) > 0 && (s.weight ?? 0) > 0;
  if (kind === "bodyweight") return (s.reps ?? 0) > 0;
  if (kind === "cardio") return (s.distance ?? 0) > 0 || (s.durationSec ?? 0) > 0;
  return (s.durationSec ?? 0) > 0;
}

/** kg moved (weight × reps). Bodyweight sets count only their added weight. */
export function setVolume(s: SetLike) {
  return (s.weight ?? 0) * (s.reps ?? 0);
}

/** The single number that ranks a set for PR purposes. */
export function setScore(kind: ExerciseKind, s: SetLike) {
  if (kind === "strength") return e1rm(s.weight ?? 0, s.reps ?? 0);
  if (kind === "bodyweight") return (s.reps ?? 0) + (s.weight ?? 0) / 2.5; // added load beats an extra rep
  if (kind === "cardio") return s.distance ?? 0;
  return s.durationSec ?? 0;
}

export type DatedSet = SetLike & { id: string; date: Day; workoutId: string };

export type ExerciseRecords = {
  best: DatedSet | null;
  heaviest: number;
  mostReps: number;
  bestE1rm: number;
  longest: number;
};

/**
 * Walks sets chronologically and returns the ids of sets that beat every
 * earlier set of the same exercise, plus the exercise's all-time records.
 * The very first logged set is not a PR (there is nothing to beat yet).
 */
export function findPRs(kind: ExerciseKind, sets: DatedSet[]) {
  const ordered = [...sets].filter((s) => isComplete(kind, s)).sort((a, b) => a.date.localeCompare(b.date));
  const prIds = new Set<string>();
  let bestScore = 0;
  const rec: ExerciseRecords = { best: null, heaviest: 0, mostReps: 0, bestE1rm: 0, longest: 0 };
  let seenWorkout: string | null = null;

  for (const s of ordered) {
    const score = setScore(kind, s);
    if (score > bestScore) {
      if (seenWorkout !== null && seenWorkout !== s.workoutId) prIds.add(s.id);
      bestScore = score;
      rec.best = s;
    }
    seenWorkout ??= s.workoutId;
    rec.heaviest = Math.max(rec.heaviest, s.weight ?? 0);
    rec.mostReps = Math.max(rec.mostReps, s.reps ?? 0);
    rec.bestE1rm = Math.max(rec.bestE1rm, e1rm(s.weight ?? 0, s.reps ?? 0));
    rec.longest = Math.max(rec.longest, kind === "cardio" ? (s.distance ?? 0) : (s.durationSec ?? 0));
  }
  // A PR only counts once per workout per exercise: keep the best set of that workout.
  const byWorkout = new Map<string, DatedSet>();
  for (const s of ordered) {
    if (!prIds.has(s.id)) continue;
    const cur = byWorkout.get(s.workoutId);
    if (!cur || setScore(kind, s) > setScore(kind, cur)) byWorkout.set(s.workoutId, s);
  }
  return { prIds: new Set([...byWorkout.values()].map((s) => s.id)), records: rec };
}

/** Number of distinct workout weeks in a row (ending this week) with at least `target` workouts. */
export function weeklyWorkoutStreak(dates: Day[], today: Day, target: number, weekStartsOn: 0 | 1 = 1) {
  const perWeek = new Map<Day, number>();
  for (const d of new Set(dates)) {
    const w = startOfWeek(d, weekStartsOn);
    perWeek.set(w, (perWeek.get(w) ?? 0) + 1);
  }
  let week = startOfWeek(today, weekStartsOn);
  let streak = (perWeek.get(week) ?? 0) >= target ? 1 : 0; // current week counts once met, never breaks
  week = addDays(week, -7);
  while ((perWeek.get(week) ?? 0) >= target) {
    streak++;
    week = addDays(week, -7);
  }
  return streak;
}

/** Summary line like "3 × 8 @ 60 kg" or "5 km · 25:00". */
export function summarizeSets(kind: ExerciseKind, sets: SetLike[], units: Units) {
  const done = sets.filter((s) => isComplete(kind, s));
  if (!done.length) return null;
  if (kind === "cardio") {
    const km = done.reduce((s, x) => s + (x.distance ?? 0), 0);
    const sec = done.reduce((s, x) => s + (x.durationSec ?? 0), 0);
    return [km ? `${Math.round(km * 100) / 100} km` : null, sec ? formatDuration(sec) : null].filter(Boolean).join(" · ");
  }
  if (kind === "timed") return done.map((s) => formatDuration(s.durationSec ?? 0)).join(", ");
  const top = done.reduce((a, b) => (setScore(kind, b) > setScore(kind, a) ? b : a));
  const sameReps = done.every((s) => s.reps === done[0].reps && s.weight === done[0].weight);
  const load = top.weight ? ` @ ${formatWeight(top.weight, units)}` : "";
  return sameReps ? `${done.length} × ${done[0].reps}${load}` : `${done.length} sets · best ${top.reps}${load}`;
}
