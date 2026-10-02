"use client";

import { motion } from "motion/react";
import { type Day, WEEKDAY_SHORT, addDays, dayOfWeek } from "@/lib/dates";
import { cn } from "@/lib/utils";

/** Last 7 days; pick one to check in for (or backfill). */
export function WeekStrip({
  today,
  selected,
  onSelect,
  completion,
}: {
  today: Day;
  selected: Day;
  onSelect: (day: Day) => void;
  completion: (day: Day) => number | null;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((day) => {
        const active = day === selected;
        const ratio = completion(day);
        return (
          <button
            key={day}
            type="button"
            onClick={() => onSelect(day)}
            aria-pressed={active}
            className={cn(
              "relative flex flex-col items-center gap-1.5 rounded-2xl py-2.5 transition-colors",
              active ? "text-background" : "hover:bg-subtle",
            )}
          >
            {active && (
              <motion.span
                layoutId="week-strip-active"
                className="absolute inset-0 rounded-2xl bg-foreground"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <span className={cn("relative text-[10px] uppercase", !active && "text-muted")}>
              {day === today ? "Today" : WEEKDAY_SHORT[dayOfWeek(day)]}
            </span>
            <span className="tabular relative text-base font-medium">{Number(day.slice(8))}</span>
            <MiniRing ratio={ratio} active={active} />
          </button>
        );
      })}
    </div>
  );
}

function MiniRing({ ratio, active }: { ratio: number | null; active: boolean }) {
  const color = active ? "var(--background)" : "var(--foreground)";
  return (
    <svg width="16" height="16" className="relative -rotate-90">
      <circle cx="8" cy="8" r="6" fill="none" stroke={color} strokeOpacity={0.2} strokeWidth="2" strokeDasharray={ratio === null ? "2 2" : undefined} />
      {ratio !== null && ratio > 0 && (
        <motion.circle
          cx="8"
          cy="8"
          r="6"
          fill={ratio >= 1 ? color : "none"}
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          initial={false}
          animate={{ pathLength: ratio }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
    </svg>
  );
}
