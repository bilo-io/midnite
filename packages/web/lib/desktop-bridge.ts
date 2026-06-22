import type { Notification } from '@midnite/shared';

/**
 * Bridge the Electron preload exposes on `window.midniteDesktop` when the web app
 * runs inside the desktop shell ([`packages/desktop`](../../desktop)). It lets the
 * renderer hand a notification to the **main process**, which raises a native OS
 * notification (reliable even when the window is backgrounded/throttled — where the
 * renderer's own `Notification` API is not) and routes the window back on click.
 *
 * In a plain browser the global is absent and the app falls back to the web
 * `Notification` API. Mirrors the existing `window.__NEXT_PUBLIC_GATEWAY_URL`
 * feature-detection idiom in [`api.ts`](./api.ts).
 */
export type MidniteDesktopBridge = {
  /** Hand a notification to the main process to raise as a native OS notification. */
  notify: (notification: Notification) => void;
  /**
   * Subscribe to "a native notification was clicked → route here". The handler
   * receives the notification's `route`; returns an unsubscribe function.
   */
  onNavigate: (handler: (route: string) => void) => () => void;
};

declare global {
  interface Window {
    midniteDesktop?: MidniteDesktopBridge;
  }
}

/** The desktop bridge when running inside the Electron shell, else `null`. */
export function getDesktopBridge(): MidniteDesktopBridge | null {
  if (typeof window === 'undefined') return null;
  return window.midniteDesktop ?? null;
}
