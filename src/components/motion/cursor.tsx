"use client";

import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type CursorState = "default" | "hover" | "text" | "hidden";

const INTERACTIVE = "a, button, [role=button], [role=option], [role=menuitem], label, select, summary, [data-cursor]";
const TEXT = "input:not([type=checkbox]):not([type=radio]):not([type=range]), textarea, [contenteditable=true]";

/**
 * Dot + trailing ring cursor. Inverts automatically over any surface via
 * mix-blend-mode: difference. Add `data-cursor-label="Open"` to any element
 * to show a label inside the ring.
 */
export function Cursor() {
  const reduce = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [state, setState] = useState<CursorState>("hidden");
  const [label, setLabel] = useState<string | null>(null);
  const [pressed, setPressed] = useState(false);

  // The hovered element may unmount on navigation without a new pointermove; drop its label.
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setLabel(null);
    if (state === "hover") setState("default");
  }

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 500, damping: 40, mass: 0.4 });
  const ringY = useSpring(y, { stiffness: 500, damping: 40, mass: 0.4 });

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    const update = () => setEnabled(mq.matches && !reduce);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [reduce]);

  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    root.classList.add("custom-cursor");

    const onMove = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const target = e.target as Element | null;
      if (!target?.closest) return;
      if (target.closest(TEXT)) {
        setState("text");
        setLabel(null);
        return;
      }
      const interactive = target.closest(INTERACTIVE);
      setState(interactive ? "hover" : "default");
      setLabel(interactive?.getAttribute("data-cursor-label") ?? null);
    };
    const onLeave = () => setState("hidden");
    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);
    const onKey = () => setLabel(null);

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("keydown", onKey);
    return () => {
      root.classList.remove("custom-cursor");
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  const visible = state !== "hidden" && state !== "text";
  const ringSize = label ? 72 : state === "hover" ? 48 : 30;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[9999] mix-blend-difference">
      <motion.div
        className="absolute top-0 left-0 rounded-none bg-white"
        style={{ x, y, translateX: "-50%", translateY: "-50%" }}
        animate={{
          width: state === "hover" ? 0 : 6,
          height: state === "hover" ? 0 : 6,
          opacity: visible ? 1 : 0,
        }}
        transition={{ duration: 0.15 }}
      />
      <motion.div
        className="absolute top-0 left-0 flex items-center justify-center rounded-none border border-white"
        style={{ x: ringX, y: ringY, translateX: "-50%", translateY: "-50%" }}
        animate={{
          width: ringSize,
          height: ringSize,
          opacity: visible ? 1 : 0,
          scale: pressed ? 0.85 : 1,
          backgroundColor: label ? "rgba(255,255,255,1)" : "rgba(255,255,255,0)",
        }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        <AnimatePresence>
          {label && (
            <motion.span
              key={label}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              className="text-[11px] font-medium text-black"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
