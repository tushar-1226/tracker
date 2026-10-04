"use client";

import { BookOpen, Dumbbell, LayoutGrid, ListChecks, MoonStar, Wallet, type LucideIcon } from "lucide-react";
import { AnimatePresence, type MotionValue, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { MoreSheet } from "./more-sheet";
import { NAV_ITEMS, isActive } from "./nav";

const DOCK: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Home", icon: LayoutGrid },
  { href: "/habits", label: "Habits", icon: ListChecks },
  { href: "/money", label: "Money", icon: Wallet },
  { href: "/gym", label: "Gym", icon: Dumbbell },
  { href: "/horoscope", label: "Horoscope", icon: MoonStar },
];

/**
 * Floating dock on every screen size. The active item expands into a labelled pill;
 * on desktop the icons magnify toward the pointer.
 */
export function Dock({ userName, level, levelProgress }: { userName: string; level: number; levelProgress: number }) {
  const pathname = usePathname();
  const mouseX = useMotionValue(Infinity);
  const [moreOpen, setMoreOpen] = useState(false);
  const inDock = DOCK.some((d) => isActive(pathname, d.href));
  const current = NAV_ITEMS.find((i) => isActive(pathname, i.href));

  return (
    <>
      <nav
        aria-label="Main"
        onMouseMove={(e) => mouseX.set(e.clientX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="fixed bottom-[calc(0.875rem+env(safe-area-inset-bottom))] left-1/2 z-40 flex -translate-x-1/2 items-end gap-1 rounded-full bg-surface/80 p-1.5 shadow-lift backdrop-blur-2xl backdrop-saturate-150"
      >
        {DOCK.map((d) => (
          <DockItem key={d.href} item={d} active={isActive(pathname, d.href)} mouseX={mouseX} />
        ))}
        <span aria-hidden className="mx-1 mb-3 h-6 w-px bg-hairline" />
        <DockButton
          label={!inDock && current ? current.label : "More"}
          active={!inDock}
          mouseX={mouseX}
          onClick={() => setMoreOpen(true)}
          icon={!inDock && current ? current.icon : BookOpen}
          more
        />
      </nav>
      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} userName={userName} level={level} levelProgress={levelProgress} />
    </>
  );
}

function useMagnify(ref: React.RefObject<HTMLElement | null>, mouseX: MotionValue<number>) {
  const reduce = useReducedMotion();
  const distance = useTransform(mouseX, (x) => {
    const r = ref.current?.getBoundingClientRect();
    return r ? x - (r.left + r.width / 2) : Infinity;
  });
  const scale = useTransform(distance, [-120, 0, 120], [1, reduce ? 1 : 1.28, 1]);
  return useSpring(scale, { stiffness: 400, damping: 28, mass: 0.4 });
}

function DockItem({ item, active, mouseX }: { item: (typeof DOCK)[number]; active: boolean; mouseX: MotionValue<number> }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const scale = useMagnify(ref, mouseX);
  return (
    <Link ref={ref} href={item.href} aria-label={item.label} aria-current={active ? "page" : undefined} className="group relative">
      <DockPill icon={item.icon} label={item.label} active={active} scale={scale} />
    </Link>
  );
}

function DockButton({ label, icon, active, mouseX, onClick, more }: { label: string; icon: LucideIcon; active: boolean; mouseX: MotionValue<number>; onClick: () => void; more?: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  const scale = useMagnify(ref, mouseX);
  return (
    <button ref={ref} type="button" onClick={onClick} aria-label={more ? "All sections" : label} className="group relative">
      <DockPill icon={icon} label={label} active={active} scale={scale} />
    </button>
  );
}

function DockPill({ icon: Icon, label, active, scale }: { icon: LucideIcon; label: string; active: boolean; scale: MotionValue<number> }) {
  return (
    <motion.span
      layout
      style={{ scale, originY: 1 }}
      transition={{ layout: { type: "spring", stiffness: 500, damping: 38 } }}
      className={cn(
        "relative flex h-12 min-w-12 items-center justify-center gap-2 rounded-full px-3.5 transition-colors duration-300",
        active ? "bg-foreground text-background" : "text-muted hover:text-foreground",
      )}
    >
      <Icon className="size-[22px] shrink-0" strokeWidth={1.75} />
      <AnimatePresence initial={false}>
        {active && (
          <motion.span
            key={label}
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 38 }}
            className="hidden overflow-hidden text-sm font-medium whitespace-nowrap sm:block"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
      {!active && (
        <span className="pointer-events-none absolute -top-9 left-1/2 hidden -translate-x-1/2 rounded-full bg-foreground px-2.5 py-1 text-xs whitespace-nowrap text-background opacity-0 transition-opacity group-hover:opacity-100 [@media(pointer:fine)]:block">
          {label}
        </span>
      )}
    </motion.span>
  );
}
