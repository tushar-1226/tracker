"use client";

import { LogOut, Search } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog as D } from "radix-ui";
import { logout } from "@/server/actions/auth";
import { cn } from "@/lib/utils";
import { useCommandPalette } from "./command-palette";
import { NAV_SECTIONS, isActive } from "./nav";
import { ThemeToggle } from "./theme-toggle";

/** Every section as soft tiles, plus search, theme and account — opened from the dock. */
export function MoreSheet({
  open,
  onOpenChange,
  userName,
  level,
  levelProgress,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  level: number;
  levelProgress: number;
}) {
  const pathname = usePathname();
  const palette = useCommandPalette();
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[6px] data-[state=closed]:animate-[fade-out_150ms_ease-in] data-[state=open]:animate-[fade-in_200ms_ease-out] dark:bg-black/50" />
        <D.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[88dvh] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-t-[2.25rem] bg-background p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-lift data-[state=closed]:animate-[dialog-out_150ms_ease-in] data-[state=open]:animate-[sheet-in_420ms_var(--ease-out-expo)] md:bottom-6 md:rounded-[2.25rem] md:p-7" data-lenis-prevent>
          <D.Title className="sr-only">All sections</D.Title>
          <D.Description className="sr-only">Navigate anywhere in Track</D.Description>
          <div aria-hidden className="mx-auto -mt-1 mb-5 h-1.5 w-10 rounded-full bg-subtle" />

          <div className="mb-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                palette.open();
              }}
              className="flex h-12 flex-1 items-center gap-3 rounded-full bg-surface px-5 text-[15px] text-muted shadow-soft"
            >
              <Search className="size-4" /> Search or jump to…
            </button>
            <ThemeToggle className="size-12 bg-surface shadow-soft" />
          </div>

          {NAV_SECTIONS.map((section, si) => (
            <section key={section.title} className="mb-6">
              <h3 className="mb-2.5 px-1 text-[13px] font-medium text-muted">{section.title}</h3>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {section.items.map((item, i) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <motion.div key={item.href} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * (si * 3 + i), type: "spring", stiffness: 400, damping: 32 }}>
                      <Link
                        href={item.href}
                        onClick={() => onOpenChange(false)}
                        className={cn(
                          "flex h-full flex-col gap-3 rounded-3xl p-4 transition-transform duration-200 active:scale-[0.97]",
                          active ? "bg-foreground text-background" : "bg-surface shadow-soft hover:-translate-y-0.5",
                        )}
                      >
                        <item.icon className="size-5" strokeWidth={1.75} />
                        <span>
                          <span className="block text-[15px] font-medium">{item.label}</span>
                          <span className={cn("block truncate text-xs", active ? "text-background/60" : "text-muted")}>{item.description}</span>
                        </span>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          ))}

          <div className="flex items-center gap-3 rounded-3xl bg-surface p-4 shadow-soft">
            <Link href="/progress" onClick={() => onOpenChange(false)} className="flex min-w-0 flex-1 items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-medium text-background">{userName.charAt(0).toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{userName}</span>
                <span className="mt-1 flex items-center gap-2 text-xs text-muted">
                  Level {level}
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-subtle">
                    <span className="block h-full rounded-full bg-foreground" style={{ width: `${Math.max(4, levelProgress * 100)}%` }} />
                  </span>
                </span>
              </span>
            </Link>
            <form action={logout}>
              <button type="submit" aria-label="Log out" className="inline-flex size-11 items-center justify-center rounded-full bg-subtle transition-colors hover:bg-foreground hover:text-background">
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
