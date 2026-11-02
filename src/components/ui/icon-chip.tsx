import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Tint = "accent" | "habits" | "money" | "fitness" | "learning" | "reading" | "mind" | "astro" | "meta";

const SIZES = { sm: "size-8 [&_svg]:size-4", md: "size-10 [&_svg]:size-[18px]", lg: "size-14 rounded-2xl [&_svg]:size-6" } as const;

/** An icon in a soft squircle of its section's tint (or the current one when `tint` is omitted). */
export function IconChip({ icon: Icon, tint, size = "md", className }: { icon: LucideIcon; tint?: Tint; size?: keyof typeof SIZES; className?: string }) {
  return (
    <span className={cn("icon-chip", tint && `tint-${tint}`, SIZES[size], className)}>
      <Icon strokeWidth={1.85} />
    </span>
  );
}
