// Track service worker: offline caching, push notifications, and opening the app where they point.
const VERSION = "v1";
const STATIC_CACHE = `track-static-${VERSION}`;
const PAGE_CACHE = `track-pages-${VERSION}`;

const OFFLINE_HTML = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offline · track</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:16px system-ui,sans-serif;background:#f4f4f4;color:#0a0a0a;text-align:center;padding:24px}
@media(prefers-color-scheme:dark){body{background:#0a0a0a;color:#fafafa}}p{color:#8a8a8a;max-width:28ch}button{margin-top:16px;border:0;border-radius:999px;padding:12px 24px;font:inherit;background:#0a0a0a;color:#fff}
@media(prefers-color-scheme:dark){button{background:#fafafa;color:#0a0a0a}}</style>
<div><h1>You’re offline.</h1><p>This page isn’t saved on your device yet. Pages you’ve opened before still work.</p><button onclick="location.reload()">Try again</button></div>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC_CACHE, PAGE_CACHE]);
      for (const key of await caches.keys()) if (key.startsWith("track-") && !keep.has(key)) await caches.delete(key);
      await self.clients.claim();
    })(),
  ),
);

// Cached pages hold personal data: the app asks us to drop them on sign-out.
self.addEventListener("message", (event) => {
  if (event.data?.type === "track:clear-cache") event.waitUntil(caches.delete(PAGE_CACHE));
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  // Hashed build assets and icons never change for a given URL: cache first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  // Pages: network first so data is fresh; fall back to the last copy when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PAGE_CACHE);
        try {
          const res = await fetch(request);
          if (res.ok && !res.redirected && url.pathname !== "/login") cache.put(request, res.clone());
          return res;
        } catch {
          return (await cache.match(request)) || (await cache.match(request, { ignoreSearch: true })) || new Response(OFFLINE_HTML, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
        }
      })(),
    );
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Track", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Track", {
      body: data.body,
      icon: "/icons/192",
      badge: "/icons/badge",
      tag: data.tag,
      renotify: Boolean(data.tag),
      data: { url: data.url || "/", habitId: data.habitId },
      // Action buttons show on Android/desktop; iOS ignores them and just opens the app.
      actions: data.habitId ? [{ action: "done", title: "Mark done" }, { action: "open", title: "Open" }] : [],
    }),
  );
});

async function openUrl(url) {
  const target = new URL(url || "/", self.location.origin).href;
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of windows) {
    if ("focus" in client) {
      await client.focus();
      if ("navigate" in client) return client.navigate(target);
      return;
    }
  }
  return self.clients.openWindow(target);
}

self.addEventListener("notificationclick", (event) => {
  const { url, habitId } = event.notification.data || {};
  event.notification.close();

  if (event.action === "done" && habitId) {
    event.waitUntil(
      fetch(`/api/habits/${habitId}/done`, { method: "POST", credentials: "same-origin" })
        .then(async (res) => {
          if (!res.ok) return openUrl(url);
          const windows = await self.clients.matchAll({ type: "window" });
          windows.forEach((w) => w.postMessage({ type: "track:refresh" }));
        })
        .catch(() => openUrl(url)),
    );
    return;
  }
  event.waitUntil(openUrl(url));
});
