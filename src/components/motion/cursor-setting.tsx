"use client";

import { useEffect } from "react";
import { cursorPreference } from "./cursor-preference";

export function CursorSetting({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    cursorPreference.set(enabled);
  }, [enabled]);
  return null;
}
