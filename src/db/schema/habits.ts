import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { Frequency, HabitType } from "@/lib/habits/stats";
import { users } from "./users";

export const habits = sqliteTable(
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
    target: real("target").notNull().default(1),
    unit: text("unit"),
    frequency: text("frequency", { mode: "json" })
      .$type<Frequency>()
      .notNull()
      .default({ kind: "daily" }),
    /** Local calendar day the habit started (YYYY-MM-DD). */
    startDate: text("start_date").notNull(),
    position: integer("position").notNull().default(0),
    archivedAt: integer("archived_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("habits_user_idx").on(t.userId, t.position)],
);

export const habitLogs = sqliteTable(
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
    value: real("value").notNull(),
    note: text("note"),
  },
  (t) => [
    uniqueIndex("habit_logs_habit_date_uq").on(t.habitId, t.date),
    index("habit_logs_user_date_idx").on(t.userId, t.date),
  ],
);

export type Habit = typeof habits.$inferSelect;
export type HabitLog = typeof habitLogs.$inferSelect;
