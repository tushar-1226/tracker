"use client";

import { Pin, Plus, Search } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Magnetic } from "@/components/motion/magnetic";
import { PageHeader } from "@/components/module/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createNote } from "@/server/actions/notes";
import { formatDate } from "@/lib/dates";

type NoteCard = { id: string; title: string; text: string; tags: string[]; pinned: boolean; updatedAt: number };

function ago(ms: number, now: number) {
  const m = Math.round((now - ms) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d} d ago` : formatDate(ms, { day: "numeric", month: "short" });
}

export function NotesView({ notes, tags, now }: { notes: NoteCard[]; tags: string[]; now: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [pending, startTransition] = useTransition();
  const activeTag = params.get("tag");

  const go = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    startTransition(() => router.replace(`${pathname}?${p}`, { scroll: false }));
  };

  return (
    <>
      <PageHeader
        title="Notes"
        description="Ideas worth keeping."
        actions={
          <form action={createNote}>
            <Magnetic>
              <Button type="submit" data-cursor-label="New">
                <Plus /> New note
              </Button>
            </Magnetic>
          </form>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <form
          className="relative w-full sm:w-72"
          onSubmit={(e) => {
            e.preventDefault();
            go({ q: q.trim() || null });
          }}
        >
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search notes"
            aria-label="Search notes"
            className="h-10 w-full rounded-full bg-subtle pr-4 pl-10 text-sm outline-none transition-colors focus:ring-2 focus:ring-foreground/15"
          />
        </form>
        {tags.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => go({ tag: activeTag === t ? null : t })}
            className={cn(
              "h-8 rounded-full bg-subtle px-3 text-xs transition-colors",
              activeTag === t ? "bg-foreground text-background" : "text-muted hover:text-foreground",
            )}
          >
            #{t}
          </button>
        ))}
      </div>

      {notes.length ? (
        <div className={cn("columns-1 gap-4 transition-opacity sm:columns-2 lg:columns-3", pending && "opacity-60")}>
          {notes.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 12) * 0.03, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="mb-4 break-inside-avoid"
            >
              <Link href={`/notes/${n.id}`} data-cursor-label="Open" className="block rounded-3xl bg-surface p-5 transition-colors hover:bg-subtle">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn("font-medium", !n.title && "text-muted")}>{n.title || "Untitled"}</p>
                  {n.pinned && <Pin className="size-3.5 shrink-0 fill-foreground" aria-label="Pinned" />}
                </div>
                {n.text && <p className="mt-2 line-clamp-6 text-sm whitespace-pre-line text-muted">{n.text.slice(0, 400)}</p>}
                <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                  {n.tags.map((t) => (
                    <span key={t}>#{t}</span>
                  ))}
                  <span className="ml-auto">{ago(n.updatedAt, now)}</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-3xl bg-foreground/[0.035] px-6 py-16 text-center">
          <p className="font-medium">{params.get("q") || activeTag ? "No notes match." : "No notes yet."}</p>
          <p className="mt-1 text-sm text-muted">Capture an idea before it slips away.</p>
        </div>
      )}
    </>
  );
}
