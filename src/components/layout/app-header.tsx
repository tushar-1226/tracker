"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useCommandPalette } from "./command-palette";
import { ThemeToggle } from "./theme-toggle";

/** Slim header: wordmark, search, theme and your level ring. Navigation lives in the dock. */
export function AppHeader({ userName, level, levelProgress }: { userName: string; level: number; levelProgress: number }) {
  const palette = useCommandPalette();
  const r = 19;
  const c = 2 * Math.PI * r;
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 pt-[calc(1rem+env(safe-area-inset-top))] md:px-8 md:pt-6">
      <Link href="/" className="group flex items-center gap-2 text-xl font-semibold tracking-tight">
        <span className="flex size-8 items-center justify-center rounded-xl bg-foreground text-sm text-background transition-transform group-hover:rotate-6">t</span>
        track<span className="text-muted">.</span>
      </Link>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={palette.open} aria-label="Search (⌘K)" className="inline-flex h-10 items-center gap-2 rounded-2xl bg-surface px-3.5 text-sm text-muted shadow-soft transition-all hover:-translate-y-0.5 hover:text-foreground">
          <Search className="size-4" />
          <span className="hidden md:inline">Search</span>
          <kbd className="hidden rounded-md bg-subtle px-1.5 font-mono text-[10px] md:inline">⌘K</kbd>
        </button>
        <ThemeToggle className="size-10 bg-surface shadow-soft" />
        <Link href="/progress" aria-label={`${userName}, level ${level}`} className="relative inline-flex size-10 items-center justify-center" title={`Level ${level}`}>
          <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90">
            <circle cx="22" cy="22" r={r} fill="none" stroke="var(--hairline)" strokeWidth="3" />
            <circle cx="22" cy="22" r={r} fill="none" stroke="var(--foreground)" strokeWidth="3" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0.04, levelProgress))} />
          </svg>
          <span className="flex size-7 items-center justify-center rounded-full bg-foreground text-xs font-medium text-background">{userName.charAt(0).toUpperCase()}</span>
        </Link>
      </div>
    </header>
  );
}
