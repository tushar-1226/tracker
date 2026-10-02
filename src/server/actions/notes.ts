"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { verifySession } from "@/lib/auth/dal";

export async function createNote() {
  const { userId } = await verifySession();
  const [row] = await db.insert(notes).values({ userId }).returning({ id: notes.id });
  redirect(`/notes/${row.id}`);
}

const noteSchema = z.object({
  title: z.string().max(200),
  content: z.record(z.string(), z.unknown()).nullable(),
  text: z.string().max(200_000),
  tags: z.array(z.string().trim().toLowerCase().min(1).max(30)).max(20),
});

export async function saveNote(id: string, input: z.input<typeof noteSchema>) {
  const { userId } = await verifySession();
  const data = noteSchema.parse(input);
  const res = await db
    .update(notes)
    .set({ ...data, tags: [...new Set(data.tags)], updatedAt: new Date() })
    .where(and(eq(notes.id, id), eq(notes.userId, userId)))
    .returning({ id: notes.id });
  if (!res.length) throw new Error("Note not found");
}

export async function setNotePinned(id: string, pinned: boolean) {
  const { userId } = await verifySession();
  await db.update(notes).set({ pinned }).where(and(eq(notes.id, id), eq(notes.userId, userId)));
  refresh();
}

export async function deleteNote(id: string) {
  const { userId } = await verifySession();
  await db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, userId)));
  redirect("/notes");
}
