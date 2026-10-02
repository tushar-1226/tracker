import "server-only";
import { type Day, addDays, startOfWeek } from "@/lib/dates";
import {
  type DatedSet,
  type ExerciseKind,
  type Units,
  findPRs,
  isComplete,
  setVolume,
  summarizeSets,
  toDisplayWeight,
} from "@/lib/fitness";

type Ex = { id: string; name: string; kind: ExerciseKind };

/** PR set ids across all exercises, plus per-exercise records. */
export function computePRs(library: Ex[], history: Map<string, DatedSet[]>) {
  const kindOf = new Map(library.map((e) => [e.id, e.kind]));
  const prIds = new Set<string>();
  const records = new Map<string, ReturnType<typeof findPRs>["records"]>();
  for (const [exerciseId, sets] of history) {
    const r = findPRs(kindOf.get(exerciseId) ?? "strength", sets);
    r.prIds.forEach((id) => prIds.add(id));
    records.set(exerciseId, r.records);
  }
  return { prIds, records };
}

/** Converts a dated set's kg to display units (for summaries shown in the UI). */
export const inUnits = <T extends { weight: number | null }>(s: T, units: Units): T => ({
  ...s,
  weight: s.weight === null ? null : toDisplayWeight(s.weight, units),
});

export function workoutSummaries(
  workouts: { id: string; name: string; date: Day; durationMin: number | null; finishedAt: Date | null }[],
  library: Ex[],
  history: Map<string, DatedSet[]>,
  prIds: Set<string>,
) {
  const kindOf = new Map(library.map((e) => [e.id, e.kind]));
  const nameOf = new Map(library.map((e) => [e.id, e.name]));
  const byWorkout = new Map<string, { sets: number; volume: number; prs: number; exercises: Set<string> }>();
  for (const [exerciseId, sets] of history) {
    for (const s of sets) {
      if (!isComplete(kindOf.get(exerciseId) ?? "strength", s)) continue;
      const w = byWorkout.get(s.workoutId) ?? { sets: 0, volume: 0, prs: 0, exercises: new Set<string>() };
      w.sets++;
      w.volume += setVolume(s);
      if (prIds.has(s.id)) w.prs++;
      w.exercises.add(nameOf.get(exerciseId) ?? "");
      byWorkout.set(s.workoutId, w);
    }
  }
  return workouts.map((w) => {
    const agg = byWorkout.get(w.id);
    return {
      id: w.id,
      name: w.name,
      date: w.date,
      durationMin: w.durationMin,
      inProgress: w.finishedAt === null,
      sets: agg?.sets ?? 0,
      volume: agg?.volume ?? 0,
      prs: agg?.prs ?? 0,
      exercises: [...(agg?.exercises ?? [])],
    };
  });
}

export function weekRange(today: Day, weekStartsOn: 0 | 1) {
  const start = startOfWeek(today, weekStartsOn);
  return { start, end: addDays(start, 6) };
}

export { summarizeSets };
