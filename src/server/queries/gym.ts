import "server-only";
import { and, asc, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { bodyMetrics, exercises, workoutSets, workoutTemplates, workouts } from "@/db/schema";
import type { DatedSet, ExerciseKind, Muscle } from "@/lib/fitness";

const LIBRARY: [string, Muscle, ExerciseKind][] = [
  ["Bench Press", "chest", "strength"],
  ["Incline Dumbbell Press", "chest", "strength"],
  ["Chest Fly", "chest", "strength"],
  ["Push-up", "chest", "bodyweight"],
  ["Deadlift", "back", "strength"],
  ["Pull-up", "back", "bodyweight"],
  ["Barbell Row", "back", "strength"],
  ["Lat Pulldown", "back", "strength"],
  ["Seated Cable Row", "back", "strength"],
  ["Overhead Press", "shoulders", "strength"],
  ["Lateral Raise", "shoulders", "strength"],
  ["Face Pull", "shoulders", "strength"],
  ["Barbell Curl", "biceps", "strength"],
  ["Hammer Curl", "biceps", "strength"],
  ["Tricep Pushdown", "triceps", "strength"],
  ["Skull Crusher", "triceps", "strength"],
  ["Dips", "triceps", "bodyweight"],
  ["Squat", "legs", "strength"],
  ["Leg Press", "legs", "strength"],
  ["Romanian Deadlift", "legs", "strength"],
  ["Lunge", "legs", "strength"],
  ["Leg Curl", "legs", "strength"],
  ["Leg Extension", "legs", "strength"],
  ["Calf Raise", "legs", "strength"],
  ["Hip Thrust", "glutes", "strength"],
  ["Plank", "core", "timed"],
  ["Hanging Leg Raise", "core", "bodyweight"],
  ["Crunch", "core", "bodyweight"],
  ["Running", "cardio", "cardio"],
  ["Cycling", "cardio", "cardio"],
  ["Rowing", "cardio", "cardio"],
  ["Walking", "cardio", "cardio"],
];

const TEMPLATES: [string, string[]][] = [
  ["Push", ["Bench Press", "Overhead Press", "Incline Dumbbell Press", "Lateral Raise", "Tricep Pushdown"]],
  ["Pull", ["Deadlift", "Pull-up", "Barbell Row", "Face Pull", "Barbell Curl"]],
  ["Legs", ["Squat", "Romanian Deadlift", "Leg Press", "Leg Curl", "Calf Raise"]],
];

/** First visit: exercise library and Push / Pull / Legs templates. */
export async function ensureGymSetup(userId: string) {
  const [{ n }] = await db.select({ n: count() }).from(exercises).where(eq(exercises.userId, userId));
  if (n > 0) return;
  await db.transaction(async (tx) => {
    const [{ again }] = await tx.select({ again: count() }).from(exercises).where(eq(exercises.userId, userId));
    if (again > 0) return;
    const rows = await tx
      .insert(exercises)
      .values(LIBRARY.map(([name, muscle, kind]) => ({ userId, name, muscle, kind })))
      .returning({ id: exercises.id, name: exercises.name });
    const idOf = new Map(rows.map((r) => [r.name, r.id]));
    await tx.insert(workoutTemplates).values(
      TEMPLATES.map(([name, names], position) => ({
        userId,
        name,
        position,
        items: names.map((n) => ({ exerciseId: idOf.get(n)!, sets: 3 })),
      })),
    );
  });
}

export async function listExercises(userId: string) {
  return db
    .select({ id: exercises.id, name: exercises.name, muscle: exercises.muscle, kind: exercises.kind })
    .from(exercises)
    .where(and(eq(exercises.userId, userId), isNull(exercises.archivedAt)))
    .orderBy(asc(exercises.name));
}

export async function getActiveWorkout(userId: string) {
  return (
    (await db.query.workouts.findFirst({
      where: and(eq(workouts.userId, userId), isNull(workouts.finishedAt)),
      orderBy: desc(workouts.startedAt),
    })) ?? null
  );
}

export async function listWorkouts(userId: string) {
  return db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .orderBy(desc(workouts.date), desc(workouts.startedAt));
}

export async function getWorkout(userId: string, id: string) {
  const workout = await db.query.workouts.findFirst({ where: and(eq(workouts.id, id), eq(workouts.userId, userId)) });
  if (!workout) return null;
  const sets = await db
    .select()
    .from(workoutSets)
    .where(eq(workoutSets.workoutId, id))
    .orderBy(asc(workoutSets.position), asc(workoutSets.setIndex));
  return { workout, sets };
}

/** Every set with its workout date, oldest first — the input for PRs and history. */
export async function listDatedSets(userId: string) {
  const rows = await db
    .select({
      id: workoutSets.id,
      exerciseId: workoutSets.exerciseId,
      workoutId: workoutSets.workoutId,
      date: workouts.date,
      startedAt: workouts.startedAt,
      setIndex: workoutSets.setIndex,
      reps: workoutSets.reps,
      weight: workoutSets.weight,
      distance: workoutSets.distance,
      durationSec: workoutSets.durationSec,
      done: workoutSets.done,
    })
    .from(workoutSets)
    .innerJoin(workouts, eq(workouts.id, workoutSets.workoutId))
    .where(eq(workoutSets.userId, userId))
    .orderBy(asc(workouts.date), asc(workouts.startedAt), asc(workoutSets.position), asc(workoutSets.setIndex));

  const byExercise = new Map<string, (DatedSet & { setIndex: number; startedAt: Date })[]>();
  for (const r of rows) {
    const list = byExercise.get(r.exerciseId) ?? [];
    list.push(r);
    byExercise.set(r.exerciseId, list);
  }
  return byExercise;
}

export async function listTemplates(userId: string) {
  return db
    .select()
    .from(workoutTemplates)
    .where(eq(workoutTemplates.userId, userId))
    .orderBy(asc(workoutTemplates.position), asc(workoutTemplates.createdAt));
}

export async function listBodyMetrics(userId: string) {
  return db.select().from(bodyMetrics).where(eq(bodyMetrics.userId, userId)).orderBy(asc(bodyMetrics.date));
}
