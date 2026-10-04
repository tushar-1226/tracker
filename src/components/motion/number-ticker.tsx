"use client";

import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

/** Counts up from 0 to `value` the first time it becomes visible. */
export function NumberTicker({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 1.2,
  className,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node || !inView) return;
    const fmt = new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    const render = (v: number) => (node.textContent = `${prefix}${fmt.format(v)}${suffix}`);
    if (reduce) return void render(value);
    const controls = animate(0, value, { duration, ease: [0.22, 1, 0.36, 1], onUpdate: render });
    return () => controls.stop();
  }, [inView, value, decimals, prefix, suffix, duration, reduce]);

  const final = `${prefix}${new Intl.NumberFormat("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value)}${suffix}`;
  // The animated digits are decorative; assistive tech (and text extraction) gets the real value.
  return (
    <span className={className}>
      <span ref={ref} aria-hidden="true">
        {prefix}0{suffix}
      </span>
      <span className="sr-only">{final}</span>
    </span>
  );
}
