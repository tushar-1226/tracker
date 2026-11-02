"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useCommandPalette } from "./command-palette";
import { ThemeToggle } from "./theme-toggle";

/** Slim sticky header: wordmark, search, theme and your level ring. Turns to frosted glass once you scroll. */
export function AppHeader({ userName, level, levelProgress }: { userName: string; level: number; levelProgress: number }) {
  const palette = useCommandPalette();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const r = 19;
  const c = 2 * Math.PI * r;
  return (
    <div className="sticky top-0 z-30 px-2 pt-[calc(0.5rem+env(safe-area-inset-top))] md:px-4 md:pt-3">
      <header
        className={cn(
          "mx-auto flex w-full max-w-6xl items-center justify-between rounded-[1.375rem] px-2 py-2 transition-[background-color,box-shadow] duration-300 md:px-4",
          scrolled ? "glass" : "bg-transparent",
        )}
      >
        <Link href="/" className="group flex items-center gap-2.5 text-xl font-semibold tracking-tight">
          <span className="relative flex size-8 items-center justify-center overflow-hidden rounded-xl bg-foreground text-sm text-background transition-transform duration-300 group-hover:rotate-6">
            <span aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,var(--tint),transparent_70%)] opacity-60" />
            <span className="relative">t</span>
          </span>
          track<span className="-ml-2 text-tint">.</span>
        </Link>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={palette.open}
            aria-label="Search (⌘K)"
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-2xl px-3.5 text-sm text-muted transition-all hover:-translate-y-0.5 hover:text-foreground",
              scrolled ? "bg-subtle/70" : "bg-surface shadow-soft",
            )}
          >
            <Search className="size-4" />
            <span className="hidden md:inline">Search</span>
            <kbd className="hidden rounded-md bg-background/60 px-1.5 font-mono text-[10px] md:inline">⌘K</kbd>
          </button>
          <ThemeToggle className={cn("size-10", scrolled ? "bg-subtle/70 shadow-none" : "bg-surface shadow-soft")} />
          <Link href="/progress" aria-label={`${userName}, level ${level}`} className="group relative inline-flex size-10 items-center justify-center" title={`Level ${level}`}>
            <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90">
              <circle cx="22" cy="22" r={r} fill="none" stroke="var(--tint-soft)" strokeWidth="3" />
              <circle
                cx="22"
                cy="22"
                r={r}
                fill="none"
                stroke="var(--tint)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={c * (1 - Math.max(0.04, levelProgress))}
                className="transition-[stroke-dashoffset] duration-1000 ease-out-expo"
              />
            </svg>
            <span className="flex size-7 items-center justify-center rounded-full bg-foreground text-xs font-medium text-background transition-transform group-hover:scale-105">
              {userName.charAt(0).toUpperCase()}
            </span>
          </Link>
        </div>
      </header>
    </div>
  );
}
