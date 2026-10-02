import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { users } from "./users";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const owner = () =>
  text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" });
const createdAt = () =>
  integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`);

// ---------- Learning ----------

export const skills = sqliteTable("skills", {
  id: id(),
  userId: owner(),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("sparkles"),
  targetHours: real("target_hours"),
  position: integer("position").notNull().default(0),
  archivedAt: integer("archived_at", { mode: "timestamp" }),
  createdAt: createdAt(),
});

export const studySessions = sqliteTable(
  "study_sessions",
  {
    id: id(),
    userId: owner(),
    skillId: text("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    minutes: integer("minutes").notNull(),
    summary: text("summary"),
    createdAt: createdAt(),
  },
  (t) => [index("study_sessions_user_date_idx").on(t.userId, t.date)],
);

export type ResourceKind = "course" | "book" | "video" | "article" | "other";
export type ResourceStatus = "todo" | "doing" | "done";

export const resources = sqliteTable("resources", {
  id: id(),
  userId: owner(),
  skillId: text("skill_id").references(() => skills.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  url: text("url"),
  kind: text("kind").$type<ResourceKind>().notNull().default("other"),
  status: text("status").$type<ResourceStatus>().notNull().default("todo"),
  createdAt: createdAt(),
});

export const tils = sqliteTable(
  "tils",
  {
    id: id(),
    userId: owner(),
    skillId: text("skill_id").references(() => skills.id, { onDelete: "set null" }),
    date: text("date").notNull(),
    text: text("text").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("tils_user_date_idx").on(t.userId, t.date)],
);

// ---------- Books ----------

export type BookStatus = "want" | "reading" | "finished" | "abandoned";

export const books = sqliteTable("books", {
  id: id(),
  userId: owner(),
  title: text("title").notNull(),
  author: text("author"),
  coverUrl: text("cover_url"),
  totalPages: integer("total_pages"),
  status: text("status").$type<BookStatus>().notNull().default("want"),
  startedAt: text("started_at"),
  finishedAt: text("finished_at"),
  rating: integer("rating"),
  review: text("review"),
  olKey: text("ol_key"),
  createdAt: createdAt(),
});

export const readingLogs = sqliteTable(
  "reading_logs",
  {
    id: id(),
    userId: owner(),
    bookId: text("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    pages: integer("pages").notNull(),
  },
  (t) => [uniqueIndex("reading_logs_book_date_uq").on(t.bookId, t.date), index("reading_logs_user_date_idx").on(t.userId, t.date)],
);

export const highlights = sqliteTable("highlights", {
  id: id(),
  userId: owner(),
  bookId: text("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  page: integer("page"),
  createdAt: createdAt(),
});

// ---------- Notes ----------

export const notes = sqliteTable("notes", {
  id: id(),
  userId: owner(),
  title: text("title").notNull().default(""),
  /** Tiptap JSON document. */
  content: text("content", { mode: "json" }).$type<Record<string, unknown>>(),
  /** Plain-text copy for search and previews. */
  text: text("text").notNull().default(""),
  tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default([]),
  pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
  createdAt: createdAt(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ---------- Journal ----------

export const journalEntries = sqliteTable(
  "journal_entries",
  {
    id: id(),
    userId: owner(),
    date: text("date").notNull(),
    /** 1–5 */
    mood: integer("mood"),
    /** 1–5 */
    energy: integer("energy"),
    sleepHours: real("sleep_hours"),
    gratitude: text("gratitude"),
    content: text("content"),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex("journal_user_date_uq").on(t.userId, t.date)],
);

export type Skill = typeof skills.$inferSelect;
export type Book = typeof books.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type JournalEntry = typeof journalEntries.$inferSelect;
