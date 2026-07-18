import { app, ipcMain, type BrowserWindow } from 'electron';
// Named import: electron-updater is CJS with `__esModule: true` and no `default`
// export, so under `module: commonjs` a default import resolves to `undefined`
// (`__importDefault` unwraps the already-flagged module) and destructuring
// `autoUpdater` off it throws at load. `autoUpdater` is a lazy getter — accessed
// only inside the functions below (after app-ready, and skipped when unpackaged),
// never at module load.
import { autoUpdater } from 'electron-updater';

import { fetchBelowFloor, type UpdateChannel } from '../updates/floor';
import {
  availableState,
  checkingState,
  downloadedState,
  downloadingState,
  errorState,
  IDLE_STATE,
  notAvailableState,
  UPDATE_CHANNEL_CHANNEL,
  UPDATE_CHECK_CHANNEL,
  UPDATE_DOWNLOAD_CHANNEL,
  UPDATE_RESTART_CHANNEL,
  UPDATE_STATE_CHANNEL,
  type UpdateState,
} from '../updates/update-state';

/**
 * Wire electron-updater to the renderer (Phase 71 Theme E). **User-timed only** —
 * `autoDownload`/`autoInstallOnAppQuit` are off, and we never call
 * `checkForUpdatesAndNotify` (which auto-nags/auto-restarts). The banner drives
 * the flow: check → download → restart, each an explicit renderer click over IPC.
 *
 * Unpackaged (dev) builds have no update feed and `checkForUpdates()` would throw
 * ("app-update.yml not found"), so the bridge is still mounted (the preload's
 * methods stay safe) but every command is a no-op that reports `idle`. The web
 * service-worker reload path still works for `moon run web:dev`.
 *
 * `getWindow` is read lazily so a window recreated after this runs is still the
 * target. Registered once during boot.
 */
export function registerUpdater(getWindow: () => BrowserWindow | null): void {
  // The download-progress payload has no version, so remember the last one seen.
  let currentVersion: string | null = null;
  // The current channel + whether this build is below its manifest floor (Theme H).
  // Merged into every pushed state so the banner enforces the floor on desktop too.
  let channel: UpdateChannel = 'stable';
  let belowFloor = false;

  const push = (state: UpdateState): void => {
    if (state.version) currentVersion = state.version;
    const win = getWindow();
    if (win && !win.isDestroyed()) win.webContents.send(UPDATE_STATE_CHANNEL, { ...state, belowFloor });
  };

  // Fetch the channel manifest's floor, then re-push the last-known idle state so
  // the renderer sees `belowFloor` even before the feed reports an available build.
  const refreshFloor = (): void => {
    void fetchBelowFloor(app.getVersion(), channel).then((below) => {
      if (below === belowFloor) return;
      belowFloor = below;
      push(IDLE_STATE);
    });
  };

  // Dev / unpackaged: no feed. Keep the IPC surface so the preload's methods are
  // safe no-ops, but never touch autoUpdater (it would throw). The floor still
  // applies (it's a plain manifest fetch, independent of the updater feed).
  if (!app.isPackaged) {
    ipcMain.on(UPDATE_CHECK_CHANNEL, () => push(IDLE_STATE));
    ipcMain.on(UPDATE_DOWNLOAD_CHANNEL, () => {});
    ipcMain.on(UPDATE_RESTART_CHANNEL, () => {});
    ipcMain.on(UPDATE_CHANNEL_CHANNEL, (_e, next: UpdateChannel) => {
      channel = next === 'beta' ? 'beta' : 'stable';
      refreshFloor();
    });
    refreshFloor();
    return;
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('checking-for-update', () => push(checkingState()));
  autoUpdater.on('update-available', (info) => push(availableState(info)));
  autoUpdater.on('update-not-available', () => push(notAvailableState()));
  autoUpdater.on('download-progress', (progress) => push(downloadingState(progress, currentVersion)));
  autoUpdater.on('update-downloaded', (info) => push(downloadedState(info)));
  autoUpdater.on('error', (err) => push(errorState(err, currentVersion)));

  // The `error` handler above pushes the state for a rejected check/download, so
  // the promise `.catch` here only stops an unhandled rejection.
  ipcMain.on(UPDATE_CHECK_CHANNEL, () => void autoUpdater.checkForUpdates().catch(() => {}));
  ipcMain.on(UPDATE_DOWNLOAD_CHANNEL, () => void autoUpdater.downloadUpdate().catch(() => {}));
  ipcMain.on(UPDATE_RESTART_CHANNEL, () => {
    try {
      autoUpdater.quitAndInstall();
    } catch (err) {
      push(errorState(err, currentVersion));
    }
  });

  // Theme H: point the electron-updater feed + the floor fetch at the chosen
  // channel, then re-check + refresh the floor. `autoUpdater.channel` selects the
  // `latest`/`beta` feed; the floor comes from the channel's version.json.
  ipcMain.on(UPDATE_CHANNEL_CHANNEL, (_e, next: UpdateChannel) => {
    channel = next === 'beta' ? 'beta' : 'stable';
    autoUpdater.channel = channel;
    refreshFloor();
    void autoUpdater.checkForUpdates().catch(() => {});
  });

  // Seed the floor on boot (independent of the first feed check).
  refreshFloor();
}

/**
 * Kick off the first update check once the app is up (no auto-download). Fail-soft:
 * an unreachable feed just leaves the banner hidden (the `error` handler in
 * {@link registerUpdater} pushes the state; nothing blocks the app). No-op when
 * unpackaged.
 */
export function startUpdateCheck(): void {
  if (!app.isPackaged) return;
  void autoUpdater.checkForUpdates().catch(() => {});
}
