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

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const palette = useCommandPalette();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-background lg:flex">
      <div className="flex h-16 items-center px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          track<span className="text-muted">.</span>
        </Link>
      </div>

      <div className="px-3">
        <button
          type="button"
          onClick={palette.open}
          className="flex h-10 w-full items-center gap-2 rounded-xl border px-3 text-sm text-muted transition-colors hover:bg-subtle"
        >
          <Search className="size-4" />
          <span>Search</span>
          <span className="ml-auto flex gap-1">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
      </div>

      <nav className="mt-4 flex-1 overflow-y-auto px-3 pb-4" data-lenis-prevent>
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-5">
            <p className="px-3 pb-1.5 text-[11px] font-medium tracking-wide text-muted uppercase">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "relative flex h-9 items-center gap-3 rounded-xl px-3 text-sm transition-colors",
                        active ? "text-background" : "text-muted hover:text-foreground",
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="sidebar-active"
                          className="absolute inset-0 rounded-xl bg-foreground"
                          transition={{ type: "spring", stiffness: 500, damping: 40 }}
                        />
                      )}
                      <item.icon className="relative size-4" />
                      <span className="relative">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-2 border-t p-3">
        <div className="flex size-9 items-center justify-center rounded-full bg-foreground text-sm font-medium text-background">
          {userName.charAt(0).toUpperCase()}
        </div>
        <p className="flex-1 truncate text-sm">{userName}</p>
        <ThemeToggle />
        <form action={logout}>
          <button
            type="submit"
            aria-label="Log out"
            className="inline-flex size-9 items-center justify-center rounded-full transition-colors hover:bg-subtle"
          >
            <LogOut className="size-4" />
          </button>
        </form>
      </div>
    </aside>
  );
}
