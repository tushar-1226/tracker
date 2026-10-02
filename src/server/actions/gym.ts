"use server";

import { and, eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { bodyMetrics, exercises, workoutSets, workoutTemplates, workouts } from "@/db/schema";
import { verifySession, getCurrentUser } from "@/lib/auth/dal";
import { isDay } from "@/lib/dates";
import { findPRs, fromDisplayWeight } from "@/lib/fitness";
import { getActiveWorkout, listDatedSets } from "@/server/queries/gym";
import { getToday } from "@/server/today";
import { XP, grantXp, revokeXp } from "@/server/xp";

async function ownWorkout(userId: string, id: string) {
  const w = await db.query.workouts.findFirst({ where: and(eq(workouts.id, id), eq(workouts.userId, userId)) });
  if (!w) throw new Error("Workout not found");
  return w;
}

/** Starts (or resumes) a workout, optionally from a template, and opens the logger. */
export async function startWorkout(templateId?: string) {
  const { userId } = await verifySession();
  const active = await getActiveWorkout(userId);
  if (active) redirect(`/gym/workout/${active.id}`);

  const template = templateId
    ? await db.query.workoutTemplates.findFirst({
        where: and(eq(workoutTemplates.id, templateId), eq(workoutTemplates.userId, userId)),
      })
    : null;

  // Pre-fill each set with what was done last time.
  const history = template ? await listDatedSets(userId) : new Map();
  const id = await db.transaction(async (tx) => {
    const [w] = await tx
      .insert(workouts)
      .values({ userId, name: template?.name ?? "Workout", date: await getToday(), startedAt: new Date() })
      .returning({ id: workouts.id });
    const rows = (template?.items ?? []).flatMap((item, position) => {
      const past = history.get(item.exerciseId) ?? [];
      const lastWorkout = past.at(-1)?.workoutId;
      const last = past.filter((s: { workoutId: string }) => s.workoutId === lastWorkout);
      return Array.from({ length: item.sets }, (_, setIndex) => {
        const prev = last[setIndex] ?? last.at(-1);
        return {
          workoutId: w.id,
          userId,
          exerciseId: item.exerciseId,
          position,
          setIndex,
          reps: prev?.reps ?? null,
          weight: prev?.weight ?? null,
          distance: prev?.distance ?? null,
          durationSec: prev?.durationSec ?? null,
          done: false,
        };
      });
    });
    if (rows.length) await tx.insert(workoutSets).values(rows);
    return w.id;
  });
  redirect(`/gym/workout/${id}`);
}

const num = z.number().finite().nonnegative().max(100_000).nullable();
const payloadSchema = z.object({
  name: z.string().trim().min(1).max(60),
  note: z.string().trim().max(500).nullable(),
  date: z.string().refine(isDay),
  /** Weights arrive in the user's display unit. */
  exercises: z
    .array(
      z.object({
        exerciseId: z.string().min(1),
        sets: z
          .array(
            z.object({
              reps: num,
              weight: num,
              distance: num,
              durationSec: num,
              done: z.boolean(),
            }),
          )
          .max(50),
      }),
    )
    .max(40),
});
export type WorkoutPayload = z.infer<typeof payloadSchema>;

/** Autosave: replaces the workout's sets with the logger's current state. */
export async function saveWorkout(workoutId: string, payload: WorkoutPayload) {
  const user = await getCurrentUser();
  const units = user.settings.units ?? "kg";
  const workout = await ownWorkout(user.id, workoutId);
  const data = payloadSchema.parse(payload);

  const exerciseIds = [...new Set(data.exercises.map((e) => e.exerciseId))];
  if (exerciseIds.length) {
    const owned = await db
      .select({ id: exercises.id })
      .from(exercises)
      .where(and(eq(exercises.userId, user.id), inArray(exercises.id, exerciseIds)));
    if (owned.length !== exerciseIds.length) throw new Error("Exercise not found");
  }

  await db.transaction(async (tx) => {
    await tx.update(workouts).set({ name: data.name, note: data.note || null, date: data.date }).where(eq(workouts.id, workoutId));
    await tx.delete(workoutSets).where(eq(workoutSets.workoutId, workoutId));
    const rows = data.exercises.flatMap((e, position) =>
      e.sets.map((s, setIndex) => ({
        workoutId,
        userId: user.id,
        exerciseId: e.exerciseId,
        position,
        setIndex,
        reps: s.reps === null ? null : Math.round(s.reps),
        weight: s.weight === null ? null : fromDisplayWeight(s.weight, units),
        distance: s.distance,
        durationSec: s.durationSec === null ? null : Math.round(s.durationSec),
        done: s.done,
      })),
    );
    if (rows.length) await tx.insert(workoutSets).values(rows);
  });

  // Editing a finished workout can create or remove PRs.
  if (workout.finishedAt) await syncWorkoutXp(user.id, workoutId);
}

/** Grants workout XP, plus a bonus when the workout contains at least one PR. Returns PR set ids. */
async function syncWorkoutXp(userId: string, workoutId: string) {
  const [history, exerciseRows] = await Promise.all([
    listDatedSets(userId),
    db.select({ id: exercises.id, kind: exercises.kind }).from(exercises).where(eq(exercises.userId, userId)),
  ]);
  const kindOf = new Map(exerciseRows.map((e) => [e.id, e.kind]));
  const prSetIds: string[] = [];
  for (const [exerciseId, sets] of history) {
    if (!sets.some((s) => s.workoutId === workoutId)) continue;
    const { prIds } = findPRs(kindOf.get(exerciseId) ?? "strength", sets);
    for (const s of sets) if (s.workoutId === workoutId && prIds.has(s.id)) prSetIds.push(s.id);
  }
  const anyDone = [...history.values()].some((sets) => sets.some((s) => s.workoutId === workoutId && s.done));

  await db.transaction(async (tx) => {
    if (anyDone) await grantXp(tx, userId, "workout", workoutId, XP.workout);
    else await revokeXp(tx, userId, "workout", workoutId);
    if (prSetIds.length) await grantXp(tx, userId, "workout-pr", workoutId, XP.workoutPr);
    else await revokeXp(tx, userId, "workout-pr", workoutId);
  });
  return prSetIds;
}

export async function finishWorkout(workoutId: string) {
  const { userId } = await verifySession();
  const workout = await ownWorkout(userId, workoutId);
  const now = new Date();
  const minutes = Math.round((now.getTime() - workout.startedAt.getTime()) / 60_000);
  await db
    .update(workouts)
    .set({ finishedAt: workout.finishedAt ?? now, durationMin: workout.durationMin ?? Math.min(600, Math.max(1, minutes)) })
    .where(eq(workouts.id, workoutId));
  const prSetIds = await syncWorkoutXp(userId, workoutId);
  refresh();
  return { prSetIds, xp: XP.workout + (prSetIds.length ? XP.workoutPr : 0) };
}

export async function deleteWorkout(workoutId: string) {
  const { userId } = await verifySession();
  await ownWorkout(userId, workoutId);
  await db.transaction(async (tx) => {
    await revokeXp(tx, userId, "workout", workoutId);
    await revokeXp(tx, userId, "workout-pr", workoutId);
    await tx.delete(workoutSets).where(eq(workoutSets.workoutId, workoutId));
    await tx.delete(workouts).where(eq(workouts.id, workoutId));
  });
  redirect("/gym");
}

const exerciseSchema = z.object({
  name: z.string().trim().min(1, { error: "Name it" }).max(60),
  muscle: z.enum(["chest", "back", "shoulders", "biceps", "triceps", "legs", "glutes", "core", "full_body", "cardio"]),
  kind: z.enum(["strength", "bodyweight", "cardio", "timed"]),
});

export async function createExercise(input: z.input<typeof exerciseSchema>) {
  const { userId } = await verifySession();
  const data = exerciseSchema.parse(input);
  const [row] = await db
    .insert(exercises)
    .values({ ...data, userId })
    .returning({ id: exercises.id, name: exercises.name, muscle: exercises.muscle, kind: exercises.kind });
  return row;
}

export async function saveAsTemplate(workoutId: string, name: string) {
  const { userId } = await verifySession();
  await ownWorkout(userId, workoutId);
  const sets = await db.select().from(workoutSets).where(eq(workoutSets.workoutId, workoutId));
  const items: { exerciseId: string; sets: number }[] = [];
  for (const s of [...sets].sort((a, b) => a.position - b.position)) {
    const last = items.at(-1);
    if (last && last.exerciseId === s.exerciseId) last.sets++;
    else items.push({ exerciseId: s.exerciseId, sets: 1 });
  }
  if (!items.length) throw new Error("Add an exercise first");
  await db.insert(workoutTemplates).values({ userId, name: z.string().trim().min(1).max(40).parse(name), items, position: 100 });
  refresh();
}

export async function deleteTemplate(id: string) {
  const { userId } = await verifySession();
  await db.delete(workoutTemplates).where(and(eq(workoutTemplates.id, id), eq(workoutTemplates.userId, userId)));
  refresh();
}

const metricSchema = z.object({
  date: z.string().refine(isDay, { error: "Pick a date" }),
  weight: z.coerce.number().positive().max(1000).optional(),
  bodyFat: z.coerce.number().positive().max(80).optional(),
  waist: z.coerce.number().positive().max(500).optional(),
});

export async function logBodyMetric(_s: unknown, formData: FormData) {
  const user = await getCurrentUser();
  const raw = Object.fromEntries([...formData].filter(([, v]) => v !== ""));
  const parsed = metricSchema.safeParse(raw);
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> };
  const { date, weight, bodyFat, waist } = parsed.data;
  if (weight === undefined && bodyFat === undefined && waist === undefined) return { message: "Enter at least one value" };

  const values = {
    weight: weight === undefined ? null : fromDisplayWeight(weight, user.settings.units ?? "kg"),
    bodyFat: bodyFat ?? null,
    waist: waist ?? null,
  };
  await db
    .insert(bodyMetrics)
    .values({ userId: user.id, date, ...values })
    .onConflictDoUpdate({ target: [bodyMetrics.userId, bodyMetrics.date], set: values });
  refresh();
  return { ok: true };
}

export async function deleteBodyMetric(id: string) {
  const { userId } = await verifySession();
  await db.delete(bodyMetrics).where(and(eq(bodyMetrics.id, id), eq(bodyMetrics.userId, userId)));
  refresh();
}
