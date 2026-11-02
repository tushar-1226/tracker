import { ArrowUpRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { NumberTicker } from "@/components/motion/number-ticker";
import { CardLabel } from "@/components/ui/card";
import { IconChip, type Tint } from "@/components/ui/icon-chip";
import { unitLabel } from "@/lib/habits/view";
import { cn } from "@/lib/utils";

export function StatCard({
  href,
  icon,
  label,
  value,
  prefix,
  unit,
  hint,
  tint,
  progress,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  value: number;
  prefix?: string;
  unit?: string;
  hint: string;
  tint?: Tint;
  /** Optional 0–1 meter toward a target, drawn along the bottom. */
  progress?: number;
}) {
  return (
    <Link
      href={href}
      data-cursor-label="Open"
      className={cn(
        "group relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-3xl bg-surface p-5 md:gap-8 md:p-6 transition-transform duration-300 hover:-translate-y-0.5",
        tint && `tint-${tint}`,
      )}
    >
      {/* Tinted wash that blooms on hover. */}
      <span aria-hidden className="tint-glow pointer-events-none absolute inset-0 opacity-70 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="relative flex items-center justify-between">
        <span className="flex items-center gap-3">
          <IconChip icon={icon} size="sm" className="rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" />
          <CardLabel>{label}</CardLabel>
        </span>
        <ArrowUpRight className="size-4 text-tint-ink opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
      </div>
      <div className="relative">
        <p className="flex items-baseline gap-1.5">
          <NumberTicker value={value} prefix={prefix} className="tabular text-3xl font-medium md:text-4xl" />
          {unit && <span className="text-sm text-muted">{unitLabel(value, unit)}</span>}
        </p>
        <p className="mt-1 truncate text-sm text-muted">{hint}</p>
        {progress !== undefined && (
          <span className="mt-4 block h-1.5 overflow-hidden rounded-full bg-tint-soft">
            <span className="block h-full rounded-full bg-tint-gradient transition-[width] duration-700" style={{ width: `${Math.min(1, Math.max(0.03, progress)) * 100}%` }} />
          </span>
        )}
      </div>
    </Link>
  );
}
