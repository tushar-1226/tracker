"use client";

import { usePathname } from "next/navigation";
import { NAV_ITEMS, isActive } from "@/components/layout/nav";
import { IconChip } from "@/components/ui/icon-chip";

/** The current section's nav icon in a tinted chip. */
export function SectionIcon() {
  const pathname = usePathname();
  const item = [...NAV_ITEMS].reverse().find((i) => i.href !== "/" && isActive(pathname, i.href));
  return item ? <IconChip icon={item.icon} size="lg" className="mb-5" /> : null;
}
