/**
 * Service-worker update plumbing for the app-update banner (Phase 71 Themes B/D).
 *
 * Detection (B): a new SW installs and *waits* (the SW no longer skipWaiting()s
 * on install). We surface that waiting worker as an "update available" signal
 * alongside the version.json poll.
 *
 * Apply (D): on the user's click we tell the waiting worker to take over
 * (`SKIP_WAITING`) and hard-reload on the resulting `controllerchange`, so the
 * new build is live. No waiting worker → a plain reload (covers the
 * version-only detection case).
 */

function swContainer(): ServiceWorkerContainer | null {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  return navigator.serviceWorker;
}

/**
 * Invoke `onWaiting` when a newer service worker is installed and waiting to
 * activate (an update the user can take). Fires immediately if one is already
 * waiting, and on any future `updatefound → installed`. Returns a cleanup fn.
 * No-ops (returns a noop cleanup) where service workers are unavailable.
 */
export function watchWaitingWorker(onWaiting: () => void): () => void {
  const container = swContainer();
  if (!container) return () => {};

  let cancelled = false;
  const cleanups: Array<() => void> = [];

  container.getRegistration().then((reg) => {
    if (!reg || cancelled) return;

    // Already waiting (installed before the banner mounted).
    if (reg.waiting && container.controller) onWaiting();

    const onUpdateFound = () => {
      const installing = reg.installing;
      if (!installing) return;
      const onStateChange = () => {
        if (installing.state === 'installed' && container.controller) onWaiting();
      };
      installing.addEventListener('statechange', onStateChange);
      cleanups.push(() => installing.removeEventListener('statechange', onStateChange));
    };
    reg.addEventListener('updatefound', onUpdateFound);
    cleanups.push(() => reg.removeEventListener('updatefound', onUpdateFound));
  });

  return () => {
    cancelled = true;
    cleanups.forEach((fn) => fn());
  };
}

/** Ask the browser to check the server for a newer service worker. Best-effort. */
export async function checkForWaitingWorker(): Promise<void> {
  const container = swContainer();
  if (!container) return;
  const reg = await container.getRegistration();
  await reg?.update().catch(() => {});
}

/**
 * Take the update live. If a worker is waiting, message it to skip waiting and
 * reload once it controls the page; otherwise hard-reload from the server. Idempotent
 * against a double-click via the `once` controllerchange listener + reload.
 */
export async function applyUpdate(): Promise<void> {
  const container = swContainer();
  const reg = await container?.getRegistration();
  const waiting = reg?.waiting;

  if (container && waiting) {
    container.addEventListener('controllerchange', () => window.location.reload(), { once: true });
    waiting.postMessage({ type: 'SKIP_WAITING' });
    return;
  }
  window.location.reload();
}
