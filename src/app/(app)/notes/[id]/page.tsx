import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NoteEditor } from "@/components/notes/note-editor";
import { verifySession } from "@/lib/auth/dal";
import { getNote } from "@/server/queries/notes";

export const metadata: Metadata = { title: "Note" };

export default async function NotePage({ params }: PageProps<"/notes/[id]">) {
  const [{ userId }, { id }] = await Promise.all([verifySession(), params]);
  const note = await getNote(userId, id);
  if (!note) notFound();
  return (
    <NoteEditor
      key={note.id}
      note={{ id: note.id, title: note.title, content: note.content, tags: note.tags, pinned: note.pinned, updatedAt: note.updatedAt.getTime() }}
    />
  );
}
