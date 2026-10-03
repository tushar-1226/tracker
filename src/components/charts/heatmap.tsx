"use client";

import { useEffect, useRef } from "react";
import { type Day, addDays, eachDay, startOfWeek, toDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

const OPACITY = [0, 0.28, 0.5, 0.75, 1];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * GitHub-style grid. `levels` maps a day to intensity 0–4; days before `start`
 * or after `end` render as empty slots.
 */
export function Heatmap({
  levels,
  end,
  start,
  weeks = 53,
  weekStartsOn = 1,
  describe,
  className,
}: {
  levels: Record<Day, number>;
  end: Day;
  start?: Day;
  weeks?: number;
  weekStartsOn?: 0 | 1;
  describe?: (day: Day, level: number | undefined) => string;
  className?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  const first = addDays(startOfWeek(end, weekStartsOn), -7 * (weeks - 1));
  const days = eachDay(first, addDays(first, weeks * 7 - 1));
  const columns = Array.from({ length: weeks }, (_, w) => days.slice(w * 7, w * 7 + 7));

  return (
    <div ref={scroller} className={cn("overflow-x-auto pb-1", className)} data-lenis-prevent>
      <div className="inline-flex flex-col gap-1.5">
        <div className="flex gap-[3px] text-[10px] text-muted">
          {columns.map((col, i) => {
            const monthStart = col.find((d) => d.endsWith("-01"));
            return (
              <span key={i} className="w-[11px] overflow-visible whitespace-nowrap">
                {monthStart || i === 0 ? MONTHS[toDate(monthStart ?? col[0]).getUTCMonth()] : ""}
              </span>
            );
          })}
        </div>
        <div className="flex gap-[3px]">
          {columns.map((col, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {col.map((day) => {
                const future = day > end;
                const beforeStart = start !== undefined && day < start;
                const outside = future || beforeStart;
                const level = levels[day];
                return (
                  <span
                    key={day}
                    title={outside ? undefined : (describe?.(day, level) ?? day)}
                    className={cn(
                      "size-[11px] rounded-[3px] animate-[cell-in_500ms_var(--ease-out-expo)_both]",
                      future ? "bg-transparent" : level && !beforeStart ? "bg-foreground" : "bg-hairline",
                      day === end && "ring-1 ring-foreground ring-offset-1 ring-offset-background",
                    )}
                    style={{
                      opacity: beforeStart ? 0.4 : !outside && level ? OPACITY[level] : 1,
                      animationDelay: `${i * 6}ms`,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HeatmapLegend() {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-muted">
      Less
      {OPACITY.map((o, i) => (
        <span
          key={i}
          className={cn("size-[11px] rounded-[3px]", i ? "bg-foreground" : "bg-hairline")}
          style={{ opacity: i ? o : 1 }}
        />
      ))}
      More
    </div>
  );
}
