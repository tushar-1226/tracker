import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { users } from "./users";

/** Ledger of every XP award; users.xp is the running total. */
export const xpEvents = sqliteTable(
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
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex("xp_events_source_uq").on(t.userId, t.source, t.sourceKey)],
);
