"use client";

import { Bell, BellOff, Download, LoaderCircle, Share, Smartphone, SquarePlus } from "lucide-react";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardLabel } from "@/components/ui/card";
import { removeSubscription, saveSubscription, sendTestNotification } from "@/server/actions/notifications";

type Status = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

function base64ToBytes(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

function deviceName() {
  const ua = navigator.userAgent;
  const os = /Android/.test(ua) ? "Android" : isIOS() ? (/iPad|Macintosh/.test(ua) ? "iPad" : "iPhone") : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "Linux";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  return `${browser} on ${os}`;
}

/** Turns push notifications on/off for this device and sends a test. */
export function NotificationsCard({ deviceCount }: { deviceCount: number }) {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let next: Status;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        next = isIOS() && !isStandalone() ? "ios-install" : "unsupported";
      } else if (Notification.permission === "denied") {
        next = "denied";
      } else {
        const reg = await navigator.serviceWorker.ready;
        next = (await reg.pushManager.getSubscription()) ? "on" : "off";
      }
      if (!cancelled) setStatus(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = () =>
    startTransition(async () => {
      setMessage(null);
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setStatus(permission === "denied" ? "denied" : "off");
          return;
        }
        const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!key) throw new Error("Push keys aren’t configured on the server.");
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToBytes(key) });
        await saveSubscription(JSON.parse(JSON.stringify(sub)), deviceName());
        setStatus("on");
      } catch (e) {
        // e.g. private/incognito windows, or the browser's push service is unreachable.
        setStatus("off");
        setMessage(`Couldn’t turn on notifications: ${(e as Error).message}. Private windows don’t support push.`);
      }
    });

  const disable = () =>
    startTransition(async () => {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removeSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("off");
    });

  const test = () =>
    startTransition(async () => {
      const res = await sendTestNotification();
      setMessage(res.error ?? (res.sent ? `Sent to ${res.sent} device${res.sent === 1 ? "" : "s"}.` : "No devices are subscribed yet."));
    });

  return (
    <Card className="flex h-full flex-col gap-5">
      <div className="flex items-center justify-between">
        <CardLabel>Notifications</CardLabel>
        {status === "on" ? <Bell className="size-4" /> : <BellOff className="size-4 text-muted" />}
      </div>

      <div>
        <p className="text-xl font-semibold tracking-tight">
          {status === "loading" ? "Checking…" : status === "on" ? "On for this device" : status === "denied" ? "Blocked" : status === "ios-install" ? "Install first" : status === "unsupported" ? "Not supported" : "Off"}
        </p>
        <p className="mt-2 text-sm text-muted">
          {status === "on" && `Reminders arrive here even when Track is closed. ${deviceCount} device${deviceCount === 1 ? "" : "s"} in total.`}
          {status === "off" && "Turn on to get reminders for habits, workouts, journaling and more — tapping one opens the right screen."}
          {status === "denied" && "Notifications are blocked for this site. Allow them in your browser or system settings, then reload."}
          {status === "ios-install" && "On iPhone and iPad, notifications work once Track is added to your Home Screen (iOS 16.4+). See “Install the app”."}
          {status === "unsupported" && "This browser can’t receive push notifications. Try Chrome, Edge, Firefox, or Safari on a recent device."}
        </p>
      </div>

      <div className="mt-auto flex flex-wrap gap-2">
        {status === "off" && (
          <Button onClick={enable} disabled={busy}>
            {busy ? <LoaderCircle className="animate-spin" /> : <Bell />} Turn on
          </Button>
        )}
        {status === "on" && (
          <>
            <Button onClick={test} disabled={busy}>
              {busy ? <LoaderCircle className="animate-spin" /> : <Bell />} Send test
            </Button>
            <Button variant="outline" onClick={disable} disabled={busy}>
              Turn off
            </Button>
          </>
        )}
      </div>
      {message && <p className="border-t pt-3 text-xs">{message}</p>}
    </Card>
  );
}

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferredPrompt: InstallEvent | null = null;
const promptListeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as InstallEvent;
    promptListeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    promptListeners.forEach((l) => l());
  });
}
const subscribePrompt = (cb: () => void) => {
  promptListeners.add(cb);
  return () => promptListeners.delete(cb);
};

/** Install button where the browser offers one; Home Screen steps on iOS. */
export function InstallCard() {
  const canPrompt = useSyncExternalStore(subscribePrompt, () => deferredPrompt !== null, () => false);
  const env = useSyncExternalStore(
    () => () => {},
    () => (isStandalone() ? "installed" : isIOS() ? "ios" : "other"),
    () => "other",
  );

  return (
    <Card className="flex h-full flex-col gap-5">
      <div className="flex items-center justify-between">
        <CardLabel>Install the app</CardLabel>
        <Smartphone className="size-4 text-muted" />
      </div>
      {env === "installed" ? (
        <div>
          <p className="text-xl font-semibold tracking-tight">Installed</p>
          <p className="mt-2 text-sm text-muted">You’re using Track as an app. It opens full-screen from your Home Screen.</p>
        </div>
      ) : env === "ios" ? (
        <div>
          <p className="text-xl font-semibold tracking-tight">Add to Home Screen</p>
          <ol className="mt-3 space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className="tabular text-xs">01</span> Tap <Share className="inline size-4" /> Share in Safari’s toolbar
            </li>
            <li className="flex items-center gap-2">
              <span className="tabular text-xs">02</span> Choose <SquarePlus className="inline size-4" /> “Add to Home Screen”
            </li>
            <li className="flex items-center gap-2">
              <span className="tabular text-xs">03</span> Open Track from the new icon, then turn on notifications
            </li>
          </ol>
        </div>
      ) : (
        <div>
          <p className="text-xl font-semibold tracking-tight">{canPrompt ? "Ready to install" : "Install from the browser"}</p>
          <p className="mt-2 text-sm text-muted">
            {canPrompt ? "Get a full-screen app with its own icon, launcher shortcuts and reliable notifications." : "Use your browser menu → “Install app” or “Add to Home screen”."}
          </p>
        </div>
      )}
      {canPrompt && env !== "installed" && (
        <Button
          className="mt-auto self-start"
          onClick={async () => {
            await deferredPrompt?.prompt();
            deferredPrompt = null;
            promptListeners.forEach((l) => l());
          }}
        >
          <Download /> Install Track
        </Button>
      )}
    </Card>
  );
}
