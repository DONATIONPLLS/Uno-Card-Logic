// Uno Buddy service worker — cache-first PWA shell.
const CACHE = "uno-buddy-v4";
const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon.svg",
  "./favicon.svg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Only handle same-origin GETs (skip Google Fonts CDN, peerjs server, etc.)
  if (url.origin !== self.location.origin) return;

  // Navigation: serve cached index for SPA fallback when offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((m) => m || caches.match("./index.html")) ),
    );
    return;
  }

  // All other GETs: cache-first, fall through to network and cache the response.
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req)
          .then((res) => {
            // Don't cache opaque/error responses
            if (!res || res.status !== 200 || res.type === "opaque") return res;
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            return res;
          })
          .catch(() => caches.match("./index.html")),
    ),
  );
});
