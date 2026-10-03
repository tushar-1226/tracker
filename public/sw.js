// Track service worker: shows push notifications and opens the app where they point.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

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
