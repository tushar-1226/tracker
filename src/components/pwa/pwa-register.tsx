"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Registers the service worker and refreshes data when a notification action changed it. */
export function PwaRegister() {
  const router = useRouter();
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((e) => console.warn("SW registration failed", e));
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "track:refresh") router.refresh();
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [router]);
  return null;
}
