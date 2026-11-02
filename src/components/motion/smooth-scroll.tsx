"use client";

import { ReactLenis, useLenis } from "lenis/react";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { useReducedMotion } from "motion/react";

function ScrollReset() {
  const pathname = usePathname();
  const lenis = useLenis();
  useEffect(() => {
    lenis?.scrollTo(0, { immediate: true });
  }, [pathname, lenis]);
  return null;
}

const FINE_POINTER = "(hover: hover) and (pointer: fine)";
const subscribe = (notify: () => void) => {
  const query = window.matchMedia(FINE_POINTER);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};
const useFinePointer = () =>
  useSyncExternalStore(subscribe, () => window.matchMedia(FINE_POINTER).matches, () => false);

/**
 * Smooth (eased) scrolling for mouse and trackpad only. Touch screens keep the browser's native
 * momentum scrolling: re-implementing it in JS is what made scrolling feel laggy on phones.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const smooth = useFinePointer() && !reduce;

  // Lenis sits beside the page, not around it, so toggling it never remounts the app.
  return (
    <>
      {smooth && (
        <ReactLenis
          root
          options={{
            lerp: 0.09,
            smoothWheel: true,
            // Let modals, menus and editors scroll natively.
            prevent: (node) => node.closest("[data-lenis-prevent], [role=dialog], [cmdk-list]") !== null,
          }}
        >
          <ScrollReset />
        </ReactLenis>
      )}
      {children}
    </>
  );
}
