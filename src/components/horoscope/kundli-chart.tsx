"use client";

import { motion } from "motion/react";

// North Indian chart: houses are fixed, signs rotate. Anchor points in a 400×400 box, house 1 at the top centre.
const ANCHOR: [number, number][] = [
  [200, 104], [104, 46], [52, 104], [104, 200], [52, 296], [104, 354],
  [200, 296], [296, 354], [348, 296], [296, 200], [348, 104], [296, 46],
];
// Where each house's sign number sits (near the inner corner).
const SIGN_AT: [number, number][] = [
  [200, 178], [104, 18], [13, 104], [178, 200], [13, 296], [104, 386],
  [200, 226], [296, 386], [387, 296], [222, 200], [387, 104], [296, 18],
];

/**
 * North Indian kundli. `ascRashi` is the sign in house 1; `planets[h]` lists the labels
 * to draw in house h (1–12).
 */
export function KundliChart({ ascRashi, planets, label }: { ascRashi: number; planets: Record<number, string[]>; label: string }) {
  return (
    <svg viewBox="0 0 400 400" role="img" aria-label={label} className="h-auto w-full max-w-[420px]">
      <motion.g stroke="var(--foreground)" strokeOpacity={0.22} strokeWidth={1.5} fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}>
        <rect x="1" y="1" width="398" height="398" rx="28" />
        <motion.path d="M28 28 L372 372 M372 28 L28 372" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
        <motion.path d="M200 1 L399 200 L200 399 L1 200 Z" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }} />
      </motion.g>
      {ANCHOR.map(([x, y], i) => {
        const house = i + 1;
        const sign = ((ascRashi + i) % 12) + 1;
        const list = planets[house] ?? [];
        const [sx, sy] = SIGN_AT[i];
        return (
          <g key={house}>
            <text x={sx} y={sy} textAnchor="middle" dominantBaseline="middle" className="fill-muted text-[13px] tabular-nums">
              {sign}
            </text>
            {list.map((p, j) => (
              <motion.g key={p} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.03 }}>
                <text
                  x={x}
                  y={y + (j - (list.length - 1) / 2) * 17}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-foreground text-[14px] font-medium"
                >
                  {p}
                </text>
              </motion.g>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
