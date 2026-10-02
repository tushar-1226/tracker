"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback } from "react";
import { cn } from "@/lib/utils";

/** Theme switch with a circular reveal expanding from the click point. */
export function useThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();

  return useCallback(
    (origin?: { x: number; y: number }) => {
      const next = resolvedTheme === "dark" ? "light" : "dark";
      const apply = () => {
        // Apply synchronously so the transition snapshot captures the new theme.
        const root = document.documentElement;
        root.classList.toggle("dark", next === "dark");
        root.classList.toggle("light", next === "light");
        root.style.colorScheme = next;
        setTheme(next);
      };

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!document.startViewTransition || reduce) return apply();

      const x = origin?.x ?? window.innerWidth / 2;
      const y = origin?.y ?? window.innerHeight / 2;
      const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

      document.startViewTransition(apply).ready.then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
          { duration: 650, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" },
        );
      });
    },
    [resolvedTheme, setTheme],
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const toggle = useThemeSwitch();
  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={(e) => toggle({ x: e.clientX, y: e.clientY })}
      className={cn(
        "relative inline-flex size-9 items-center justify-center rounded-full transition-colors hover:bg-subtle",
        className,
      )}
    >
      <Sun className="size-4 scale-100 rotate-0 transition-transform duration-500 ease-out-expo dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute size-4 scale-0 rotate-90 transition-transform duration-500 ease-out-expo dark:scale-100 dark:rotate-0" />
    </button>
  );
}
