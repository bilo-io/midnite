// The desktop updater's renderer-facing state contract + IPC channel names
// (Phase 71 Theme E). Kept electron-free and pure so the event→state mapping is
// unit-testable in plain node (electron can't be imported outside the runtime),
// and shared by the main process (main/updater.ts) and the preload bridge
// (preload/index.ts). The web side redeclares the matching `UpdateState` shape in
// packages/web/lib/desktop-bridge.ts (Decision: the bridge contract rides with the
// existing desktop-bridge, mirroring the notify bridge).

/** Where the desktop updater is in the user-timed check→download→install flow. */
export type UpdatePhase =
  | 'idle' // nothing to do (not checked, or already latest)
  | 'checking' // a checkForUpdates() is in flight
  | 'available' // a newer build exists; not yet downloaded
  | 'downloading' // download in progress (see `percent`)
  | 'downloaded' // ready — a restart installs it
  | 'error'; // last operation failed (fail-soft; the banner offers retry)

/** The full state pushed main→renderer on every transition. */
export type UpdateState = {
  phase: UpdatePhase;
  /** The available/downloaded version, once known. */
  version: string | null;
  /** Download progress 0–100 while `phase === 'downloading'`, else null. */
  percent: number | null;
  /** Human-readable error message when `phase === 'error'`, else null. */
  error: string | null;
  /**
   * This build is below the channel manifest's `minSupported` force-update floor
   * (Phase 71 Theme H). The main process fetches the channel's `version.json` for
   * `minSupported` (electron-updater's own feed doesn't carry it) and merges the
   * result into every pushed state, so the desktop banner enforces the same floor
   * as the web. Omitted on the state constructors → treated as `false`.
   */
  belowFloor?: boolean;
};

// IPC channels. State flows main→renderer on UPDATE_STATE_CHANNEL; the renderer
// drives the flow with the command channels (never auto — user-timed).
export const UPDATE_STATE_CHANNEL = 'midnite:update-state'; // main → renderer
export const UPDATE_CHECK_CHANNEL = 'midnite:update-check'; // renderer → main
export const UPDATE_DOWNLOAD_CHANNEL = 'midnite:update-download';
export const UPDATE_RESTART_CHANNEL = 'midnite:update-restart';
/** renderer → main: set the release channel (`stable`/`beta`), then re-check (Theme H). */
export const UPDATE_CHANNEL_CHANNEL = 'midnite:update-channel';

export const IDLE_STATE: UpdateState = { phase: 'idle', version: null, percent: null, error: null };

// Minimal structural views of the electron-updater payloads we read, so the
// mappers below stay pure (no `electron-updater` import → testable in node).
export type UpdateInfoLike = { version?: string | null };
export type ProgressLike = { percent?: number | null };

export function checkingState(): UpdateState {
  return { phase: 'checking', version: null, percent: null, error: null };
}

export function availableState(info: UpdateInfoLike): UpdateState {
  return { phase: 'available', version: info.version ?? null, percent: null, error: null };
}

/** No newer build — fold back to idle so the banner hides. */
export function notAvailableState(): UpdateState {
  return IDLE_STATE;
}

/** The progress payload carries no version, so thread the known one through. */
export function downloadingState(progress: ProgressLike, version: string | null): UpdateState {
  const raw = progress.percent ?? 0;
  const percent = Math.max(0, Math.min(100, Math.round(raw)));
  return { phase: 'downloading', version, percent, error: null };
}

export function downloadedState(info: UpdateInfoLike): UpdateState {
  return { phase: 'downloaded', version: info.version ?? null, percent: 100, error: null };
}

export function errorState(err: unknown, version: string | null): UpdateState {
  const error = err instanceof Error ? err.message : String(err);
  return { phase: 'error', version, percent: null, error };
}
