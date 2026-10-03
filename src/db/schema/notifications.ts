import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { ReminderKind } from "@/lib/reminders";
import { users } from "./users";

/** One row per device/browser that allowed notifications. */
export const pushSubscriptions = sqliteTable(
  "push_subscriptions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    device: text("device"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex("push_endpoint_uq").on(t.endpoint)],
);

export const reminders = sqliteTable("reminders", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").$type<ReminderKind>().notNull(),
  /** Habit id for habit reminders. */
  refId: text("ref_id"),
  title: text("title").notNull(),
  body: text("body"),
  url: text("url").notNull().default("/"),
  /** Local time "HH:MM" in the user's time zone. */
  time: text("time").notNull(),
  /** Weekdays (0 = Sunday); empty = every day. */
  days: text("days", { mode: "json" }).$type<number[]>().notNull().default([]),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  lastSentDate: text("last_sent_date"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type Reminder = typeof reminders.$inferSelect;
