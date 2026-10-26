"use server";

import { and, desc, eq, like, or } from "drizzle-orm";
import { db } from "@/db";
import { books, categories, habits, journalEntries, notes, transactions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { formatMoney } from "@/lib/money/math";

export type SearchHit = { id: string; kind: "note" | "journal" | "transaction" | "book" | "habit"; title: string; sub: string; href: string };

const LIMIT = 5;

/** Excerpt around the first match, so the hit shows why it matched. */
function snippet(text: string, q: string) {
  const flat = text.replace(/\s+/g, " ").trim();
  const at = flat.toLowerCase().indexOf(q.toLowerCase());
  if (at < 0) return flat.slice(0, 80);
  const start = Math.max(0, at - 24);
  return `${start > 0 ? "…" : ""}${flat.slice(start, start + 90)}${start + 90 < flat.length ? "…" : ""}`;
}

/** Command-palette search across notes, journal, transactions, books and habits. */
export async function searchAll(query: string): Promise<SearchHit[]> {
  const q = query.trim().slice(0, 80);
  if (q.length < 2) return [];
  const user = await getCurrentUser();
  const userId = user.id;
  const pattern = `%${q.replace(/[%_\\]/g, "")}%`;
  const currency = user.settings.currency ?? "INR";

  const [noteRows, journalRows, txnRows, bookRows, habitRows] = await Promise.all([
    db
      .select({ id: notes.id, title: notes.title, text: notes.text })
      .from(notes)
      .where(and(eq(notes.userId, userId), or(like(notes.title, pattern), like(notes.text, pattern))))
      .orderBy(desc(notes.updatedAt))
      .limit(LIMIT),
    db
      .select({ id: journalEntries.id, date: journalEntries.date, content: journalEntries.content, gratitude: journalEntries.gratitude })
      .from(journalEntries)
      .where(and(eq(journalEntries.userId, userId), or(like(journalEntries.content, pattern), like(journalEntries.gratitude, pattern))))
      .orderBy(desc(journalEntries.date))
      .limit(LIMIT),
    db
      .select({ id: transactions.id, type: transactions.type, amount: transactions.amount, date: transactions.date, note: transactions.note, category: categories.name })
      .from(transactions)
      .leftJoin(categories, eq(categories.id, transactions.categoryId))
      .where(and(eq(transactions.userId, userId), or(like(transactions.note, pattern), like(categories.name, pattern))))
      .orderBy(desc(transactions.date))
      .limit(LIMIT),
    db
      .select({ id: books.id, title: books.title, author: books.author })
      .from(books)
      .where(and(eq(books.userId, userId), or(like(books.title, pattern), like(books.author, pattern))))
      .limit(LIMIT),
    db
      .select({ id: habits.id, name: habits.name })
      .from(habits)
      .where(and(eq(habits.userId, userId), like(habits.name, pattern)))
      .limit(LIMIT),
  ]);

  return [
    ...noteRows.map((n): SearchHit => ({ id: n.id, kind: "note", title: n.title || "Untitled note", sub: snippet(n.text, q), href: `/notes/${n.id}` })),
    ...journalRows.map((j): SearchHit => ({ id: j.id, kind: "journal", title: `Journal · ${j.date}`, sub: snippet(`${j.content ?? ""} ${j.gratitude ?? ""}`, q), href: `/journal?date=${j.date}` })),
    ...txnRows.map((t): SearchHit => ({
      id: t.id,
      kind: "transaction",
      title: `${t.type === "income" ? "+" : t.type === "expense" ? "−" : ""}${formatMoney(t.amount, currency)} · ${t.category ?? t.type}`,
      sub: [t.date, t.note].filter(Boolean).join(" · "),
      href: `/money/transactions?month=${t.date.slice(0, 7)}`,
    })),
    ...bookRows.map((b): SearchHit => ({ id: b.id, kind: "book", title: b.title, sub: b.author ?? "Book", href: `/books/${b.id}` })),
    ...habitRows.map((h): SearchHit => ({ id: h.id, kind: "habit", title: h.name, sub: "Habit", href: `/habits/${h.id}` })),
  ];
}
