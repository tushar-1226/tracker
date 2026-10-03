"use client";

import { LogOut, Search } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/server/actions/auth";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import { useCommandPalette } from "./command-palette";
import { NAV_SECTIONS, isActive } from "./nav";
import { ThemeToggle } from "./theme-toggle";

/** Icon rail on tablets (md), full sidebar on desktop (lg). Hidden on phones, which use the tab bar. */
export function Sidebar({ userName, level, levelProgress }: { userName: string; level: number; levelProgress: number }) {
  const pathname = usePathname();
  const palette = useCommandPalette();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-20 flex-col border-r bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] md:flex lg:w-64">
      <div className="flex h-16 items-center justify-center lg:justify-start lg:px-6">
        <Link href="/" className="text-xl font-bold tracking-[-0.05em] uppercase" aria-label="Track home">
          <span className="lg:hidden">T</span>
          <span className="hidden lg:inline">track</span>
          <span className="text-muted">.</span>
        </Link>
      </div>

      <div className="px-3">
        <button
          type="button"
          onClick={palette.open}
          aria-label="Search"
          className="flex h-11 w-full items-center justify-center gap-2 border px-3 text-sm text-muted transition-colors hover:bg-subtle lg:justify-start"
        >
          <Search className="size-4" />
          <span className="hidden lg:inline">Search</span>
          <span className="ml-auto hidden gap-1 lg:flex">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
      </div>

      <nav className="mt-4 flex-1 overflow-y-auto px-3 pb-4" data-lenis-prevent>
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-4 border-t pt-3 first:border-t-0 first:pt-0 lg:mb-5 lg:border-t-0 lg:pt-0">
            <p className="hidden px-3 pb-1.5 text-[10px] font-semibold tracking-[0.18em] text-muted uppercase lg:block">{section.title}</p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={item.label}
                      aria-label={item.label}
                      className={cn(
                        "relative flex h-11 items-center justify-center gap-3 px-3 text-sm transition-colors lg:h-9 lg:justify-start",
                        active ? "text-background" : "text-muted hover:text-foreground",
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="sidebar-active"
                          className="absolute inset-0 bg-foreground"
                          transition={{ type: "spring", stiffness: 500, damping: 40 }}
                        />
                      )}
                      <item.icon className="relative size-5 lg:size-4" />
                      <span className="relative hidden lg:inline">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="flex flex-col items-center gap-2 border-t p-3 lg:flex-row">
        <Link
          href="/progress"
          aria-label={`${userName}, level ${level} — view progress`}
          className="flex size-10 items-center justify-center bg-foreground text-sm font-medium text-background lg:size-9"
        >
          {userName.charAt(0).toUpperCase()}
        </Link>
        <Link href="/progress" className="hidden min-w-0 flex-1 lg:block" tabIndex={-1}>
          <span className="block truncate text-sm">{userName}</span>
          <span className="mt-1 flex items-center gap-1.5 text-[10px] text-muted">
            Lv {level}
            <span className="h-1 flex-1 overflow-hidden bg-hairline">
              <span className="block h-full bg-foreground transition-[width] duration-700" style={{ width: `${Math.max(3, levelProgress * 100)}%` }} />
            </span>
          </span>
        </Link>
        <ThemeToggle className="size-10 lg:size-9" />
        <form action={logout}>
          <button type="submit" aria-label="Log out" className="inline-flex size-10 items-center justify-center transition-colors hover:bg-subtle lg:size-9">
            <LogOut className="size-4" />
          </button>
        </form>
      </div>
    </aside>
  );
}
