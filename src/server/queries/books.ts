import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { books, highlights, readingLogs } from "@/db/schema";

export async function listBooks(userId: string) {
  const [rows, read, logs] = await Promise.all([
    db.select().from(books).where(eq(books.userId, userId)).orderBy(desc(books.createdAt)),
    db
      .select({ bookId: readingLogs.bookId, pages: sql<number>`sum(${readingLogs.pages})`, last: sql<string>`max(${readingLogs.date})` })
      .from(readingLogs)
      .where(eq(readingLogs.userId, userId))
      .groupBy(readingLogs.bookId),
    db
      .select({ bookId: readingLogs.bookId, date: readingLogs.date, pages: readingLogs.pages })
      .from(readingLogs)
      .where(eq(readingLogs.userId, userId))
      .orderBy(asc(readingLogs.date)),
  ]);
  const readOf = new Map(read.map((r) => [r.bookId, r]));
  return {
    books: rows.map((b) => ({
      ...b,
      pagesRead: Number(readOf.get(b.id)?.pages ?? 0),
      lastRead: readOf.get(b.id)?.last ?? null,
    })),
    logs,
  };
}

export async function getBook(userId: string, id: string) {
  const book = await db.query.books.findFirst({ where: and(eq(books.id, id), eq(books.userId, userId)) });
  if (!book) return null;
  const [logs, marks] = await Promise.all([
    db.select({ date: readingLogs.date, pages: readingLogs.pages }).from(readingLogs).where(eq(readingLogs.bookId, id)).orderBy(asc(readingLogs.date)),
    db.select().from(highlights).where(eq(highlights.bookId, id)).orderBy(asc(highlights.page), desc(highlights.createdAt)),
  ]);
  return { book, logs, highlights: marks, pagesRead: logs.reduce((s, l) => s + l.pages, 0) };
}
