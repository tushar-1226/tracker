"use client";

import { ArrowLeft, LoaderCircle, Plus, Quote, Star, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { ChartCard } from "@/components/charts/chart-card";
import { ColumnChart } from "@/components/charts/column-chart";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Card, CardLabel } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import type { BookStatus } from "@/db/schema";
import { type Day, addDays, eachDay, toDate } from "@/lib/dates";
import { bookEta } from "@/lib/growth";
import { cn } from "@/lib/utils";
import { addHighlight, deleteBook, deleteHighlight, logReading, setBookStatus, updateBook } from "@/server/actions/books";
import { BookCover } from "./book-cover";

const fmt = (d: Day) => toDate(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function BookDetail({
  today,
  book,
  logs,
  highlights,
  pagesRead,
}: {
  today: Day;
  book: {
    id: string;
    title: string;
    author: string | null;
    coverUrl: string | null;
    totalPages: number | null;
    status: BookStatus;
    startedAt: string | null;
    finishedAt: string | null;
    rating: number | null;
    review: string | null;
  };
  logs: { date: Day; pages: number }[];
  highlights: { id: string; text: string; page: number | null }[];
  pagesRead: number;
}) {
  const [pending, startTransition] = useTransition();
  const [review, setReview] = useState(book.review ?? "");
  const [pages, setPages] = useState(book.totalPages ? String(book.totalPages) : "");
  const [log, setLog] = useState("");
  const progress = book.totalPages ? Math.min(1, pagesRead / book.totalPages) : null;
  const eta = book.totalPages ? bookEta(book.totalPages - pagesRead, logs, today) : null;
  const days = eachDay(addDays(today, -29), today);
  const perDay = days.map((d) => logs.find((l) => l.date === d)?.pages ?? 0);

  return (
    <>
      <Reveal>
        <Link href="/books" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Books
        </Link>
      </Reveal>

      <Reveal className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end">
        <BookCover src={book.coverUrl} title={book.title} className="w-36 shrink-0 shadow-xl shadow-black/10" />
        <div className="min-w-0 flex-1">
          <h1 className="text-4xl leading-[0.9] font-bold tracking-[-0.045em] md:text-7xl">{book.title}</h1>
          <p className="mt-2 text-muted">{book.author}</p>
          <p className="mt-1 text-xs text-muted">
            {[book.startedAt && `Started ${fmt(book.startedAt)}`, book.finishedAt && `Finished ${fmt(book.finishedAt)}`].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Segmented
              value={book.status}
              onChange={(s) => startTransition(() => setBookStatus(book.id, s))}
              options={[
                { value: "want", label: "Want" },
                { value: "reading", label: "Reading" },
                { value: "finished", label: "Finished" },
                { value: "abandoned", label: "Abandoned" },
              ]}
            />
            <DeleteBook id={book.id} title={book.title} />
          </div>
        </div>
      </Reveal>

      <div className="grid gap-4 md:grid-cols-3">
        <Reveal>
          <Card className="flex h-full flex-col gap-4">
            <CardLabel>Progress</CardLabel>
            <p className="text-4xl font-semibold tracking-tight">{progress === null ? pagesRead : `${Math.round(progress * 100)}%`}</p>
            <div className="h-2 overflow-hidden rounded-none bg-hairline">
              <div className="h-full rounded-none bg-foreground transition-[width] duration-700 ease-out-expo" style={{ width: `${(progress ?? 0) * 100}%` }} />
            </div>
            <p className="text-xs text-muted">
              {pagesRead} of {book.totalPages ?? "?"} pages
              {eta ? ` · about ${eta} day${eta === 1 ? "" : "s"} left` : ""}
            </p>
            <form
              className="mt-auto flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const n = Number(log);
                if (n > 0) startTransition(async () => (await logReading(book.id, "page", n), setLog("")));
              }}
            >
              <Input value={log} onChange={(e) => setLog(e.target.value)} inputMode="numeric" placeholder="Now at page…" aria-label="Current page" className="h-9" />
              <Button size="sm" type="submit" disabled={pending || !log}>
                Save
              </Button>
            </form>
            <label className="flex items-center gap-2 text-xs text-muted">
              Total pages
              <input
                value={pages}
                onChange={(e) => setPages(e.target.value)}
                onBlur={() => {
                  const n = Number(pages);
                  if (n > 0 && n !== book.totalPages) startTransition(() => updateBook(book.id, { totalPages: Math.round(n) }));
                }}
                inputMode="numeric"
                className="w-16 rounded-md border bg-transparent px-2 py-1 text-foreground outline-none focus:border-foreground"
              />
            </label>
          </Card>
        </Reveal>
        <Reveal delay={0.05} className="md:col-span-2">
          <ChartCard title="Pages per day" subtitle="Last 30 days" className="h-full" table={{ columns: ["Day", "Pages"], rows: logs.map((l) => [fmt(l.date), l.pages]).reverse() }}>
            <ColumnChart
              ariaLabel={`Pages read per day of ${book.title}`}
              labels={days.map((d, i) => (i % 5 === 0 || i === days.length - 1 ? String(Number(d.slice(8))) : ""))}
              titles={days.map(fmt)}
              series={[{ name: "Pages", tone: "fg", values: perDay }]}
              format={(v) => `${v} pages`}
              formatAxis={(v) => String(v)}
              height={200}
            />
          </ChartCard>
        </Reveal>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Reveal>
          <Card className="h-full">
            <CardLabel>Your rating & review</CardLabel>
            <div className="mt-3 flex gap-1" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={book.rating === n}
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  onClick={() => startTransition(() => updateBook(book.id, { rating: book.rating === n ? null : n }))}
                  className="p-0.5 transition-transform active:scale-90"
                >
                  <Star className={cn("size-6", (book.rating ?? 0) >= n ? "fill-foreground" : "text-muted")} />
                </button>
              ))}
            </div>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              onBlur={() => review !== (book.review ?? "") && startTransition(() => updateBook(book.id, { review: review.trim() || null }))}
              placeholder="What stayed with you?"
              rows={5}
              className="mt-4 w-full resize-none rounded-2xl border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted focus:border-foreground"
            />
          </Card>
        </Reveal>
        <Reveal delay={0.05}>
          <Highlights bookId={book.id} items={highlights} />
        </Reveal>
      </div>
    </>
  );
}

