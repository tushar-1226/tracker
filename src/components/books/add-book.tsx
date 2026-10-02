"use client";

import { LoaderCircle, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import type { BookStatus } from "@/db/schema";
import { cn } from "@/lib/utils";
import { type SearchResult, addBook, searchBooks } from "@/server/actions/books";
import { BookCover } from "./book-cover";

/** Search Open Library (or enter manually), pick a shelf, add. */
export function AddBook({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, startSearch] = useTransition();
  const [picked, setPicked] = useState<SearchResult | null>(null);
  const [manual, setManual] = useState(false);
  const [status, setStatus] = useState<BookStatus>("reading");
  const [saving, startSave] = useTransition();

  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(() => startSearch(async () => setResults(await searchBooks(q))), 400);
    return () => clearTimeout(t);
  }, [q]);

  const save = (book: { title: string; author: string | null; pages: number | null; coverUrl: string | null; key: string | null }) =>
    startSave(async () => {
      const id = await addBook({ title: book.title, author: book.author, totalPages: book.pages, coverUrl: book.coverUrl, olKey: book.key, status });
      onDone();
      router.push(`/books/${id}`);
    });

  const shelf = (
    <div className="space-y-2">
      <Label>Shelf</Label>
      <Segmented
        value={status}
        onChange={setStatus}
        options={[
          { value: "reading", label: "Reading" },
          { value: "want", label: "Want to read" },
          { value: "finished", label: "Finished" },
        ]}
      />
    </div>
  );

  if (manual) {
    return (
      <DialogContent title="Add a book">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const title = String(fd.get("title") ?? "").trim();
            const pages = Number(fd.get("pages"));
            if (!title) return;
            save({ title, author: String(fd.get("author") ?? "").trim() || null, pages: pages > 0 ? Math.round(pages) : null, coverUrl: null, key: null });
          }}
        >
          <Input name="title" placeholder="Title" defaultValue={q} aria-label="Title" autoFocus />
          <Input name="author" placeholder="Author" aria-label="Author" />
          <Input name="pages" placeholder="Pages" inputMode="numeric" aria-label="Pages" />
          {shelf}
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="lg" onClick={() => setManual(false)}>
              Back
            </Button>
            <Button type="submit" size="lg" className="flex-1" disabled={saving}>
              {saving ? <LoaderCircle className="animate-spin" /> : "Add book"}
            </Button>
          </div>
        </form>
      </DialogContent>
    );
  }

  if (picked) {
    return (
      <DialogContent title="Add a book">
        <div className="flex gap-4">
          <BookCover src={picked.coverUrl} title={picked.title} className="w-24 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium">{picked.title}</p>
            <p className="text-sm text-muted">{picked.author}</p>
            <p className="mt-1 text-xs text-muted">{[picked.year, picked.pages && `${picked.pages} pages`].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        <div className="mt-6">{shelf}</div>
        <div className="mt-6 flex gap-2">
          <Button variant="outline" size="lg" onClick={() => setPicked(null)}>
            Back
          </Button>
          <Button size="lg" className="flex-1" disabled={saving} onClick={() => save(picked)}>
            {saving ? <LoaderCircle className="animate-spin" /> : "Add book"}
          </Button>
        </div>
      </DialogContent>
    );
  }

  return (
    <DialogContent title="Add a book">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title or author" className="pl-10" autoFocus aria-label="Search books" />
        {searching && <LoaderCircle className="absolute top-1/2 right-4 size-4 -translate-y-1/2 animate-spin text-muted" />}
      </div>
      <ul className={cn("mt-3 max-h-[50vh] overflow-y-auto transition-opacity", searching && "opacity-60")} data-lenis-prevent>
        {results?.map((r) => (
          <li key={r.key}>
            <button type="button" onClick={() => setPicked(r)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-subtle">
              <BookCover src={r.coverUrl} title={r.title} className="w-10 shrink-0 rounded-md" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{r.title}</span>
                <span className="block truncate text-xs text-muted">{[r.author, r.year].filter(Boolean).join(" · ")}</span>
              </span>
            </button>
          </li>
        ))}
        {results && !results.length && !searching && <li className="py-6 text-center text-sm text-muted">No results — try another spelling or add it manually.</li>}
      </ul>
      <Button variant="outline" className="mt-4 w-full" onClick={() => setManual(true)}>
        Add manually
      </Button>
    </DialogContent>
  );
}
