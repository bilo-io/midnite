import { BrowserWindow, ipcMain, Notification as ElectronNotification } from 'electron';
import type { Notification as MidniteNotification } from '@midnite/shared';

/** IPC channel: renderer → main, "raise this as a native OS notification". */
export const NOTIFY_CHANNEL = 'midnite:notify';
/** IPC channel: main → renderer, "a native notification was clicked, route here". */
export const NAVIGATE_CHANNEL = 'midnite:navigate';

/**
 * Bridge the web app's notifications to native OS notifications. The renderer
 * (`window.midniteDesktop.notify`, exposed by the preload) hands a `Notification`
 * over IPC whenever its policy says to raise one while the window is backgrounded;
 * we show it from the **main process** — reliable even when the renderer is hidden
 * and throttled, where its own `Notification` API is not (Phase 21 Theme D, Decision §5).
 *
 * Clicking a notification focuses the window and sends the entity `route` back to the
 * renderer (`NAVIGATE_CHANNEL`), which pushes it onto the router.
 *
 * `getWindow` is read lazily (per click), so a window recreated after this runs is
 * still targeted. Registered once during boot.
 */
export function registerNotificationBridge(getWindow: () => BrowserWindow | null): void {
  ipcMain.on(NOTIFY_CHANNEL, (_event, notification: MidniteNotification) => {
    if (!ElectronNotification.isSupported()) return;
    const native = new ElectronNotification({
      title: notification.title,
      body: notification.body,
    });
    native.on('click', () => {
      const win = getWindow();
      if (!win || win.isDestroyed()) return;
      if (win.isMinimized()) win.restore();
      win.focus();
      win.webContents.send(NAVIGATE_CHANNEL, notification.route);
    });
    native.show();
  });
}