function Highlights({ bookId, items }: { bookId: string; items: { id: string; text: string; page: number | null }[] }) {
  const [text, setText] = useState("");
  const [page, setPage] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <Card className="h-full">
      <CardLabel>Highlights & quotes</CardLabel>
      <form
        className="mt-3 space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          startTransition(async () => {
            await addHighlight(bookId, text, Number(page) > 0 ? Math.round(Number(page)) : null);
            setText("");
            setPage("");
          });
        }}
      >
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="A line worth keeping…" aria-label="Highlight" className="w-full resize-none rounded-2xl border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted focus:border-foreground" />
        <div className="flex gap-2">
          <Input value={page} onChange={(e) => setPage(e.target.value)} inputMode="numeric" placeholder="Page" aria-label="Page" className="h-9 w-24" />
          <Button type="submit" size="sm" className="ml-auto" disabled={pending || !text.trim()}>
            {pending ? <LoaderCircle className="animate-spin" /> : <Plus />} Save
          </Button>
        </div>
      </form>
      <ul className="mt-4 max-h-80 space-y-4 overflow-y-auto" data-lenis-prevent>
        {items.map((h) => (
          <li key={h.id} className="group flex gap-3">
            <Quote className="mt-0.5 size-3.5 shrink-0 text-muted" />
            <span className="flex-1">
              <span className="block text-sm leading-relaxed">{h.text}</span>
              {h.page && <span className="text-xs text-muted">p. {h.page}</span>}
            </span>
            <button type="button" aria-label="Delete highlight" onClick={() => startTransition(() => deleteHighlight(h.id))} className="inline-flex size-7 items-center justify-center rounded-none text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground focus:opacity-100">
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function DeleteBook({ id, title }: { id: string; title: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Delete book">
          <Trash2 />
        </Button>
      </DialogTrigger>
      <DialogContent title={`Delete “${title}”?`} description="Its reading log, highlights and the XP it earned will be removed.">
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button disabled={pending} onClick={() => startTransition(() => deleteBook(id))}>
            {pending ? <LoaderCircle className="animate-spin" /> : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
