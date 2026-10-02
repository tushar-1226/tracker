import "server-only";
import { and, desc, eq, like, or } from "drizzle-orm";
import { db } from "@/db";
import { notes } from "@/db/schema";

export async function listNotes(userId: string, f: { q?: string; tag?: string } = {}) {
  const conds = [eq(notes.userId, userId)];
  if (f.q) {
    const pattern = `%${f.q.replace(/[%_]/g, "")}%`;
    conds.push(or(like(notes.title, pattern), like(notes.text, pattern))!);
  }
  const rows = await db
    .select({ id: notes.id, title: notes.title, text: notes.text, tags: notes.tags, pinned: notes.pinned, updatedAt: notes.updatedAt })
    .from(notes)
    .where(and(...conds))
    .orderBy(desc(notes.pinned), desc(notes.updatedAt));
  return f.tag ? rows.filter((n) => n.tags.includes(f.tag!)) : rows;
}

export async function listAllTags(userId: string) {
  const rows = await db.select({ tags: notes.tags }).from(notes).where(eq(notes.userId, userId));
  const counts = new Map<string, number>();
  for (const r of rows) for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag);
}

export async function getNote(userId: string, id: string) {
  return (await db.query.notes.findFirst({ where: and(eq(notes.id, id), eq(notes.userId, userId)) })) ?? null;
}
