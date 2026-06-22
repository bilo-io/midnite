'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker (Phase 24 Theme C) so the app is installable and
 * the static shell is cached for a fast launch. Production-only: a SW in
 * `next dev` would fight the dev server's hot-reload over `.next` assets. Renders
 * nothing — it's a mount-once side effect, dropped into the root layout.
 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    // Register after load so the SW install doesn't contend with first paint.
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Registration failing (e.g. unsupported context) must never surface to
        // the user — the app works fine without the SW.
      });
    };
    if (document.readyState === 'complete') {
      register();
      return undefined;
    }
    window.addEventListener('load', register);
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
