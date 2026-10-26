"use client";

import { CloudOff, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { dequeue, getOutbox, getServerOutbox, isOffline, subscribeOutbox } from "@/lib/offline/outbox";
import { setHabitValue } from "@/server/actions/habits";
import { saveTransaction } from "@/server/actions/money";

const subscribeOnline = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

/** Replays queued offline writes when the connection returns, and shows what is waiting. */
export function OutboxSync() {
  const router = useRouter();
  const items = useSyncExternalStore(subscribeOutbox, getOutbox, getServerOutbox);
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const [syncing, setSyncing] = useState(false);
  const running = useRef(false);

  const flush = useCallback(async () => {
    if (running.current || !navigator.onLine) return;
    running.current = true;
    setSyncing(true);
    let synced = 0;
    try {
      for (const item of [...getOutbox()]) {
        try {
          if (item.kind === "habit") {
            await setHabitValue(item.habitId, item.date, item.value);
          } else {
            const fd = new FormData();
            for (const [k, v] of Object.entries(item.fields)) fd.set(k, v);
            fd.set("clientId", item.id);
            const res = await saveTransaction(undefined, fd);
            if (res?.errors) console.warn("Dropped an offline entry the server rejected", res.errors);
          }
          dequeue(item.id);
          synced++;
        } catch (e) {
          if (isOffline(e)) break; // try again when we're back online
          console.warn("Dropped an offline entry the server rejected", e);
          dequeue(item.id);
        }
      }
    } finally {
      running.current = false;
      setSyncing(false);
      if (synced) router.refresh();
    }
  }, [router]);

  useEffect(() => {
    if (online && items.length) void flush();
  }, [online, items.length, flush]);

  if (online && !items.length) return null;
  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center">
      <span className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background shadow-lift">
        {syncing ? <LoaderCircle className="size-3.5 animate-spin" /> : <CloudOff className="size-3.5" />}
        {syncing ? "Syncing…" : !online ? (items.length ? `Offline · ${items.length} waiting to sync` : "Offline") : `${items.length} waiting to sync`}
      </span>
    </div>
  );
}
