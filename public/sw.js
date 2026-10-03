// Service Worker for Scan Me PWA
// Provides basic offline shell caching

const CACHE_NAME = "scanme-v2";
const SHELL_ASSETS = ["/", "/manifest.json"];

// ── Install: cache shell assets ───────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: clear old caches ────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

const cacheResponse = (request, response) => {
  if (response && response.status === 200 && response.type === "basic") {
    const cloned = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
  }
  return response;
};

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only same-origin GETs. API calls and S3 photos are cross-origin (and
  // often authenticated or short-lived), so they always go to the network.
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api")) {
    return;
  }

  // Content-hashed build assets never change: cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => cacheResponse(request, res)))
    );
    return;
  }

  // Pages and everything else: network-first, so a new deploy reaches users
  // immediately; fall back to the cache only when offline.
  event.respondWith(
    fetch(request)
      .then((res) => cacheResponse(request, res))
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
  );
});
