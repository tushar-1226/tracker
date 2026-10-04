import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export type StoredPlace = { name: string; lat: number; lon: number; tz: string };

export type UserSettings = {
  currency?: string;
  weekStartsOn?: 0 | 1;
  units?: "kg" | "lb";
  cursor?: boolean;
  /** Books to finish per year. */
  readingGoal?: number;
  /** Minutes of learning per day that count as a full day. */
  learningTarget?: number;
  /** Workouts per week that count as on track. */
  workoutTarget?: number;
  /** Vedic horoscope: birth details (time optional) and where you are now (for sunrise/Rahu Kaal). */
  birth?: { date: string; time: string | null; place: StoredPlace };
  currentPlace?: StoredPlace;
  /** Language for the horoscope section. */
  horoscopeLang?: "en" | "hinglish" | "hi";
  /** IANA zone, saved from the browser so reminders fire at local times. */
  timeZone?: string;
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
