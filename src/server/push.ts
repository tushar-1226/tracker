import "server-only";
import { eq, inArray } from "drizzle-orm";
import webpush from "web-push";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";

export type PushPayload = {
  title: string;
  body?: string;
  /** Opened when the notification is tapped. */
  url?: string;
  /** Replaces an earlier notification with the same tag instead of stacking. */
  tag?: string;
  /** Habit id when the notification offers a "Mark done" action. */
  habitId?: string;
};

let configured = false;
export function pushConfigured() {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:owner@track.local", pub, priv);
  configured = true;
  return true;
}

/** Sends to every device of a user; removes subscriptions the push service says are gone. */
export async function sendToUser(userId: string, payload: PushPayload) {
  if (!pushConfigured()) return 0;
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  const dead: string[] = [];
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 },
        );
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) dead.push(s.id);
        else console.error("push failed", code, (e as Error).message);
      }
    }),
  );
  if (dead.length) await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, dead));
  return sent;
}
