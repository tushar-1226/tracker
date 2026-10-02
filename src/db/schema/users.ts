import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export type UserSettings = {
  currency?: string;
  weekStartsOn?: 0 | 1;
  units?: "kg" | "lb";
  cursor?: boolean;
  /** Books to finish per year. */
  readingGoal?: number;
  /** Minutes of learning per day that count as a full day. */
  learningTarget?: number;
};

export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  settings: text("settings", { mode: "json" })
    .$type<UserSettings>()
    .notNull()
    .default({}),
  xp: integer("xp").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type User = typeof users.$inferSelect;
