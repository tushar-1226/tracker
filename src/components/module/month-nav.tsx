import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { type MonthKey, addMonths, monthLabel } from "@/lib/money/math";
import { cn } from "@/lib/utils";

/** ← October 2026 → ; never navigates past `max`. */
export function MonthNav({ month, max, href }: { month: MonthKey; max: MonthKey; href: (m: MonthKey) => string }) {
  const next = addMonths(month, 1);
  const btn = "inline-flex size-9 items-center justify-center rounded-full bg-subtle transition-colors hover:bg-foreground hover:text-background";
  return (
    <div className="flex items-center gap-2">
      <Link href={href(addMonths(month, -1))} scroll={false} aria-label="Previous month" className={btn}>
        <ChevronLeft className="size-4" />
      </Link>
      <span className="min-w-36 text-center text-sm font-medium">{monthLabel(month, "long")}</span>
      {next <= max ? (
        <Link href={href(next)} scroll={false} aria-label="Next month" className={btn}>
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className={cn(btn, "pointer-events-none opacity-30")} aria-hidden>
          <ChevronRight className="size-4" />
        </span>
      )}
    </div>
  );
}
