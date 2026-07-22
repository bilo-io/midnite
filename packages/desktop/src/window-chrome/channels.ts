// Window-chrome IPC contract (Phase 81) — imported by both the main process
// (`main/window-chrome.ts`) and the preload, mirroring how `updates/update-state.ts`
// carries the updater channels. Payload shapes are pinned by `WindowChromeBridge`
// in `@midnite/shared`.

/** main → renderer: boolean, true while the window is native-fullscreen. */
export const WINDOW_FULLSCREEN_CHANNEL = 'midnite:window:fullscreen';
/** main → renderer: boolean, true while the window has focus. */
export const WINDOW_FOCUS_CHANNEL = 'midnite:window:focus';
/** renderer → main: `#rrggbb` string for `win.setBackgroundColor`. */
export const WINDOW_BACKGROUND_CHANNEL = 'midnite:window:set-background';

/**
 * CLI switch the main process passes to the preload (like `--gateway-url`) so
 * the bridge's `frameless` flag is single-sourced from the window options.
 */
export const WINDOW_FRAMELESS_ARG = '--window-frameless=';

/**
 * The only backing color format the main process accepts. Mirrors `isHexColor`
 * in `@midnite/shared` (6-digit form) — redeclared because `shared` is a
 * type-only dependency of the desktop main bundle.
 */
export const WINDOW_BACKGROUND_HEX_RE = /^#[0-9a-fA-F]{6}$/;
