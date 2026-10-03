"use client";

import { motion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/utils";

/** Pill-style single choice with a sliding highlight. Submits as a hidden input when `name` is set. */
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
    <div role="radiogroup" className={cn("flex border p-0.5", className)}>
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
            className={cn(
              "relative h-8 flex-1 px-3 text-[10px] font-semibold tracking-[0.12em] whitespace-nowrap uppercase transition-colors",
              active ? "text-background" : "text-muted hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-none bg-foreground"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
