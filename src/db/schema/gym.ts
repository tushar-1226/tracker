import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { ExerciseKind, Muscle } from "@/lib/fitness";
import { users } from "./users";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const owner = () =>
  text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" });

export const exercises = sqliteTable("exercises", {
  id: id(),
  userId: owner(),
  name: text("name").notNull(),
  muscle: text("muscle").$type<Muscle>().notNull(),
  kind: text("kind").$type<ExerciseKind>().notNull().default("strength"),
  archivedAt: integer("archived_at", { mode: "timestamp" }),
});

export const workouts = sqliteTable(
  "workouts",
  {
    id: id(),
    userId: owner(),
    name: text("name").notNull().default("Workout"),
    date: text("date").notNull(),
    startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
    /** null while the workout is in progress */
    finishedAt: integer("finished_at", { mode: "timestamp" }),
    durationMin: integer("duration_min"),
    note: text("note"),
  },
  (t) => [index("workouts_user_date_idx").on(t.userId, t.date)],
);

/** Weights in kg, distance in km, durations in seconds. */
export const workoutSets = sqliteTable(
  "workout_sets",
  {
    id: id(),
    workoutId: text("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    userId: owner(),
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    /** Order of the exercise within the workout. */
    position: integer("position").notNull(),
    setIndex: integer("set_index").notNull(),
    reps: integer("reps"),
    weight: real("weight"),
    distance: real("distance"),
    durationSec: integer("duration_sec"),
    done: integer("done", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("workout_sets_workout_idx").on(t.workoutId), index("workout_sets_exercise_idx").on(t.userId, t.exerciseId)],
);

export type TemplateItem = { exerciseId: string; sets: number };

export const workoutTemplates = sqliteTable("workout_templates", {
  id: id(),
  userId: owner(),
  name: text("name").notNull(),
  items: text("items", { mode: "json" }).$type<TemplateItem[]>().notNull(),
  position: integer("position").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const bodyMetrics = sqliteTable(
  "body_metrics",
  {
    id: id(),
    userId: owner(),
    date: text("date").notNull(),
    weight: real("weight"),
    bodyFat: real("body_fat"),
    waist: real("waist"),
  },
  (t) => [uniqueIndex("body_metrics_user_date_uq").on(t.userId, t.date)],
);

export type Exercise = typeof exercises.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type WorkoutSet = typeof workoutSets.$inferSelect;
export type WorkoutTemplate = typeof workoutTemplates.$inferSelect;
