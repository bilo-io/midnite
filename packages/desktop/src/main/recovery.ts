import { app, ipcMain, shell } from 'electron';

/**
 * IPC for the gateway-failure page (see `failure-page.ts`).
 *
 * Registered unconditionally at startup rather than only on failure: the page is
 * loaded in the same window that would otherwise host the app, and registering
 * a handler after `loadURL` would race the page's own script.
 */
export const RECOVERY_RETRY_CHANNEL = 'midnite:recovery:retry';
export const RECOVERY_OPEN_LOGS_CHANNEL = 'midnite:recovery:open-logs';

export function registerRecovery(logsDir: string): void {
  // Relaunch rather than re-poll: whatever blocked the gateway (a stale process
  // holding the port, a half-written native module) is not something this
  // process can clear from the inside.
  ipcMain.on(RECOVERY_RETRY_CHANNEL, () => {
    app.relaunch();
    app.exit(0);
  });

  ipcMain.on(RECOVERY_OPEN_LOGS_CHANNEL, () => {
    void shell.openPath(logsDir);
  });
}
