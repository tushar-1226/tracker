"use client";

/**
 * Offline outbox: writes made without a connection wait in localStorage and are replayed in order
 * once the app is online again. Only idempotent writes belong here (habit values are "set", expenses
 * carry a client id the server de-duplicates on).
 */
export type OutboxItem =
  | { id: string; kind: "habit"; habitId: string; date: string; value: number; at: number }
  | { id: string; kind: "transaction"; fields: Record<string, string>; at: number };

type NewItem = { kind: "habit"; habitId: string; date: string; value: number } | { kind: "transaction"; fields: Record<string, string> };

const KEY = "track:outbox:v1";
const EVENT = "track:outbox";
const EMPTY: OutboxItem[] = [];

let cacheRaw: string | null = null;
let cacheItems: OutboxItem[] = EMPTY;

function read(): OutboxItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === cacheRaw) return cacheItems;
    cacheRaw = raw;
    cacheItems = raw ? (JSON.parse(raw) as OutboxItem[]) : EMPTY;
    return cacheItems;
  } catch {
    return EMPTY;
  }
}

function write(items: OutboxItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch (e) {
    console.warn("Could not save the offline queue", e);
  }
  window.dispatchEvent(new Event(EVENT));
}

export const getOutbox = read;
export const getServerOutbox = () => EMPTY;

export function subscribeOutbox(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function enqueue(item: NewItem & { id?: string }) {
  const id = item.id ?? crypto.randomUUID();
  const next: OutboxItem = { ...item, id, at: Date.now() } as OutboxItem;
  let items = read();
  // A later value for the same habit and day replaces the earlier one.
  if (next.kind === "habit") items = items.filter((i) => !(i.kind === "habit" && i.habitId === next.habitId && i.date === next.date));
  write([...items, next]);
  return id;
}

export function dequeue(id: string) {
  write(read().filter((i) => i.id !== id));
}

/** True for failures that mean "no connection" (retry later), not "the server said no". */
export function isOffline(error: unknown) {
  return !navigator.onLine || (error instanceof TypeError && /fetch|network|load failed/i.test(error.message));
}
