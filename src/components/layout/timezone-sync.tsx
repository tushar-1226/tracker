"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Keeps the `tz` cookie in sync with the browser so the server knows the viewer's "today". */
export function TimezoneSync({ serverTimeZone }: { serverTimeZone: string }) {
  const router = useRouter();
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz || tz === serverTimeZone || !/^[\w+\-/]+$/.test(tz)) return;
    // IANA names are cookie-safe; no encoding needed.
    document.cookie = `tz=${tz}; path=/; max-age=31536000; samesite=lax`;
    // Refresh at most once per session so a rejected cookie can never loop.
    try {
      if (sessionStorage.getItem("tz-synced") === tz) return;
      sessionStorage.setItem("tz-synced", tz);
    } catch {}
    router.refresh();
  }, [serverTimeZone, router]);
  return null;
}
