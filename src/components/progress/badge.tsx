"use client";

import { motion } from "motion/react";
import { useId } from "react";
import type { ModuleKey } from "@/lib/progress/modules";
import { MODULE_ICON } from "./module-icon";

const HEX = "M50 4 L90 27 L90 73 L50 96 L10 73 L10 27 Z";

/**
 * Achievement badge in pure B&W. Tier is encoded by fill, not colour:
 * locked = dashed outline, bronze = outline, silver = hatched, gold = solid.
 */
export function AchievementBadge({
  module,
  tier,
  size = 64,
  draw = false,
}: {
  module: ModuleKey | "meta";
  /** -1 = locked, 0 bronze, 1 silver, 2 gold */
  tier: number;
  size?: number;
  /** Animate the outline being drawn (unlock moment). */
  draw?: boolean;
}) {
  const id = useId();
  const Icon = MODULE_ICON[module];
  const locked = tier < 0;
  const solid = tier >= 2;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} className="absolute inset-0">
        <defs>
          <pattern id={`hatch-${id}`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="7" stroke="var(--foreground)" strokeWidth="2.5" />
          </pattern>
        </defs>
        {tier === 1 && <path d={HEX} fill={`url(#hatch-${id})`} opacity={0.35} />}
        {solid && (
          <motion.path
            d={HEX}
            fill="var(--foreground)"
            initial={draw ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ delay: draw ? 0.7 : 0, duration: 0.4 }}
          />
        )}
        <motion.path
          d={HEX}
          fill="none"
          stroke={locked ? "var(--muted)" : "var(--foreground)"}
          strokeWidth={locked ? 2 : 3}
          strokeDasharray={locked ? "5 5" : undefined}
          strokeLinejoin="round"
          initial={draw ? { pathLength: 0 } : false}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <Icon className={locked ? "text-muted" : solid ? "text-background" : "text-foreground"} style={{ width: size * 0.32, height: size * 0.32 }} strokeWidth={1.75} />
    </span>
  );
}
