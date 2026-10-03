import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { GoalMetric } from "@/lib/progress/goals";
import { users } from "./users";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const owner = () =>
  text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" });

export const achievementsUnlocked = sqliteTable(
  "achievements_unlocked",
  {
    id: id(),
    userId: owner(),
    key: text("key").notNull(),
    tier: integer("tier").notNull(),
    unlockedAt: integer("unlocked_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    /** Set once the unlock celebration has been shown. */
    seenAt: integer("seen_at", { mode: "timestamp" }),
  },
  (t) => [uniqueIndex("achievements_user_key_tier_uq").on(t.userId, t.key, t.tier)],
);

export const goals = sqliteTable("goals", {
  id: id(),
  userId: owner(),
  title: text("title").notNull(),
  metric: text("metric", { mode: "json" }).$type<GoalMetric>().notNull(),
  target: real("target").notNull(),
  /** Value when the goal was created (for "lose weight" style goals). */
  baseline: real("baseline"),
  deadline: text("deadline"),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  archivedAt: integer("archived_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const goalMilestones = sqliteTable("goal_milestones", {
  id: id(),
  userId: owner(),
  goalId: text("goal_id")
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  position: integer("position").notNull().default(0),
  doneAt: integer("done_at", { mode: "timestamp" }),
});

export type Goal = typeof goals.$inferSelect;
