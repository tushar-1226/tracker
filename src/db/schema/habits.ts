import { doublePrecision, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { Frequency, HabitType } from "@/lib/habits/stats";
import { users } from "./users";

export const habits = pgTable(
  "habits",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    icon: text("icon").notNull().default("circle"),
    type: text("type").$type<HabitType>().notNull().default("check"),
    /** Goal per day (count/duration); 1 for check & quit. */
    target: doublePrecision("target").notNull().default(1),
    unit: text("unit"),
    frequency: jsonb("frequency")
      .$type<Frequency>()
      .notNull()
      .default({ kind: "daily" }),
    /** Local calendar day the habit started (YYYY-MM-DD). */
    startDate: text("start_date").notNull(),
    position: integer("position").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("habits_user_idx").on(t.userId, t.position)],
);

export const habitLogs = pgTable(
  "habit_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    habitId: text("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    /** check: 1 · count/duration: amount · quit: 1 = slipped */
    value: doublePrecision("value").notNull(),
    note: text("note"),
  },
  (t) => [
    uniqueIndex("habit_logs_habit_date_uq").on(t.habitId, t.date),
    index("habit_logs_user_date_idx").on(t.userId, t.date),
  ],
);

export type Habit = typeof habits.$inferSelect;
export type HabitLog = typeof habitLogs.$inferSelect;
