"use client";

import { Command } from "cmdk";
import { ArrowLeftRight, BookOpen, BookPlus, Dumbbell, GraduationCap, ListChecks, LogOut, Minus, NotebookPen, Plus, Receipt, StickyNote, SunMoon } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, useTransition } from "react";
import { logout } from "@/server/actions/auth";
import { startWorkout } from "@/server/actions/gym";
import { createNote } from "@/server/actions/notes";
import { type SearchHit, searchAll } from "@/server/actions/search";
import { Kbd } from "@/components/ui/kbd";
import { NAV_SECTIONS } from "./nav";
import { useThemeSwitch } from "./theme-toggle";

const PaletteContext = createContext<{ open: () => void }>({ open: () => {} });
export const useCommandPalette = () => useContext(PaletteContext);

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const toggleTheme = useThemeSwitch();
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<{ q: string; items: SearchHit[] }>({ q: "", items: [] });

  // Look inside notes, journal, transactions, books and habits once you've typed a couple of letters.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let stale = false;
    const t = setTimeout(() => {
      searchAll(q)
        .then((items) => !stale && setHits({ q, items }))
        .catch(() => !stale && setHits({ q, items: [] }));
    }, 200);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [query]);
  const found = query.trim().length >= 2 && hits.q === query.trim() ? hits.items : [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const run = (fn: () => void) => {
    setOpen(false);
    setQuery("");
    fn();
  };

  return (
    <PaletteContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <Command.Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setQuery("");
        }}
        label="Command palette"
        filter={filterCommands}
        overlayClassName="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm data-[state=open]:animate-[fade-in_200ms_ease-out]"
        contentClassName="fixed top-[18vh] left-1/2 z-50 w-[min(92vw,560px)] -translate-x-1/2 overflow-hidden rounded-[2rem] bg-surface shadow-lift data-[state=open]:animate-[palette-in_300ms_var(--ease-out-expo)]"
      >
        <div className="flex items-center gap-3 border-b border-hairline px-5">
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder="Search or jump to…"
            className="h-14 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
          <Kbd>esc</Kbd>
        </div>
        <Command.List className="max-h-[50vh] overflow-y-auto overscroll-contain p-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted [&_[cmdk-group-heading]]:uppercase">
          <Command.Empty className="py-10 text-center text-sm text-muted">Nothing found.</Command.Empty>
          {found.length > 0 && (
            <Command.Group heading="Search results">
              {found.map((h) => {
                const Icon = HIT_ICON[h.kind];
                return (
                  // forceMount: these already matched on the server; cmdk's own filter must not hide them.
                  <PaletteItem key={`${h.kind}-${h.id}`} value={`result ${h.kind} ${h.id}`} forceMount onSelect={() => run(() => router.push(h.href))}>
                    <Icon />
                    <span className="truncate">{h.title}</span>
                    <span className="ml-auto max-w-[45%] truncate text-xs text-muted">{h.sub}</span>
                  </PaletteItem>
                );
              })}
            </Command.Group>
          )}
          {NAV_SECTIONS.map((section) => (
            <Command.Group key={section.title} heading={section.title}>
              {section.items.map((item) => (
                <PaletteItem
                  key={item.href}
                  value={item.label}
                  keywords={[item.description]}
                  onSelect={() => run(() => router.push(item.href))}
                >
                  <item.icon />
                  <span>{item.label}</span>
                  <span className="ml-auto truncate text-xs text-muted">{item.description}</span>
                </PaletteItem>
              ))}
            </Command.Group>
          ))}
          <Command.Group heading="Actions">
            <PaletteItem value="Add expense" keywords={["spend", "transaction", "money"]} onSelect={() => run(() => router.push("/money?add=expense"))}>
              <Minus />
              <span>Add expense</span>
            </PaletteItem>
            <PaletteItem value="Add income" keywords={["salary", "transaction", "money"]} onSelect={() => run(() => router.push("/money?add=income"))}>
              <Plus />
              <span>Add income</span>
            </PaletteItem>
            <PaletteItem value="Transfer" keywords={["move money", "account"]} onSelect={() => run(() => router.push("/money?add=transfer"))}>
              <ArrowLeftRight />
              <span>Transfer between accounts</span>
            </PaletteItem>
            <PaletteItem value="Start workout" keywords={["gym", "train", "lift"]} onSelect={() => run(() => startTransition(() => startWorkout()))}>
              <Dumbbell />
              <span>Start workout</span>
            </PaletteItem>
            <PaletteItem value="Log study session" keywords={["learn", "learning", "study"]} onSelect={() => run(() => router.push("/learning?log=1"))}>
              <GraduationCap />
              <span>Log study session</span>
            </PaletteItem>
            <PaletteItem value="New note" keywords={["write", "idea"]} onSelect={() => run(() => startTransition(() => createNote()))}>
              <StickyNote />
              <span>New note</span>
            </PaletteItem>
            <PaletteItem value="Add book" keywords={["read", "reading", "library"]} onSelect={() => run(() => router.push("/books?add=1"))}>
              <BookPlus />
              <span>Add book</span>
            </PaletteItem>
            <PaletteItem value="Write journal" keywords={["mood", "diary", "today"]} onSelect={() => run(() => router.push("/journal"))}>
              <NotebookPen />
              <span>Write today’s journal</span>
            </PaletteItem>
            <PaletteItem value="New habit" keywords={["add", "create"]} onSelect={() => run(() => router.push("/habits?new=1"))}>
              <Plus />
              <span>New habit</span>
            </PaletteItem>
            <PaletteItem value="Toggle theme" keywords={["dark", "light"]} onSelect={() => run(() => toggleTheme())}>
              <SunMoon />
              <span>Toggle theme</span>
            </PaletteItem>
            <PaletteItem value="Log out" keywords={["sign out"]} onSelect={() => run(() => startTransition(() => logout()))}>
              <LogOut />
              <span>Log out</span>
            </PaletteItem>
          </Command.Group>
        </Command.List>
      </Command.Dialog>
    </PaletteContext.Provider>
  );
}

const HIT_ICON = { note: StickyNote, journal: NotebookPen, transaction: Receipt, book: BookOpen, habit: ListChecks } as const;

/** Substring match; label hits rank above description hits. */
function filterCommands(value: string, search: string, keywords?: string[]) {
  const q = search.trim().toLowerCase();
  if (!q) return 1;
  const label = value.toLowerCase();
  if (label.startsWith(q)) return 1;
  if (label.includes(q)) return 0.8;
  return keywords?.some((k) => k.toLowerCase().includes(q)) ? 0.4 : 0;
}

function PaletteItem(props: React.ComponentProps<typeof Command.Item>) {
  return (
    <Command.Item
      className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors data-[selected=true]:bg-subtle [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted"
      {...props}
    />
  );
}
