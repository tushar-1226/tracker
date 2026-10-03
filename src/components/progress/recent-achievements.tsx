import Link from "next/link";
import { ACHIEVEMENTS, titleFor } from "@/lib/progress/achievements";
import { AchievementBadge } from "./badge";

export function RecentAchievements({ items }: { items: { key: string; tier: number }[] }) {
  const shown = items.map((i) => ({ ...i, def: ACHIEVEMENTS.find((a) => a.key === i.key) })).filter((i) => i.def);
  if (!shown.length) return null;
  return (
    <Link href="/progress" className="mt-4 flex justify-end gap-1.5" aria-label="Recent achievements">
      {shown.map((i) => (
        <span key={`${i.key}-${i.tier}`} title={titleFor(i.def!, i.tier)}>
          <AchievementBadge module={i.def!.module} tier={i.tier} size={30} />
        </span>
      ))}
    </Link>
  );
}
