"use client";

import { motion } from "motion/react";
import { useId } from "react";

/** Progress ring in the current tint, with a soft gradient and glow; `value` is 0–1. */
export function Ring({
  value,
  size = 160,
  stroke = 10,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const id = useId().replace(/[^\w-]/g, "");
  const r = (size - stroke) / 2;
  const clamped = Math.min(1, Math.max(0, value));

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Soft halo that grows with progress. */}
      <span
        aria-hidden
        className="absolute inset-[12%] rounded-full blur-2xl transition-opacity duration-700"
        style={{ background: "var(--tint)", opacity: 0.08 + clamped * 0.14 }}
      />
      <svg width={size} height={size} className="relative -rotate-90">
        <defs>
          <linearGradient id={`ring-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: "color-mix(in oklab, var(--tint) 55%, var(--surface))" }} />
            <stop offset="100%" style={{ stopColor: "var(--tint)" }} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--tint-soft)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#ring-${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: clamped, opacity: clamped === 0 ? 0 : 1 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
