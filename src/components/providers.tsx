"use client";

import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import { Cursor } from "@/components/motion/cursor";
import { SmoothScroll } from "@/components/motion/smooth-scroll";
import { PwaRegister } from "@/components/pwa/pwa-register";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <MotionConfig reducedMotion="user">
        <SmoothScroll>{children}</SmoothScroll>
        <Cursor />
        <PwaRegister />
      </MotionConfig>
    </ThemeProvider>
  );
}
