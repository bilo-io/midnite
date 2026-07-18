import type { Notification, UpdateChannel } from '@midnite/shared';

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

/**
 * Where the desktop electron-updater flow is (Phase 71 Theme E). Mirrors
 * `UpdatePhase` in packages/desktop/src/updates/update-state.ts — the contract is
 * redeclared here (Decision: the bridge rides with the existing desktop bridge,
 * like the notify bridge, rather than moving into `@midnite/shared`).
 */
export type UpdatePhase = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';

/** The updater state the main process pushes to the renderer on every transition. */
export type UpdateState = {
  phase: UpdatePhase;
  version: string | null;
  /** Download progress 0–100 while `phase === 'downloading'`, else null. */
  percent: number | null;
  error: string | null;
  /**
   * This build is below the channel manifest's `minSupported` force-update floor
   * (Phase 71 Theme H). The main process fetches the channel's `version.json` for
   * `minSupported` — electron-updater's own feed doesn't carry it — so the desktop
   * banner enforces the same floor as the web. Absent on older payloads → false.
   */
  belowFloor?: boolean;
};

/**
 * The `window.midnite.updates` bridge the Electron preload exposes so the shared
 * `UpdateBanner` can drive electron-updater without Node access — subscribe to
 * state, then check/download/restart on the user's click. Absent in a plain
 * browser (where the version.json poll + SW handoff drive the banner instead).
 */
export type UpdatesBridge = {
  /** Subscribe to updater state; returns an unsubscribe function. */
  onState: (handler: (state: UpdateState) => void) => () => void;
  /** Re-check the feed (no auto-download). */
  check: () => void;
  /** Start downloading the available update. */
  download: () => void;
  /** Quit and install the downloaded update. */
  restartToInstall: () => void;
  /**
   * Set the release channel (Phase 71 Theme H) — the main process points
   * `autoUpdater.channel` + its floor-manifest fetch at the channel, then
   * re-checks. Optional so an older preload without it degrades gracefully.
   */
  setChannel?: (channel: UpdateChannel) => void;
};

declare global {
  interface Window {
    midniteDesktop?: MidniteDesktopBridge;
    midnite?: { updates?: UpdatesBridge };
  }
}

/** The desktop bridge when running inside the Electron shell, else `null`. */
export function getDesktopBridge(): MidniteDesktopBridge | null {
  if (typeof window === 'undefined') return null;
  return window.midniteDesktop ?? null;
}

/** The desktop updater bridge when running inside the Electron shell, else `null`. */
export function getUpdatesBridge(): UpdatesBridge | null {
  if (typeof window === 'undefined') return null;
  return window.midnite?.updates ?? null;
}
