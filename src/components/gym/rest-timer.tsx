"use client";

import { Minus, Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/fitness";

export type Rest = { endsAt: number; total: number } | null;

/** Floating rest countdown. Vibrates (where supported) when it ends. */
export function RestTimer({ rest, onChange }: { rest: Rest; onChange: (rest: Rest) => void }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!rest) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= rest.endsAt) {
        navigator.vibrate?.([120, 80, 120]);
        clearInterval(id);
        setTimeout(() => onChange(null), 1500);
      }
    }, 250);
    return () => clearInterval(id);
  }, [rest, onChange]);

  const left = rest ? Math.max(0, Math.ceil((rest.endsAt - now) / 1000)) : 0;
  const progress = rest ? Math.min(1, 1 - (rest.endsAt - now) / (rest.total * 1000)) : 0;
  const adjust = (sec: number) => rest && onChange({ endsAt: Math.max(Date.now(), rest.endsAt + sec * 1000), total: Math.max(5, rest.total + sec) });

  return (
    <AnimatePresence>
      {rest && (
        <motion.div
          initial={{ y: 40, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
          className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 lg:bottom-8 lg:left-[calc(50%+8rem)]"
          role="timer"
          aria-live="polite"
        >
          <div className="relative flex items-center gap-1 overflow-hidden rounded-full bg-foreground py-1.5 pr-1.5 pl-5 text-background shadow-2xl shadow-black/20">
            <motion.span
              className="absolute inset-y-0 left-0 bg-background/15"
              animate={{ width: `${progress * 100}%` }}
              transition={{ ease: "linear", duration: 0.25 }}
            />
            <span className="relative mr-2 text-xs opacity-70">{left === 0 ? "Go" : "Rest"}</span>
            <span className="tabular relative mr-2 min-w-12 text-lg font-medium">{formatDuration(left)}</span>
            {[
              { label: "15 seconds less", icon: Minus, fn: () => adjust(-15) },
              { label: "15 seconds more", icon: Plus, fn: () => adjust(15) },
              { label: "Skip rest", icon: X, fn: () => onChange(null) },
            ].map(({ label, icon: Icon, fn }) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                onClick={fn}
                className="relative inline-flex size-9 items-center justify-center rounded-full transition-colors hover:bg-background/15"
              >
                <Icon className="size-4" />
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
