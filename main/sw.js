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
  // Do NOT skipWaiting here (Phase 71): a new build installs and then *waits*,
  // so the app can surface an "update available" banner and let the user choose
  // when to take it. The takeover happens on the SKIP_WAITING message below,
  // fired by the banner's "Update" action.
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // Best-effort: a single missing asset must not fail the whole install.
      Promise.allSettled(PRECACHE.map((url) => cache.add(url))),
    ),
  );
});

// The waiting worker activates only when the user clicks "Update" (Phase 71
// Theme D): the page posts { type: 'SKIP_WAITING' }, we take over, and the page
// reloads on the resulting `controllerchange`.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Request destinations that make up the app *shell* — documents and static
// assets. API calls (fetch/XHR) have an empty destination, so keying off this
// excludes live data even when the gateway serves the UI from its own origin
// (Phase 3 `gateway.webDir`), where an origin check alone wouldn't.
const SHELL_DESTINATIONS = new Set(['document', 'script', 'style', 'image', 'font', 'manifest']);

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Same-origin only, and only the shell — never the gateway API/WS or live data.
  if (url.origin !== self.location.origin) return;
  if (!SHELL_DESTINATIONS.has(request.destination)) return;

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
