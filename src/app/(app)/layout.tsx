import { CommandPaletteProvider } from "@/components/layout/command-palette";
import { MobileHeader, MobileTabBar } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { TimezoneSync } from "@/components/layout/timezone-sync";
import { getCurrentUser } from "@/lib/auth/dal";
import { AchievementToaster } from "@/components/progress/achievement-toaster";
import { getProgress, listUnlocked } from "@/server/progress";
import { getTimeZone } from "@/server/today";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, timeZone] = await Promise.all([getCurrentUser(), getTimeZone()]);
  // Syncs XP, achievements and goals; re-runs after every mutation (refresh()).
  const progress = await getProgress();
  const unseen = (await listUnlocked(user.id))
    .filter((u) => !u.seenAt)
    .sort((a, b) => a.unlockedAt.getTime() - b.unlockedAt.getTime() || a.tier - b.tier)
    .map(({ id, key, tier }) => ({ id, key, tier }));

  return (
    <CommandPaletteProvider>
      <TimezoneSync serverTimeZone={timeZone} storedTimeZone={user.settings.timeZone} />
      <Sidebar userName={user.name} level={progress.xp.overall.level} levelProgress={progress.xp.overall.progress} />
      <MobileHeader />
      <main className="min-h-dvh pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-16 md:pl-20 lg:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 pt-8 md:px-8 md:pt-12">{children}</div>
      </main>
      <MobileTabBar />
      <AchievementToaster unlocks={unseen} />
    </CommandPaletteProvider>
  );
}
