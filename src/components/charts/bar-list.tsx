"use client";

import { motion } from "motion/react";

export type BarItem = { key: string; label: string; value: number; icon?: React.ReactNode; hint?: string };

/** Horizontal ranked bars; the value sits at the tip, so nothing needs hovering. */
export function BarList({ items, format }: { items: BarItem[]; format: (v: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={item.key} className="group">
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              {item.icon}
              <span className="truncate">{item.label}</span>
            </span>
            <span className="shrink-0 tabular-nums">
              {format(item.value)}
              {item.hint && <span className="ml-1.5 text-xs text-muted">{item.hint}</span>}
            </span>
          </div>
          <div className="h-2 w-full">
            <motion.div
              className="h-full rounded-r-[4px] rounded-l-[1px] bg-foreground transition-opacity group-hover:opacity-80"
              initial={{ width: 0 }}
              whileInView={{ width: `${(item.value / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: i * 0.04 }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
