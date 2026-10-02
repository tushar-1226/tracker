import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { type PrevSet, WorkoutLogger } from "@/components/gym/workout-logger";
import { getCurrentUser } from "@/lib/auth/dal";
import { isComplete, setScore, toDisplayWeight } from "@/lib/fitness";
import { ensureGymSetup, getWorkout, listDatedSets, listExercises } from "@/server/queries/gym";

export const metadata: Metadata = { title: "Workout" };

export default async function WorkoutPage({ params }: PageProps<"/gym/workout/[id]">) {
  const [user, { id }] = await Promise.all([getCurrentUser(), params]);
  await ensureGymSetup(user.id);
  const units = user.settings.units ?? "kg";
  const [data, library, history] = await Promise.all([getWorkout(user.id, id), listExercises(user.id), listDatedSets(user.id)]);
  if (!data) notFound();
  const { workout, sets } = data;
  const kindOf = new Map(library.map((e) => [e.id, e.kind]));
  const display = (kg: number | null) => (kg === null ? null : toDisplayWeight(kg, units));

  // Previous session (any other workout on or before this one) and best score so far, per exercise.
  const previous: Record<string, PrevSet[]> = {};
  const bestBefore: Record<string, number> = {};
  for (const [exerciseId, all] of history) {
    const kind = kindOf.get(exerciseId) ?? "strength";
    const before = all
      .filter((s) => s.workoutId !== id && (s.date < workout.date || (s.date === workout.date && s.startedAt < workout.startedAt)))
      .map((s) => ({ ...s, weight: display(s.weight) }));
    const lastId = before.findLast((s) => s.done)?.workoutId;
    if (lastId) {
      previous[exerciseId] = before
        .filter((s) => s.workoutId === lastId && s.done)
        .map(({ reps, weight, distance, durationSec }) => ({ reps, weight, distance, durationSec }));
    }
    const scores = before.filter((s) => isComplete(kind, s)).map((s) => setScore(kind, s));
    if (scores.length) bestBefore[exerciseId] = Math.max(...scores);
  }

  // Group the workout's sets back into exercises, in order.
  const initial: { exerciseId: string; sets: (PrevSet & { done: boolean })[] }[] = [];
  for (const s of sets) {
    let group = initial.at(-1);
    if (!group || group.exerciseId !== s.exerciseId) {
      group = { exerciseId: s.exerciseId, sets: [] };
      initial.push(group);
    }
    group.sets.push({ reps: s.reps, weight: display(s.weight), distance: s.distance, durationSec: s.durationSec, done: s.done });
  }

  return (
    <WorkoutLogger
      key={workout.id}
      workout={{
        id: workout.id,
        name: workout.name,
        date: workout.date,
        note: workout.note,
        startedAt: workout.startedAt.getTime(),
        finishedAt: workout.finishedAt?.getTime() ?? null,
        durationMin: workout.durationMin,
      }}
      initial={initial}
      library={library}
      previous={previous}
      bestBefore={bestBefore}
      units={units}
    />
  );
}
