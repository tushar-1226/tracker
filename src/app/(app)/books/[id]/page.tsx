import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookDetail } from "@/components/books/book-detail";
import { verifySession } from "@/lib/auth/dal";
import { getBook } from "@/server/queries/books";
import { getToday } from "@/server/today";

export const metadata: Metadata = { title: "Book" };

export default async function BookPage({ params }: PageProps<"/books/[id]">) {
  const [{ userId }, { id }, today] = await Promise.all([verifySession(), params, getToday()]);
  const data = await getBook(userId, id);
  if (!data) notFound();
  const { book } = data;
  return (
    <BookDetail
      key={book.id}
      today={today}
      book={{
        id: book.id,
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl,
        totalPages: book.totalPages,
        status: book.status,
        startedAt: book.startedAt,
        finishedAt: book.finishedAt,
        rating: book.rating,
        review: book.review,
      }}
      logs={data.logs}
      highlights={data.highlights.map((h) => ({ id: h.id, text: h.text, page: h.page }))}
      pagesRead={data.pagesRead}
    />
  );
}
