"use client";

import { motion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/utils";

/** iOS-style segmented control: a sliding raised thumb on a soft track. */
export function Segmented<T extends string>({
  name,
  value,
  onChange,
  options,
  className,
}: {
  name?: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  const id = useId();
  return (
    <div role="radiogroup" className={cn("flex rounded-full bg-subtle p-1", className)}>
      {name && <input type="hidden" name={name} value={value} />}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn("relative h-9 flex-1 rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors", active ? "text-foreground" : "text-muted hover:text-foreground")}
          >
            {active && (
              <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-full bg-surface shadow-soft" transition={{ type: "spring", stiffness: 500, damping: 38 }} />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
