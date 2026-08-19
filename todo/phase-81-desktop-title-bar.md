# Phase 81 — Desktop title bar & window chrome

> **Problem.** The desktop app ships with the stock macOS window frame: a plain native
> title bar sitting on top of the app, visually disconnected from the themed UI below
> (compare Slack, which draws its own seamless header with search + nav in it). The
> `BrowserWindow` in [`packages/desktop/src/main/index.ts`](../packages/desktop/src/main/index.ts)
> sets only `width/height/show/webPreferences` — no `titleBarStyle`, no drag regions, no
> `app-region` anywhere in the repo. This phase makes the window frameless on macOS and
> draws a first-class **TitleBar** in `@midnite/shell` — drag region, traffic-light
> clearance, search, nav, and a surface that is literally the app's own themed
> background, so the chrome is seamless.

> **Scope guardrails.** Desktop-only: the TitleBar mounts **only when the desktop bridge
> is present** — browser web/admin keep their current chrome (floating `headerActions`
> cluster) untouched. macOS-only for now: Windows/Linux keep the native frame entirely
> (`titleBarOverlay` + `env(titlebar-area-*)` layout is the deferred follow-up). No new
> search UI — the bar's search pill only *triggers* the existing Phase 41 command
> palette. Package boundaries hold: the bridge **types** live in `@midnite/shared` so
> `shell` (allowed: `shared` + `ui` only) can consume them without touching `web`.

> Effort: **S** < 2h · **M** 2–8h · **L** > 8h

---

## Current state this builds on

- **Stock frame:** [`main/index.ts`](../packages/desktop/src/main/index.ts) creates the
  window with default chrome; the gateway-failure fallback page is a bare data-URL.
- **Preload bridge exists:** [`preload/index.ts`](../packages/desktop/src/preload/index.ts)
  already exposes `window.midniteDesktop` (notify/onNavigate) + `window.midnite.updates`,
  mirrored by [`web/lib/desktop-bridge.ts`](../packages/web/lib/desktop-bridge.ts) and a
  `<DesktopOnly>` gate — the TitleBar hangs off this seam, no new detection flag needed.
- **Header slot exists:** [`shell/src/app-frame.tsx`](../packages/shell/src/app-frame.tsx)
  renders an optional top header (`banner` / `headerActions` props) — this phase grows it
  into a real TitleBar on desktop.
- **Appearance runtime** (Phase 39/68) owns theme + accent at runtime — the window's
  `backgroundColor` must follow it so resize flashes and rounded-corner backing match.
- **Command palette** (Phase 41) is the search surface; the bar only needs its trigger.

## Theme A — Frameless macOS window (main process) — **S** ✅

- [x] `titleBarStyle: 'hidden'` + `trafficLightPosition: { x: 16, y: 14 }` (so the
      lights sit level with the bar controls in the 48px bar — `hiddenInset` ignores a custom position) + a
      theme-matching `backgroundColor` on the `BrowserWindow`, gated
      `process.platform === 'darwin'` (non-mac keeps the default frame untouched).
- [x] Keep `win.setTitle()` / the HTML `<title>` flowing — the window title still matters
      for Mission Control, the app switcher, and screen readers even with no visible bar.
- [x] The gateway-failure data-URL page gets an inline drag strip
      (`-webkit-app-region: drag`) so the window stays movable when boot fails.

## Theme B — Window-controls IPC (preload bridge) — **M** ✅

- [x] Bridge contract in `@midnite/shared` ([`shared/src/window-chrome.ts`](../packages/shared/src/window-chrome.ts)):
      `WindowChromeBridge` — `platform`, `frameless` flag, `onFullscreenChange(cb)`,
      `onFocusChange(cb)`, `setBackgroundColor(color)` — so `shell` can type against it
      without importing from `web` (boundary-legal: `shared ◀ shell`).
- [x] Preload: expose `windowChrome` on the existing `midniteDesktop` object
      (enter/leave-fullscreen + focus/blur subscriptions over `ipcRenderer`, fire-and-forget
      `setBackgroundColor` send).
- [x] Main: forward `enter-full-screen` / `leave-full-screen` / `focus` / `blur` window
      events to the renderer; handle the `setBackgroundColor` IPC (validate it's a plain
      `#rrggbb` string before calling `win.setBackgroundColor`).
