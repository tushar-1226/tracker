"use client";

import { cn } from "@/lib/utils";

/** Wrapping single-choice chips; submits through a hidden input when `name` is set. */
export function Chips<T extends string>({
  name,
  value,
  onChange,
  options,
  className,
}: {
  name?: string;
  value: T | "";
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  className?: string;
}) {
  return (
    <div role="radiogroup" className={cn("flex flex-wrap gap-1.5", className)}>
      {name && <input type="hidden" name={name} value={value} />}
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors [&_svg]:size-3.5",
              on ? "border-foreground bg-foreground text-background" : "text-muted hover:border-foreground/40 hover:text-foreground",
            )}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
