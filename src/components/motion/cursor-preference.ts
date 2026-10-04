"use client";

// Lets the signed-in app turn the custom cursor off (user setting) without
// threading props through the root providers.
let enabled = true;
const listeners = new Set<() => void>();

export const cursorPreference = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  get: () => enabled,
  set(next: boolean) {
    if (next === enabled) return;
    enabled = next;
    listeners.forEach((l) => l());
  },
};
