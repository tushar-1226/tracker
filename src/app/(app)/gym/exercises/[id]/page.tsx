import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExerciseDetail } from "@/components/gym/exercise-detail";
import { getCurrentUser } from "@/lib/auth/dal";
import { MUSCLE_LABEL, e1rm, findPRs, isComplete, summarizeSets, toDisplayWeight } from "@/lib/fitness";
import { listDatedSets, listExercises, listWorkouts } from "@/server/queries/gym";

export const metadata: Metadata = { title: "Exercise" };

export default async function ExercisePage({ params }: PageProps<"/gym/exercises/[id]">) {
  const [user, { id }] = await Promise.all([getCurrentUser(), params]);
  const units = user.settings.units ?? "kg";
  const [library, history, workouts] = await Promise.all([listExercises(user.id), listDatedSets(user.id), listWorkouts(user.id)]);
  const ex = library.find((e) => e.id === id);
  if (!ex) notFound();

  const sets = history.get(id) ?? [];
  const done = sets.filter((s) => isComplete(ex.kind, s));
  const { prIds, records } = findPRs(ex.kind, sets);
  const w = (kg: number) => toDisplayWeight(kg, units);
  const workoutName = new Map(workouts.map((x) => [x.id, x.name]));

  // One point per session: the session's best by this exercise's main metric.
  const byWorkout = new Map<string, typeof done>();
  for (const s of done) byWorkout.set(s.workoutId, [...(byWorkout.get(s.workoutId) ?? []), s]);
  const metric = (s: (typeof done)[number]) =>
    ex.kind === "strength"
      ? w(e1rm(s.weight ?? 0, s.reps ?? 0))
      : ex.kind === "bodyweight"
        ? (s.reps ?? 0)
        : ex.kind === "cardio"
          ? (s.distance ?? 0)
          : (s.durationSec ?? 0);
  const progress = [...byWorkout.values()].map((list) => ({
    date: list[0].date,
    value: Math.round(Math.max(...list.map(metric)) * 10) / 10,
  }));

  const sessions = [...byWorkout.entries()]
    .map(([workoutId, list]) => ({
      workoutId,
      date: list[0].date,
      workoutName: workoutName.get(workoutId) ?? "Workout",
      summary: summarizeSets(ex.kind, list.map((s) => ({ ...s, weight: s.weight })), units) ?? "",
      pr: list.some((s) => prIds.has(s.id)),
    }))
    .reverse();

  const stats =
    ex.kind === "strength"
      ? [
          { label: "Est. 1-rep max", value: Math.round(w(records.bestE1rm) * 10) / 10, unit: units },
          { label: "Heaviest", value: w(records.heaviest), unit: units },
          { label: "Most reps", value: records.mostReps, unit: "reps" },
          { label: "Sessions", value: byWorkout.size, unit: "total" },
        ]
      : ex.kind === "bodyweight"
        ? [
            { label: "Most reps", value: records.mostReps, unit: "reps" },
            { label: "Most added", value: w(records.heaviest), unit: units },
            { label: "Total sets", value: done.length, unit: "sets" },
            { label: "Sessions", value: byWorkout.size, unit: "total" },
          ]
        : [
            { label: ex.kind === "cardio" ? "Longest" : "Longest hold", value: ex.kind === "cardio" ? records.longest : records.longest, unit: ex.kind === "cardio" ? "km" : "sec" },
            { label: "Total sets", value: done.length, unit: "sets" },
            { label: "Sessions", value: byWorkout.size, unit: "total" },
            { label: "PRs", value: prIds.size, unit: "records" },
          ];

  return (
    <ExerciseDetail
      name={ex.name}
      muscle={MUSCLE_LABEL[ex.muscle]}
      metricLabel={ex.kind === "strength" ? "Est. 1-rep max" : ex.kind === "bodyweight" ? "Reps" : ex.kind === "cardio" ? "Distance" : "Hold"}
      metricUnit={ex.kind === "strength" ? units : ex.kind === "bodyweight" ? "reps" : ex.kind === "cardio" ? "km" : "sec"}
      stats={stats}
      progress={progress}
      sessions={sessions}
    />
  );
}
