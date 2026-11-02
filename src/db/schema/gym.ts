import { boolean, doublePrecision, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
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

export const exercises = pgTable("exercises", {
  id: id(),
  userId: owner(),
  name: text("name").notNull(),
  muscle: text("muscle").$type<Muscle>().notNull(),
  kind: text("kind").$type<ExerciseKind>().notNull().default("strength"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
});

export const workouts = pgTable(
  "workouts",
  {
    id: id(),
    userId: owner(),
    name: text("name").notNull().default("Workout"),
    date: text("date").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    /** null while the workout is in progress */
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    durationMin: integer("duration_min"),
    note: text("note"),
  },
  (t) => [index("workouts_user_date_idx").on(t.userId, t.date)],
);

/** Weights in kg, distance in km, durations in seconds. */
export const workoutSets = pgTable(
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
    weight: doublePrecision("weight"),
    distance: doublePrecision("distance"),
    durationSec: integer("duration_sec"),
    done: boolean("done").notNull().default(false),
  },
  (t) => [index("workout_sets_workout_idx").on(t.workoutId), index("workout_sets_exercise_idx").on(t.userId, t.exerciseId)],
);

export type TemplateItem = { exerciseId: string; sets: number };

export const workoutTemplates = pgTable("workout_templates", {
  id: id(),
  userId: owner(),
  name: text("name").notNull(),
  items: jsonb("items").$type<TemplateItem[]>().notNull(),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const bodyMetrics = pgTable(
  "body_metrics",
  {
    id: id(),
    userId: owner(),
    date: text("date").notNull(),
    weight: doublePrecision("weight"),
    bodyFat: doublePrecision("body_fat"),
    waist: doublePrecision("waist"),
  },
  (t) => [uniqueIndex("body_metrics_user_date_uq").on(t.userId, t.date)],
);

export type Exercise = typeof exercises.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type WorkoutSet = typeof workoutSets.$inferSelect;
export type WorkoutTemplate = typeof workoutTemplates.$inferSelect;
