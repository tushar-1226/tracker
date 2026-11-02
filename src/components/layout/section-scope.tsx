"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export type Section = "home" | "habits" | "money" | "fitness" | "learning" | "reading" | "mind" | "astro" | "progress";

const PREFIXES: [string, Section][] = [
  ["/habits", "habits"],
  ["/money", "money"],
  ["/budget", "money"],
  ["/gym", "fitness"],
  ["/learning", "learning"],
  ["/books", "reading"],
  ["/notes", "mind"],
  ["/journal", "mind"],
  ["/horoscope", "astro"],
  ["/goals", "progress"],
  ["/progress", "progress"],
];

export function sectionOf(pathname: string): Section {
  return PREFIXES.find(([p]) => pathname === p || pathname.startsWith(`${p}/`))?.[1] ?? "home";
}

/**
 * Sets the current section's tint (`--tint`) for everything inside, and mirrors it onto
 * <html> so portalled dialogs and the page background follow along.
 */
export function SectionScope({ children }: { children: React.ReactNode }) {
  const section = sectionOf(usePathname());
  useEffect(() => {
    document.documentElement.dataset.section = section;
  }, [section]);
  return (
    <div data-section={section} className="contents">
      <div aria-hidden className="aurora" />
      {children}
    </div>
  );
}
