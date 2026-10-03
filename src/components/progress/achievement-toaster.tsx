"use client";

import { AnimatePresence, motion } from "motion/react";
import { Dialog as D } from "radix-ui";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ACHIEVEMENTS, TIER_NAMES, TIER_XP, titleFor } from "@/lib/progress/achievements";
import { markAchievementsSeen } from "@/server/actions/progress";
import { AchievementBadge } from "./badge";

type Unlock = { id: string; key: string; tier: number };

// Remembers dismissals for the session, so a navigation that races the
// "mark seen" request can't show the same celebration twice.
const dismissedThisSession = new Set<string>();

/** Celebrates newly unlocked achievements one at a time, then marks them seen. */
export function AchievementToaster({ unlocks }: { unlocks: Unlock[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const queue = unlocks.filter((u) => !dismissed.has(u.id) && !dismissedThisSession.has(u.id) && ACHIEVEMENTS.some((a) => a.key === u.key));
  const current = queue[0];
  const def = current && ACHIEVEMENTS.find((a) => a.key === current.key)!;

  const next = () => {
    if (!current) return;
    dismissedThisSession.add(current.id);
    setDismissed((d) => new Set(d).add(current.id));
    void markAchievementsSeen([current.id]);
  };

  // Built on the Radix dialog layer stack so it stays interactive even when it
  // opens on top of another dialog (e.g. the workout summary).
  return (
    <D.Root open={!!(current && def)} onOpenChange={(open) => !open && next()}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[60] bg-background/70 backdrop-blur-md data-[state=open]:animate-[fade-in_200ms_ease-out]" />
        <D.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-[61] flex items-center justify-center p-6 outline-none"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <AnimatePresence mode="wait">
            {current && def && (
              <motion.div
                key={current.id}
                initial={{ opacity: 0, scale: 0.92, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -8 }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
                className="flex w-full max-w-sm flex-col items-center rounded-none border bg-background p-8 text-center shadow-2xl shadow-black/10"
              >
                <p className="text-xs font-medium tracking-[0.2em] text-muted uppercase">Achievement unlocked</p>
                <div className="my-7">
                  <AchievementBadge module={def.module} tier={current.tier} size={120} draw />
                </div>
                <D.Title className="text-2xl font-semibold tracking-tight">{titleFor(def, current.tier)}</D.Title>
                <p className="mt-2 text-sm text-muted">{def.describe(def.thresholds[current.tier])}</p>
                <p className="mt-4 text-xs text-muted">
                  {def.thresholds.length > 1 && `${TIER_NAMES[current.tier]} · `}+{TIER_XP[current.tier]} XP
                </p>
                <Button size="lg" className="mt-7 w-full" onClick={next} autoFocus>
                  {queue.length > 1 ? `Next (${queue.length - 1} more)` : "Nice"}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
