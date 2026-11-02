import { doublePrecision, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
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

export const achievementsUnlocked = pgTable(
  "achievements_unlocked",
  {
    id: id(),
    userId: owner(),
    key: text("key").notNull(),
    tier: integer("tier").notNull(),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Set once the unlock celebration has been shown. */
    seenAt: timestamp("seen_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("achievements_user_key_tier_uq").on(t.userId, t.key, t.tier)],
);

export const goals = pgTable("goals", {
  id: id(),
  userId: owner(),
  title: text("title").notNull(),
  metric: jsonb("metric").$type<GoalMetric>().notNull(),
  target: doublePrecision("target").notNull(),
  /** Value when the goal was created (for "lose weight" style goals). */
  baseline: doublePrecision("baseline"),
  deadline: text("deadline"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const goalMilestones = pgTable("goal_milestones", {
  id: id(),
  userId: owner(),
  goalId: text("goal_id")
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  position: integer("position").notNull().default(0),
  doneAt: timestamp("done_at", { withTimezone: true }),
});

export type Goal = typeof goals.$inferSelect;