- [x] [`web/lib/desktop-bridge.ts`](../packages/web/lib/desktop-bridge.ts) mirrors the
      shared type; unit tests for the accessor + color validation.

## Theme C — `TitleBar` in `@midnite/shell` — **M** ✅

- [x] `shell/src/title-bar.tsx`: fixed-height bar (48px token; the collapsed sticky page header is compacted to 45px so it tucks fully behind the bar), `-webkit-app-region: drag`
      with `no-drag` on every interactive child; renders **only** when a
      `WindowChromeBridge` with `frameless: true` is provided (browser renders nothing).
- [x] Traffic-light clearance (left padding for the inset ●●●) that **collapses in
      fullscreen** via `onFullscreenChange` (macOS hides the lights in fullscreen;
      `env(titlebar-area-*)` is not populated on mac, so the bridge event is the source
      of truth).
- [x] Focus/blur dimming: when the window blurs, the bar's text/icons drop to the muted
      token (the Slack behaviour), driven by `onFocusChange`.
- [x] Theme-seamless surface: bar background = the app's own background token; on
      appearance-runtime theme change, call `setBackgroundColor` so the native window
      backing follows (no flash on resize / rounded corners).
- [x] `AppFrame` integration: a `titleBar` slot prop (injected by the host like nav
      config); existing `banner`/`headerActions` behaviour unchanged when absent.
- [x] `boundary.test.ts` stays green (imports from `shared` + `ui` only); RTL tests
      pin the framed / frameless / fullscreen / blurred states (a Storybook story is
      N/A — shell has no Storybook setup; stories live in `web`).

## Theme D — Bar contents (web wires it up) — **M** ✅

- [x] Search pill, centered Slack-style: displays placeholder + `⌘K` hint, opens the
      Phase 41 command palette on click (no new search UI).
- [x] History back/forward arrows with real enabled/disabled state (Next router /
      `history` API), `no-drag`.
- [x] Workspace/page title label in the bar (doubles as the source for `document.title`).
- [x] On desktop, the floating `headerActions` cluster (notifications/avatar/status)
      relocates into the bar's right side; browser layout untouched.
- [x] `web` mounts the TitleBar via the desktop bridge; component tests for the
      pill/nav/relocation gating.

## Theme E — Lock screen & auth coverage — **S** ✅ DONE (PR #634, 2026-08-19)

- [x] `LockScreen` (shell) and the auth/login pages stay draggable under the hidden
      title bar — a top drag strip overlays the starfield without blocking the form.
- [x] Verification pass driven against a real frameless Electron window (dev shell,
      scratch `HOME` + port, **sandbox on with the esbuild-bundled preload — the
      packaged configuration**), measured over CDP: bridge shape, bar geometry +
      drag region, traffic-light clearance, native fullscreen collapse/restore,
      focus/blur dimming, token-seamless surface in light + dark, and
      double-click-to-zoom end to end. 11/11 checks green.
- [x] **Double-click-to-zoom is now ours, not Electron's** — macOS only applies the
      gesture to *native* title bars, so the bar reports the double-click and the
      main process drives `maximize`/`unmaximize` (`toggleMaximize` on the bridge).
      A double-click landing on a `no-drag` slot is ignored, matching a native bar.

---

## Files this phase touches

| Area | Files |
|------|-------|
| Desktop main | [`packages/desktop/src/main/index.ts`](../packages/desktop/src/main/index.ts) (window opts, event forwarding, failure page) |
| Desktop preload | [`packages/desktop/src/preload/index.ts`](../packages/desktop/src/preload/index.ts) (`windowChrome` bridge) |
| Shared | [`packages/shared/src/window-chrome.ts`](../packages/shared/src/window-chrome.ts) (new — bridge contract) |
| Shell | [`packages/shell/src/title-bar.tsx`](../packages/shell/src/title-bar.tsx) (new — `TitleBar` + `TitleBarDragStrip`), [`packages/shell/src/app-frame.tsx`](../packages/shell/src/app-frame.tsx) (slot) |
| Web | [`packages/web/lib/desktop-bridge.ts`](../packages/web/lib/desktop-bridge.ts) (mirror), shell mount point + palette/nav/headerActions wiring |

