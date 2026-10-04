import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { ProgressView } from "@/components/progress/progress-view";
import { db } from "@/db";
import { xpEvents } from "@/db/schema";
import { addDays, startOfWeek } from "@/lib/dates";
import { levelFromXp } from "@/lib/progress/levels";
import { MODULES } from "@/lib/progress/modules";
import { getProgress, listUnlocked } from "@/server/progress";

export const metadata: Metadata = { title: "Progress" };

export default async function ProgressPage() {
  const p = await getProgress();
  const weekStartsOn = p.user.settings.weekStartsOn ?? 1;
  const [unlockedRows, recent] = await Promise.all([
    listUnlocked(p.user.id),
    db.select({ source: xpEvents.source, amount: xpEvents.amount, createdAt: xpEvents.createdAt }).from(xpEvents).where(eq(xpEvents.userId, p.user.id)).orderBy(desc(xpEvents.createdAt)).limit(15),
  ]);
  const unlocked: Record<string, number> = {};
  for (const u of unlockedRows) unlocked[u.key] = Math.max(unlocked[u.key] ?? 0, u.tier + 1);

  const thisWeek = startOfWeek(p.today, weekStartsOn);
  const weeklyXp = Array.from({ length: 12 }, (_, i) => {
    const week = addDays(thisWeek, -7 * (11 - i));
    let xp = 0;
    for (let d = 0; d < 7; d++) xp += p.xp.byDay.get(addDays(week, d)) ?? 0;
    return { week, xp };
  });

  return (
    <ProgressView
      year={Number(p.today.slice(0, 4))}
      overall={p.xp.overall}
      totalXp={p.xp.total}
      modules={MODULES.map((m) => {
        const xp = p.xp.byModule[m.key];
        const l = levelFromXp(xp);
        return { key: m.key, label: m.label, href: m.href, xp, level: l.level, progress: l.progress, current: l.current, needed: l.needed };
      })}
      lifeSeries={p.life.series}
      weeklyXp={weeklyXp}
      metrics={p.metrics}
      unlocked={unlocked}
      recent={recent.map((r) => ({ source: r.source, amount: r.amount, at: r.createdAt.getTime() }))}
    />
  );
}
