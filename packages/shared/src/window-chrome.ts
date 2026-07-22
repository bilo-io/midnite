// Window-chrome bridge contract (Phase 81) — the shape the Electron preload
// exposes at `window.midniteDesktop.windowChrome` so the renderer can draw its
// own title bar on a frameless window. Lives in `shared` (not `web`) because the
// consumer is `@midnite/shell`'s <TitleBar>, and shell may only depend on
// `shared` + `ui` — the web app's `desktop-bridge.ts` re-exports it.

/** `process.platform` values the desktop shell can report. */
export type DesktopPlatform = 'darwin' | 'win32' | 'linux';

export type WindowChromeBridge = {
  /** The OS the desktop shell is running on. */
  platform: DesktopPlatform;
  /**
   * True when the window was created without a native title bar (macOS
   * `titleBarStyle: 'hidden'`) and the renderer must draw its own. False on
   * platforms that keep the native frame — the <TitleBar> renders nothing.
   */
  frameless: boolean;
  /**
   * Subscribe to native fullscreen transitions. macOS hides the traffic lights
   * in fullscreen, so the title bar collapses its left clearance on `true`.
   * Returns an unsubscribe function.
   */
  onFullscreenChange: (handler: (fullscreen: boolean) => void) => () => void;
  /**
   * Subscribe to window focus/blur — the title bar dims while the window is in
   * the background (native-title-bar behaviour). Returns an unsubscribe function.
   */
  onFocusChange: (handler: (focused: boolean) => void) => () => void;
  /**
   * Set the native window backing color (`#rrggbb`) so resize flashes and the
   * rounded-corner backing match the app theme. The main process validates the
   * format and ignores anything that isn't a 6-digit hex color.
   */
  setBackgroundColor: (color: string) => void;
};
