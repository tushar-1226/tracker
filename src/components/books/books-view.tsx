"use client";

import { Check, LoaderCircle, Pencil, Plus } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Ring } from "@/components/charts/ring";
import { Magnetic } from "@/components/motion/magnetic";
import { NumberTicker } from "@/components/motion/number-ticker";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { PageHeader } from "@/components/module/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardLabel } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import type { BookStatus } from "@/db/schema";
import type { Day } from "@/lib/dates";
import { bookEta, readingPace } from "@/lib/growth";
import { cn } from "@/lib/utils";
import { logReading, setReadingGoal } from "@/server/actions/books";
import { AddBook } from "./add-book";
import { BookCover } from "./book-cover";

export type BookCard = {
  id: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  totalPages: number | null;
  status: BookStatus;
  pagesRead: number;
  finishedAt: string | null;
  rating: number | null;
};

export function BooksView({
  today,
  books,
  logs,
  goal,
  stats,
  openAdd,
}: {
  today: Day;
  books: BookCard[];
  logs: { bookId: string; date: Day; pages: number }[];
  goal: number;
  stats: { pagesToday: number; pagesWeek: number; streak: number };
  openAdd: boolean;
}) {
  const [add, setAdd] = useState({ open: openAdd, key: 0 });
  const [shelf, setShelf] = useState<"want" | "finished" | "abandoned">("want");
  const year = today.slice(0, 4);
  const finishedThisYear = books.filter((b) => b.status === "finished" && b.finishedAt?.startsWith(year)).length;
  const pace = readingPace(goal, finishedThisYear, today);
  const reading = books.filter((b) => b.status === "reading");
  const shelved = books.filter((b) => b.status === shelf);

  return (
    <>
      <PageHeader
        title="Books"
        description="Your library and reading goal."
        actions={
          <Magnetic>
            <Button onClick={() => setAdd((a) => ({ open: true, key: a.key + 1 }))} data-cursor-label="Add">
              <Plus /> Add book
            </Button>
          </Magnetic>
        }
      />

      <Stagger className="grid gap-4 md:grid-cols-4">
        <StaggerItem className="md:col-span-2">
          <GoalCard goal={goal} finished={finishedThisYear} delta={pace.delta} year={year} />
        </StaggerItem>
        <Stat label="Pages today" value={stats.pagesToday} unit="pages" />
        <Stat label="Reading streak" value={stats.streak} unit={stats.streak === 1 ? "day" : "days"} hint={`${stats.pagesWeek} pages this week`} />
      </Stagger>

      <Reveal className="mt-10 mb-4">
        <h2 className="border-t-2 border-foreground pt-3 text-2xl font-bold tracking-[-0.03em] uppercase">Currently reading</h2>
      </Reveal>
      {reading.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {reading.map((b, i) => (
            <ReadingCard key={b.id} book={b} index={i} logs={logs.filter((l) => l.bookId === b.id)} today={today} />
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdd((a) => ({ open: true, key: a.key + 1 }))}
          className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-3xl border border-dashed text-sm text-muted transition-colors hover:bg-subtle hover:text-foreground"
        >
          <Plus className="size-5" /> Start a book
        </button>
      )}

      <Reveal className="mt-10 mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="border-t-2 border-foreground pt-3 text-2xl font-bold tracking-[-0.03em] uppercase">Library</h2>
        <Segmented
          value={shelf}
          onChange={setShelf}
          options={[
            { value: "want", label: `Want to read · ${books.filter((b) => b.status === "want").length}` },
            { value: "finished", label: `Finished · ${books.filter((b) => b.status === "finished").length}` },
            { value: "abandoned", label: "Abandoned" },
          ]}
        />
      </Reveal>
      {shelved.length ? (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
          {shelved.map((b, i) => (
            <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.03, duration: 0.45 }}>
              <Link href={`/books/${b.id}`} data-cursor-label="Open" className="group block">
                <BookCover src={b.coverUrl} title={b.title} className="transition-transform duration-500 ease-out-expo group-hover:-translate-y-1" />
                <p className="mt-2 line-clamp-2 text-xs font-medium">{b.title}</p>
                <p className="truncate text-[11px] text-muted">{b.status === "finished" && b.rating ? "★".repeat(b.rating) : b.author}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <p className="rounded-3xl border border-dashed px-4 py-10 text-center text-sm text-muted">Nothing on this shelf yet.</p>
      )}

      <Dialog open={add.open} onOpenChange={(open) => setAdd((a) => ({ ...a, open }))}>
        <AddBook key={add.key} onDone={() => setAdd((a) => ({ ...a, open: false }))} />
      </Dialog>
    </>
  );
}

function Stat({ label, value, unit, hint }: { label: string; value: number; unit: string; hint?: string }) {
  return (
    <StaggerItem>
      <Card className="flex h-full flex-col justify-between gap-6">
        <CardLabel>{label}</CardLabel>
        <div>
          <p className="flex items-baseline gap-1.5">
            <NumberTicker value={value} className="tabular text-4xl font-medium" />
            <span className="text-sm text-muted">{unit}</span>
          </p>
          {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        </div>
      </Card>
    </StaggerItem>
  );
}

function GoalCard({ goal, finished, delta, year }: { goal: number; finished: number; delta: number; year: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(goal));
  const [pending, startTransition] = useTransition();
  const rounded = Math.round(Math.abs(delta) * 10) / 10;
  return (
    <Card className="flex h-full items-center gap-6">
      <Ring value={finished / goal} size={120} stroke={8}>
        <span className="tabular text-3xl font-medium">{finished}</span>
        <span className="text-xs text-muted">of {goal}</span>
      </Ring>
      <div className="min-w-0 flex-1">
        <CardLabel>{year} reading goal</CardLabel>
        <p className="mt-2 text-sm">
          {finished >= goal ? "Goal reached. Anything more is a bonus." : rounded < 0.5 ? "Right on pace." : delta > 0 ? `${rounded} books ahead of pace.` : `${rounded} books behind pace.`}
        </p>
        {editing ? (
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                await setReadingGoal(Number(value));
                setEditing(false);
              });
            }}
          >
            <Input value={value} onChange={(e) => setValue(e.target.value)} inputMode="numeric" className="h-9 w-24" aria-label="Books per year" autoFocus />
            <Button size="sm" type="submit" disabled={pending} aria-label="Save goal">
              {pending ? <LoaderCircle className="animate-spin" /> : <Check />}
            </Button>
          </form>
        ) : (
          <button type="button" onClick={() => setEditing(true)} className="mt-3 inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-foreground">
            <Pencil className="size-3" /> Change goal
          </button>
        )}
      </div>
    </Card>
  );
}

