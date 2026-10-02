"use client";

import { ThemeProvider } from "next-themes";
import { Cursor } from "@/components/motion/cursor";
import { SmoothScroll } from "@/components/motion/smooth-scroll";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SmoothScroll>{children}</SmoothScroll>
      <Cursor />
    </ThemeProvider>
  );
}
