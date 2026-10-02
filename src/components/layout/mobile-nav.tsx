"use client";

import { Dumbbell, LayoutGrid, ListChecks, Menu, Wallet } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useCommandPalette } from "./command-palette";
import { isActive } from "./nav";
import { ThemeToggle } from "./theme-toggle";

const TABS = [
  { href: "/", label: "Home", icon: LayoutGrid },
  { href: "/habits", label: "Habits", icon: ListChecks },
  { href: "/money", label: "Money", icon: Wallet },
  { href: "/gym", label: "Gym", icon: Dumbbell },
];

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md lg:hidden">
      <Link href="/" className="text-lg font-semibold tracking-tight">
        track<span className="text-muted">.</span>
      </Link>
      <ThemeToggle />
    </header>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  const palette = useCommandPalette();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
      <ul className="grid grid-cols-5">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={cn(
                  "relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] transition-colors",
                  active ? "text-foreground" : "text-muted",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="tab-active"
                    className="absolute top-0 h-0.5 w-8 rounded-full bg-foreground"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
                <tab.icon className="size-5" />
                {tab.label}
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={palette.open}
            className="flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] text-muted"
          >
            <Menu className="size-5" />
            More
          </button>
        </li>
      </ul>
    </nav>
  );
}
