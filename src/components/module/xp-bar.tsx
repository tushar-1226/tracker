"use client";

import { motion } from "motion/react";

export function XpBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-hairline">
      <motion.div
        className="h-full rounded-full bg-foreground"
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(2, value * 100)}%` }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
      />
    </div>
  );
}