function ReadingCard({ book, index, logs, today }: { book: BookCard; index: number; logs: { date: Day; pages: number }[]; today: Day }) {
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<"add" | "page">("add");
  const [pending, startTransition] = useTransition();
  const progress = book.totalPages ? Math.min(1, book.pagesRead / book.totalPages) : null;
  const eta = book.totalPages ? bookEta(book.totalPages - book.pagesRead, logs, today) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex gap-5 rounded-3xl border bg-surface p-5"
    >
      <Link href={`/books/${book.id}`} className="w-24 shrink-0" data-cursor-label="Open">
        <BookCover src={book.coverUrl} title={book.title} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <Link href={`/books/${book.id}`} className="truncate font-medium hover:underline">
          {book.title}
        </Link>
        <p className="truncate text-sm text-muted">{book.author}</p>
        <div className="mt-auto pt-4">
          <div className="flex items-baseline justify-between text-xs text-muted">
            <span className="tabular-nums">
              {book.totalPages ? `p. ${book.pagesRead} of ${book.totalPages}` : `${book.pagesRead} pages read`}
            </span>
            <span>{progress !== null && `${Math.round(progress * 100)}%`}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-none bg-hairline">
            <motion.div
              className="h-full rounded-none bg-foreground"
              initial={{ width: 0 }}
              animate={{ width: `${(progress ?? 0) * 100}%` }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted">{eta === null ? "Log pages to see when you’ll finish" : eta === 0 ? "Finished" : `About ${eta} day${eta === 1 ? "" : "s"} to go`}</p>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(value);
              if (!Number.isFinite(n) || n <= 0) return;
              startTransition(async () => {
                await logReading(book.id, mode, n);
                setValue("");
              });
            }}
          >
            <button
              type="button"
              onClick={() => setMode(mode === "add" ? "page" : "add")}
              className={cn("h-9 shrink-0 rounded-none border px-3 text-[11px] font-medium text-muted transition-colors hover:text-foreground")}
              title="Switch between pages read and current page"
            >
              {mode === "add" ? "+ pages" : "at page"}
            </button>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              inputMode="numeric"
              placeholder={mode === "add" ? "Pages read" : "Current page"}
              aria-label={mode === "add" ? `Pages read in ${book.title}` : `Current page in ${book.title}`}
              className="h-9"
            />
            <Button type="submit" size="sm" disabled={pending || !value} aria-label="Log reading">
              {pending ? <LoaderCircle className="animate-spin" /> : <Check />}
            </Button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
