"use client";

import { Leaf, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const subscribe = () => () => {};
const useHydrated = () => useSyncExternalStore(subscribe, () => true, () => false);

/** Theme switch with a circular reveal expanding from the click point. */
export function useThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();

  return useCallback(
    (origin?: { x: number; y: number }) => {
      const next = resolvedTheme === "dark" ? "brown" : resolvedTheme === "brown" ? "white" : "dark";
      const apply = () => {
        // Apply synchronously so the transition snapshot captures the new theme.
        const root = document.documentElement;
        root.classList.remove("dark", "brown", "white");
        root.classList.add(next);
        root.style.colorScheme = next === "white" ? "light" : "dark";
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
  const { resolvedTheme } = useTheme();
  const mounted = useHydrated();

  return (
    <button
      type="button"
      aria-label={mounted ? `Switch theme (currently ${resolvedTheme ?? "white"})` : "Switch theme"}
      onClick={(e) => toggle({ x: e.clientX, y: e.clientY })}
      className={cn(
        "relative inline-flex size-10 items-center justify-center rounded-2xl bg-surface shadow-soft transition-all hover:-translate-y-0.5 hover:bg-subtle",
        className,
      )}
    >
      <Sun className="size-4 scale-100 rotate-0 transition-transform duration-500 ease-out-expo dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute size-4 scale-0 rotate-90 transition-transform duration-500 ease-out-expo dark:scale-100 dark:rotate-0" />
      <Leaf className="absolute size-4 scale-0 rotate-45 transition-transform duration-500 ease-out-expo [.brown_&]:scale-100 [.brown_&]:rotate-0" />
    </button>
  );
}

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const mounted = useHydrated();
  const activeTheme = mounted ? theme : "white";
  const options = [
    { id: "white", label: "White", color: "#ffffff", ink: "#17202b" },
    { id: "dark", label: "Dark", color: "#171717", ink: "#fafafa" },
    { id: "brown", label: "Brown", color: "#2c221d", ink: "#f6ede5" },
  ] as const;
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Theme">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={activeTheme === option.id}
          onClick={() => setTheme(option.id)}
          className={`group rounded-2xl p-2 text-left transition-all ${activeTheme === option.id ? "bg-foreground text-background shadow-soft" : "bg-subtle hover:-translate-y-0.5"}`}
        >
          <span className="mb-2 flex h-12 items-end justify-end rounded-xl p-2" style={{ background: option.color, color: option.ink }}>
            <span className="h-2 w-8 rounded-full opacity-50" style={{ background: option.ink }} />
          </span>
          <span className="px-1 text-xs font-medium">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
