import { app, ipcMain, type BrowserWindow } from 'electron';
import electronUpdater from 'electron-updater';

import {
  availableState,
  checkingState,
  downloadedState,
  downloadingState,
  errorState,
  IDLE_STATE,
  notAvailableState,
  UPDATE_CHECK_CHANNEL,
  UPDATE_DOWNLOAD_CHANNEL,
  UPDATE_RESTART_CHANNEL,
  UPDATE_STATE_CHANNEL,
  type UpdateState,
} from '../updates/update-state';

// electron-updater is CommonJS; the autoUpdater singleton is a property of the
// default export (the named-import form breaks under some interop settings).
const { autoUpdater } = electronUpdater;

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

  const push = (state: UpdateState): void => {
    if (state.version) currentVersion = state.version;
    const win = getWindow();
    if (win && !win.isDestroyed()) win.webContents.send(UPDATE_STATE_CHANNEL, state);
  };

  // Dev / unpackaged: no feed. Keep the IPC surface so the preload's methods are
  // safe no-ops, but never touch autoUpdater (it would throw).
  if (!app.isPackaged) {
    ipcMain.on(UPDATE_CHECK_CHANNEL, () => push(IDLE_STATE));
    ipcMain.on(UPDATE_DOWNLOAD_CHANNEL, () => {});
    ipcMain.on(UPDATE_RESTART_CHANNEL, () => {});
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