## Verification

- [x] `moon run :typecheck && moon run :lint && moon run :test` green (incl. all three
      `boundary.test.ts`).
- [x] Real frameless window: bar mounts 48px at `top: 0` as a `drag` region, three
      `no-drag` slots, `--titlebar-h: 3rem`, traffic-light clearance `84px`; bar
      background tracks the token — `#fff` light / `rgb(9,9,11)` dark, the latter
      exactly the window's own `backgroundColor: '#09090b'`, so the seam holds.
- [x] Drag surfaces are pinned by test rather than by memory:
      `packages/web/lib/desktop-drag-regions.test.ts` fails if a persistent
      full-viewport surface (app shell, auth layout, lock screen) drops its drag
      region. Interactive children stay clickable (`no-drag` per slot, RTL-pinned).
- [x] Fullscreen: real native fullscreen collapses the clearance to `12px` and
      restores it to `84px` on leave.
- [x] Blur dims the bar (`data-window-focused="false"`, `opacity: 0.6`); focus
      restores it (`true` / `1`).
- [x] Double-click-to-zoom: `1400×900 → 1728×1003 → 1400×900` (and by renderer
      resize, `1278×821 → 1577×915 → 1278×821`); a double-click on a bar control
      does not zoom.
- [x] Browser web + admin render byte-identical chrome to today (no TitleBar) —
      both suites pass unchanged; the bar mounts only behind the frameless bridge.
- [x] Gateway-failure page carries its own drag strip (`main/index.ts`); the
      automated guard for it lands with PR #624, which extracts `renderFailurePage`
      and asserts the strip appears only when frameless.
> **Human confirm (feel, not function).** Not tracked as an open item — every
> mechanism behind dragging is verified above. A real HID drag is the one thing a
> synthetic event can't stand in for (macOS consumes it in the window manager, not
> the DOM), so whether dragging by the bar *feels* right on a trackpad is worth a
> glance next time you're in the packaged build.

## Decisions / open questions

- **Bar height** — **48px** (**resolved**; the 44px recommendation was not taken).
  48 keeps a 36px control's focus ring off the bar edge, and web's collapsed sticky
  page header holds the same height so it hides exactly behind the bar —
  `TITLE_BAR_HEIGHT` in `shell/src/title-bar.tsx` is the single source.
- **Fullscreen detection** — bridge events, not CSS `env()` (**resolved**: macOS
  `hiddenInset` does not populate `titlebar-area-*`; the env() path is the Windows
  follow-up).
- **Where the bridge type lives** — `@midnite/shared` (**resolved**: keeps
  `shell → shared` legal; `web`'s `desktop-bridge.ts` re-exports it).
- **Windows/Linux** — deferred ⏳: `titleBarOverlay` + `env(titlebar-area-*)` layout
  (Windows) and custom min/max/close buttons (Linux) are a follow-up phase; non-mac
  keeps the native frame and must render exactly as today.
- **Double-click-to-zoom** — macOS handles it natively on drag regions; verify rather
  than implement. If it doesn't fire (Electron regression), wire `onDoubleClick` →
  maximize toggle via the bridge as a fallback.

## Running the desktop shell in dev (learned closing this out)

`moon run desktop:build` + `electron .` is **not** enough: `tsc` leaves the preload
with relative `require`s, and a *sandboxed* renderer's `preloadRequire` can't resolve
them — the preload dies with "module not found", so the bridge (and therefore the
title bar, native notifications, the updater, and `__NEXT_PUBLIC_GATEWAY_URL`) never
arrives and the web silently falls back to `localhost:7777`. `desktop:stage` step 2b
esbuild-bundles the preload for exactly this reason, so run **`pnpm stage`** (or
`install:local`) before launching, and the sandbox can stay on.

Two more dev-only snags: `ELECTRON_RUN_AS_NODE=1` in the environment makes
`electron .` boot as plain Node (no window), and the gateway child resolves `node`
from the login-shell PATH — Homebrew Node 26 (ABI 147) against a better-sqlite3 built
for Node 22 (ABI 127) — so pass `NODE=$(proto bin node)` to pin it.
