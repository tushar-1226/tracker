"use server";

import { and, eq, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { type BookStatus, books, highlights, readingLogs, users } from "@/db/schema";
import { getCurrentUser, verifySession } from "@/lib/auth/dal";
import { isDay } from "@/lib/dates";
import { getToday } from "@/server/today";
import { grantXp, revokeXp } from "@/server/xp";

const BOOK_XP = 100;

export type SearchResult = {
  key: string;
  title: string;
  author: string | null;
  year: number | null;
  pages: number | null;
  coverUrl: string | null;
};

/** Open Library search; returns [] if the service is unreachable. */
export async function searchBooks(query: string): Promise<SearchResult[]> {
  await verifySession();
  const q = query.trim().slice(0, 100);
  if (q.length < 2) return [];
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=8&fields=key,title,author_name,cover_i,number_of_pages_median,first_publish_year`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000), headers: { "User-Agent": "track-personal-app" } });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      docs: { key: string; title: string; author_name?: string[]; cover_i?: number; number_of_pages_median?: number; first_publish_year?: number }[];
    };
    return data.docs.map((d) => ({
      key: d.key,
      title: d.title,
      author: d.author_name?.slice(0, 2).join(", ") ?? null,
      year: d.first_publish_year ?? null,
      pages: d.number_of_pages_median ?? null,
      coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : null,
    }));
  } catch {
    return [];
  }
}

const statusSchema = z.enum(["want", "reading", "finished", "abandoned"]);
const bookInput = z.object({
  title: z.string().trim().min(1).max(200),
  author: z.string().trim().max(200).nullable(),
  coverUrl: z.url().startsWith("https://covers.openlibrary.org/").nullable(),
  totalPages: z.number().int().positive().max(20_000).nullable(),
  olKey: z.string().max(60).nullable(),
  status: statusSchema,
});

async function ownBook(userId: string, id: string) {
  const b = await db.query.books.findFirst({ where: and(eq(books.id, id), eq(books.userId, userId)) });
  if (!b) throw new Error("Book not found");
  return b;
}

/** Moves a book to a status, keeping start/finish dates and XP consistent. */
async function applyStatus(userId: string, book: { id: string; startedAt: string | null; finishedAt: string | null }, status: BookStatus) {
  const today = await getToday();
  await db.transaction(async (tx) => {
    await tx
      .update(books)
      .set({
        status,
        startedAt: status === "want" ? book.startedAt : (book.startedAt ?? today),
        finishedAt: status === "finished" ? (book.finishedAt ?? today) : null,
      })
      .where(eq(books.id, book.id));
    if (status === "finished") await grantXp(tx, userId, "book", book.id, BOOK_XP);
    else await revokeXp(tx, userId, "book", book.id);
  });
}

export async function addBook(input: z.input<typeof bookInput>) {
  const { userId } = await verifySession();
  const data = bookInput.parse(input);
  const [row] = await db
    .insert(books)
    .values({ ...data, status: "want", userId })
    .returning({ id: books.id, startedAt: books.startedAt, finishedAt: books.finishedAt });
  if (data.status !== "want") await applyStatus(userId, row, data.status);
  refresh();
  return row.id;
}

export async function setBookStatus(id: string, status: BookStatus) {
  const { userId } = await verifySession();
  const book = await ownBook(userId, id);
  await applyStatus(userId, book, statusSchema.parse(status));
  refresh();
}

const detailsSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  author: z.string().trim().max(200).nullable().optional(),
  totalPages: z.number().int().positive().max(20_000).nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  review: z.string().max(5000).nullable().optional(),
  startedAt: z.string().refine(isDay).nullable().optional(),
  finishedAt: z.string().refine(isDay).nullable().optional(),
});

export async function updateBook(id: string, patch: z.input<typeof detailsSchema>) {
  const { userId } = await verifySession();
  await ownBook(userId, id);
  await db.update(books).set(detailsSchema.parse(patch)).where(eq(books.id, id));
  refresh();
}

/**
 * Logs reading. `mode: "add"` adds pages read on `date`; `mode: "page"` sets the
 * current page and logs the difference. Starts the book if needed and finishes
 * it when the last page is reached.
 */
export async function logReading(id: string, mode: "add" | "page", value: number, date?: string) {
  const { userId } = await verifySession();
  const book = await ownBook(userId, id);
  const day = date && isDay(date) ? date : await getToday();
  const n = z.number().int().min(0).max(20_000).parse(Math.round(value));

  const [{ read }] = await db
    .select({ read: sql<number>`coalesce(sum(${readingLogs.pages}), 0)` })
    .from(readingLogs)
    .where(eq(readingLogs.bookId, id));
  const delta = mode === "add" ? n : n - Number(read);
  if (delta === 0) return;

  const existing = await db.query.readingLogs.findFirst({ where: and(eq(readingLogs.bookId, id), eq(readingLogs.date, day)) });
  const pages = Math.max(0, (existing?.pages ?? 0) + delta);
  if (existing) {
    if (pages === 0) await db.delete(readingLogs).where(eq(readingLogs.id, existing.id));
    else await db.update(readingLogs).set({ pages }).where(eq(readingLogs.id, existing.id));
  } else if (pages > 0) {
    await db.insert(readingLogs).values({ userId, bookId: id, date: day, pages });
  }

  const total = Number(read) + delta;
  if (book.totalPages && total >= book.totalPages && book.status !== "finished") await applyStatus(userId, book, "finished");
  else if (book.status === "want" && delta > 0) await applyStatus(userId, book, "reading");
  refresh();
}

export async function addHighlight(bookId: string, text: string, page: number | null) {
  const { userId } = await verifySession();
  await ownBook(userId, bookId);
  await db.insert(highlights).values({
    userId,
    bookId,
    text: z.string().trim().min(1).max(2000).parse(text),
    page: page === null ? null : z.number().int().positive().max(20_000).parse(page),
  });
  refresh();
}

export async function deleteHighlight(id: string) {
  const { userId } = await verifySession();
  await db.delete(highlights).where(and(eq(highlights.id, id), eq(highlights.userId, userId)));
  refresh();
}

export async function deleteBook(id: string) {
  const { userId } = await verifySession();
  await ownBook(userId, id);
  await db.transaction(async (tx) => {
    await revokeXp(tx, userId, "book", id);
    await tx.delete(readingLogs).where(eq(readingLogs.bookId, id));
    await tx.delete(highlights).where(eq(highlights.bookId, id));
    await tx.delete(books).where(eq(books.id, id));
  });
  redirect("/books");
}

export async function setReadingGoal(goal: number) {
  const user = await getCurrentUser();
  const readingGoal = z.number().int().min(1).max(500).parse(goal);
  await db.update(users).set({ settings: { ...user.settings, readingGoal } }).where(eq(users.id, user.id));
  refresh();
}

