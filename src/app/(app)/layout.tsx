import { CommandPaletteProvider } from "@/components/layout/command-palette";
import { AppHeader } from "@/components/layout/app-header";
import { Dock } from "@/components/layout/dock";
import { TimezoneSync } from "@/components/layout/timezone-sync";
import { CursorSetting } from "@/components/motion/cursor-setting";
import { getCurrentUser } from "@/lib/auth/dal";
import { OutboxSync } from "@/components/pwa/outbox-sync";
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
      <OutboxSync />
      <TimezoneSync serverTimeZone={timeZone} storedTimeZone={user.settings.timeZone} />
      <CursorSetting enabled={user.settings.cursor !== false} />
      <AppHeader userName={user.name} level={progress.xp.overall.level} levelProgress={progress.xp.overall.progress} />
      <main className="min-h-dvh pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-6xl px-4 pt-6 md:px-8 md:pt-10">{children}</div>
      </main>
      <Dock userName={user.name} level={progress.xp.overall.level} levelProgress={progress.xp.overall.progress} />
      <AchievementToaster unlocks={unseen} />
    </CommandPaletteProvider>
  );
}
