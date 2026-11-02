import { boolean, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { ReminderKind } from "@/lib/reminders";
import { users } from "./users";

/** One row per device/browser that allowed notifications. */
export const pushSubscriptions = pgTable(
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("push_endpoint_uq").on(t.endpoint)],
);

export const reminders = pgTable("reminders", {
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
  days: jsonb("days").$type<number[]>().notNull().default([]),
  enabled: boolean("enabled").notNull().default(true),
  lastSentDate: text("last_sent_date"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Reminder = typeof reminders.$inferSelect;
