import { integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users";

/** Ledger of every XP award; users.xp is the running total. */
export const xpEvents = pgTable(
  "xp_events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** e.g. "habit", "habit-day" */
    source: text("source").notNull(),
    /** Stable key so the same action can't be awarded twice, e.g. `${habitId}:${date}`. */
    sourceKey: text("source_key").notNull(),
    amount: integer("amount").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("xp_events_source_uq").on(t.userId, t.source, t.sourceKey)],
);
