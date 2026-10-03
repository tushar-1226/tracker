"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { isDone } from "@/lib/habits/stats";
import type { HabitView } from "@/lib/habits/view";
import { cn } from "@/lib/utils";

const SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;

/** The one-tap check-in control, adapted to the habit's type. */
export function HabitControl({
  habit,
  value,
  onChange,
  size = "md",
}: {
  habit: HabitView;
  value: number | undefined;
  onChange: (value: number) => void;
  size?: "md" | "lg";
}) {
  const [pops, setPops] = useState(0);
  const done = isDone(habit, value);
  const current = value ?? 0;

  const change = (next: number) => {
    if (habit.type !== "quit" && !done && isDone(habit, next)) setPops((p) => p + 1);
    onChange(Math.max(0, next));
  };

  if (habit.type === "quit") {
    const slipped = !!value;
    return (
      <button
        type="button"
        onClick={() => onChange(slipped ? 0 : 1)}
        aria-pressed={slipped}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-none border px-3.5 text-xs font-medium transition-colors",
          slipped ? "border-dashed text-muted hover:text-foreground" : "hover:bg-subtle",
        )}
      >
        {slipped ? (
          <>
            <RotateCcw className="size-3.5" /> Slipped
          </>
        ) : (
          "Log slip"
        )}
      </button>
    );
  }

  if (habit.type === "check") {
    return (
      <div className="relative">
        <CheckButton done={done} onClick={() => change(done ? 0 : 1)} size={size} />
        <XpPop count={pops} />
      </div>
    );
  }

  const step = habit.type === "duration" ? 5 : 1;
  const ratio = Math.min(1, current / Math.max(1, habit.target));
  const dim = size === "lg" ? 56 : 40;
  const r = dim / 2 - 3;

  return (
    <div className="relative flex items-center gap-1">
      <button
        type="button"
        aria-label="Decrease"
        onClick={() => change(current - step)}
        disabled={current === 0}
        className="inline-flex size-8 items-center justify-center rounded-none text-muted transition-colors hover:bg-subtle hover:text-foreground disabled:opacity-30"
      >
        <Minus className="size-3.5" />
      </button>
      <motion.button
        type="button"
        whileTap={{ scale: 0.88 }}
        aria-label={`Add ${step}`}
        onClick={() => change(current + step)}
        className="relative flex items-center justify-center rounded-none"
        style={{ width: dim, height: dim }}
      >
        <svg width={dim} height={dim} className="absolute inset-0 -rotate-90">
          <circle cx={dim / 2} cy={dim / 2} r={r} fill="none" stroke="var(--hairline)" strokeWidth={2.5} />
          <motion.circle
            cx={dim / 2}
            cy={dim / 2}
            r={r}
            fill={done ? "var(--foreground)" : "transparent"}
            stroke="var(--foreground)"
            strokeWidth={2.5}
            strokeLinecap="round"
            initial={false}
            animate={{ pathLength: ratio, opacity: ratio === 0 ? 0 : 1 }}
            transition={SPRING}
          />
        </svg>
        <span className={cn("tabular relative text-xs font-medium", done && "text-background")}>{current}</span>
      </motion.button>
      <button
        type="button"
        aria-label="Increase"
        onClick={() => change(current + step)}
        className="inline-flex size-8 items-center justify-center rounded-none text-muted transition-colors hover:bg-subtle hover:text-foreground"
      >
        <Plus className="size-3.5" />
      </button>
      <XpPop count={pops} />
    </div>
  );
}

export function CheckButton({
  done,
  onClick,
  size = "md",
}: {
  done: boolean;
  onClick: () => void;
  size?: "md" | "lg";
}) {
  const dim = size === "lg" ? 56 : 36;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={done}
      aria-label={done ? "Mark as not done" : "Mark as done"}
      whileTap={{ scale: 0.85 }}
      className="relative flex items-center justify-center rounded-none border-[1.5px] border-foreground/25 transition-colors hover:bg-subtle"
      style={{ width: dim, height: dim }}
    >
      <motion.span
        className="absolute -inset-px rounded-none bg-foreground"
        initial={false}
        animate={{ scale: done ? 1 : 0 }}
        transition={SPRING}
      />
      <svg viewBox="0 0 24 24" className="relative size-1/2" fill="none">
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke="var(--background)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: done ? 1 : 0 }}
          transition={{ duration: 0.3, ease: "easeOut", delay: done ? 0.08 : 0 }}
        />
      </svg>
    </motion.button>
  );
}

/** "+10 XP" that floats up whenever `count` increases. */
function XpPop({ count }: { count: number }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          key={count}
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: [0, 1, 1, 0], y: -28 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="tabular pointer-events-none absolute -top-2 right-0 text-[11px] font-medium"
        >
          +10 XP
        </motion.span>
      )}
    </AnimatePresence>
  );
}
