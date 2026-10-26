"use client";

import { useEffect, useRef } from "react";
import { startWorkout } from "@/server/actions/gym";

/** Opened from the "Start workout" app shortcut (/gym?start=1): begins (or resumes) a workout straight away. */
export function AutoStart() {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void startWorkout();
  }, []);
  return null;
}
