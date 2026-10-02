import type { Metadata } from "next";
import { BooksView } from "@/components/books/books-view";
import { getCurrentUser } from "@/lib/auth/dal";
import { startOfWeek } from "@/lib/dates";
import { dayStreak } from "@/lib/growth";
import { listBooks } from "@/server/queries/books";
import { getToday } from "@/server/today";

export const metadata: Metadata = { title: "Books" };

export default async function BooksPage({ searchParams }: PageProps<"/books">) {
  const user = await getCurrentUser();
  const [today, { books, logs }, params] = await Promise.all([getToday(), listBooks(user.id), searchParams]);
  const weekStart = startOfWeek(today, user.settings.weekStartsOn ?? 1);
  const pagesOn = (pred: (d: string) => boolean) => logs.filter((l) => pred(l.date)).reduce((s, l) => s + l.pages, 0);

  return (
    <BooksView
      today={today}
      goal={user.settings.readingGoal ?? 12}
      openAdd={params.add === "1"}
      logs={logs}
      books={books.map((b) => ({
        id: b.id,
        title: b.title,
        author: b.author,
        coverUrl: b.coverUrl,
        totalPages: b.totalPages,
        status: b.status,
        pagesRead: b.pagesRead,
        finishedAt: b.finishedAt,
        rating: b.rating,
      }))}
      stats={{
        pagesToday: pagesOn((d) => d === today),
        pagesWeek: pagesOn((d) => d >= weekStart && d <= today),
        streak: dayStreak(
          logs.map((l) => l.date),
          today,
        ),
      }}
    />
  );
}
