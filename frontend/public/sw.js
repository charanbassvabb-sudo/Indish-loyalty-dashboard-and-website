// Minimal offline-friendly service worker — no Workbox, just enough to keep
// pages a guest has already visited (the menu, especially) available with
// no connection. Vite fingerprints build assets, so instead of precaching a
// fixed manifest we cache opportunistically as requests happen:
//
//   - Navigations (SPA routes like /lusaka/menu): network-first, falling
//     back to the last cached copy of that route when offline.
//   - Static assets (JS/CSS/images/fonts): stale-while-revalidate, so
//     repeat visits are instant and still pick up updates in the background.
//   - /api/* and cross-origin requests are never intercepted — reservation
//     data must always be live.
const CACHE_NAME = "indish-cache-v1";
const APP_SHELL = ["/", "/manifest.webmanifest", "/favicon.svg"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => {})),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;
  if (request.method !== "GET") return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (["script", "style", "image", "font"].includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(request);
    cache.put(request, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(request);
    return cached ?? cache.match("/");
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((fresh) => {
      cache.put(request, fresh.clone());
      return fresh;
    })
    .catch(() => cached);
  return cached ?? network;
}
