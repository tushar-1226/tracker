"use client";

import { cn } from "@/lib/utils";

/** Wrapping single-choice pills; submits through a hidden input when `name` is set. */
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
    <div role="radiogroup" className={cn("flex flex-wrap gap-2", className)}>
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
              "inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium transition-all duration-200 active:scale-95 [&_svg]:size-4",
              on ? "bg-foreground text-background shadow-soft" : "bg-subtle text-muted hover:text-foreground",
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
