/*
 * midnite service worker (Phase 24 Theme C).
 *
 * This makes the app installable and gives it a fast, cached *shell* — it does
 * NOT make the app work offline. All board/session data is live from the
 * loopback gateway (a different origin), so the SW deliberately never touches
 * those requests; with no connection the shell loads but data views show their
 * normal error/empty states.
 *
 * Strategy (Decision §6): network-first for same-origin app code + navigations
 * — the network response always wins so you never get a stale UI; the cache is
 * only a fallback when the network fails. A small set of static assets is
 * precached on install so the shell paints instantly.
 */
const CACHE = 'midnite-shell-v1';
const PRECACHE = [
  '/site.webmanifest',
  '/favicon.ico',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/apple-touch-icon.png',
  '/maskable-icon.svg',
];

self.addEventListener('install', (event) => {
  // Take over as soon as installed so updates apply on the next load, not after
  // every tab closes.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // Best-effort: a single missing asset must not fail the whole install.
      Promise.allSettled(PRECACHE.map((url) => cache.add(url))),
    ),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Only ever handle same-origin GETs. Cross-origin (the gateway API/WS) and
  // non-GET requests pass straight through — we never cache live data.
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(networkFirst(request));
});

/**
 * Try the network; on success refresh the cache and return it. On failure fall
 * back to the cached response, and for a navigation fall back to the cached app
 * shell ("/") so an installed launch still paints something.
 */
async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok && response.type === 'basic') {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const shell = await cache.match('/');
      if (shell) return shell;
    }
    throw err;
  }
}
