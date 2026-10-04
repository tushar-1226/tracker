import { ArrowUpRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { NumberTicker } from "@/components/motion/number-ticker";
import { CardLabel } from "@/components/ui/card";
import { unitLabel } from "@/lib/habits/view";

export function StatCard({
  href,
  icon: Icon,
  label,
  value,
  prefix,
  unit,
  hint,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  value: number;
  prefix?: string;
  unit?: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      data-cursor-label="Open"
      className="group flex h-full flex-col justify-between gap-8 rounded-3xl bg-surface p-6 transition-colors duration-300 hover:bg-subtle"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Icon className="size-4 text-muted" />
          <CardLabel>{label}</CardLabel>
        </span>
        <ArrowUpRight className="size-4 text-muted opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
      </div>
      <div>
        <p className="flex items-baseline gap-1.5">
          <NumberTicker value={value} prefix={prefix} className="tabular text-4xl font-medium" />
          {unit && <span className="text-sm text-muted">{unitLabel(value, unit)}</span>}
        </p>
        <p className="mt-1 text-sm text-muted">{hint}</p>
      </div>
    </Link>
  );
}
