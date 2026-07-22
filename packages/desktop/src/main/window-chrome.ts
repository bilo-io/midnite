import { ipcMain, type BrowserWindow } from 'electron';

import {
  WINDOW_BACKGROUND_CHANNEL,
  WINDOW_BACKGROUND_HEX_RE,
  WINDOW_FOCUS_CHANNEL,
  WINDOW_FULLSCREEN_CHANNEL,
} from '../window-chrome/channels';

/**
 * Window-chrome for the frameless title bar (Phase 81). macOS-only for now: the
 * window drops its native title bar (`titleBarStyle: 'hidden'` + inset traffic
 * lights) and the renderer draws its own via `@midnite/shell`'s <TitleBar>.
 * Windows/Linux keep the native frame (the `titleBarOverlay` route is the
 * deferred follow-up) and must render exactly as before this phase.
 */
export function windowFrameless(): boolean {
  return process.platform === 'darwin';
}

/**
 * Forward the window's fullscreen/focus transitions to the renderer — the
 * title bar collapses its traffic-light clearance in fullscreen (macOS hides
 * the lights there) and dims while the window is blurred. Attached per window,
 * right after construction.
 */
export function attachWindowChrome(win: BrowserWindow): void {
  const send = (channel: string, value: boolean): void => {
    if (!win.isDestroyed()) win.webContents.send(channel, value);
  };
  win.on('enter-full-screen', () => send(WINDOW_FULLSCREEN_CHANNEL, true));
  win.on('leave-full-screen', () => send(WINDOW_FULLSCREEN_CHANNEL, false));
  win.on('focus', () => send(WINDOW_FOCUS_CHANNEL, true));
  win.on('blur', () => send(WINDOW_FOCUS_CHANNEL, false));
}

/**
 * Renderer → main: retint the native window backing when the app theme changes,
 * so resize flashes and the rounded-corner backing stay seamless with the UI.
 * Never trust the payload — anything that isn't a `#rrggbb` string is dropped.
 * Registered once during boot; reads `getWindow` lazily like the other bridges.
 */
export function registerWindowChrome(getWindow: () => BrowserWindow | null): void {
  ipcMain.on(WINDOW_BACKGROUND_CHANNEL, (_event, color: unknown) => {
    if (typeof color !== 'string' || !WINDOW_BACKGROUND_HEX_RE.test(color)) return;
    const win = getWindow();
    if (!win || win.isDestroyed()) return;
    win.setBackgroundColor(color);
  });
}
