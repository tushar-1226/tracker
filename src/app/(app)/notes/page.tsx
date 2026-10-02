import type { Metadata } from "next";
import { NotesView } from "@/components/notes/notes-view";
import { verifySession } from "@/lib/auth/dal";
import { listAllTags, listNotes } from "@/server/queries/notes";
import { requestTime } from "@/server/today";

export const metadata: Metadata = { title: "Notes" };

export default async function NotesPage({ searchParams }: PageProps<"/notes">) {
  const [{ userId }, params] = await Promise.all([verifySession(), searchParams]);
  const q = typeof params.q === "string" ? params.q.slice(0, 100) : undefined;
  const tag = typeof params.tag === "string" ? params.tag : undefined;
  const [notes, tags] = await Promise.all([listNotes(userId, { q, tag }), listAllTags(userId)]);
  return (
    <NotesView
      now={requestTime()}
      tags={tags}
      notes={notes.map((n) => ({ ...n, updatedAt: n.updatedAt.getTime() }))}
    />
  );
}
