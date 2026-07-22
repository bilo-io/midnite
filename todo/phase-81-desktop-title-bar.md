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

## Theme A — Frameless macOS window (main process) — **S**

- [ ] `titleBarStyle: 'hiddenInset'` + `trafficLightPosition` + a theme-matching
      `backgroundColor` on the `BrowserWindow`, gated `process.platform === 'darwin'`
      (non-mac keeps the default frame untouched).
- [ ] Keep `win.setTitle()` / the HTML `<title>` flowing — the window title still matters
      for Mission Control, the app switcher, and screen readers even with no visible bar.
- [ ] The gateway-failure data-URL page gets an inline drag strip
      (`-webkit-app-region: drag`) so the window stays movable when boot fails.

## Theme B — Window-controls IPC (preload bridge) — **M**

- [ ] Bridge contract in `@midnite/shared` (e.g. `shared/src/desktop/window-chrome.ts`):
      `WindowChromeBridge` — `platform`, `frameless` flag, `onFullscreenChange(cb)`,
      `onFocusChange(cb)`, `setBackgroundColor(color)` — so `shell` can type against it
      without importing from `web` (boundary-legal: `shared ◀ shell`).
- [ ] Preload: expose `windowChrome` on the existing `midniteDesktop` object
      (enter/leave-fullscreen + focus/blur subscriptions over `ipcRenderer`, fire-and-forget
      `setBackgroundColor` send).
- [ ] Main: forward `enter-full-screen` / `leave-full-screen` / `focus` / `blur` window
      events to the renderer; handle the `setBackgroundColor` IPC (validate it's a plain
      `#rrggbb` string before calling `win.setBackgroundColor`).
- [ ] [`web/lib/desktop-bridge.ts`](../packages/web/lib/desktop-bridge.ts) mirrors the
      shared type; unit tests for the accessor + color validation.

## Theme C — `TitleBar` in `@midnite/shell` — **M**

- [ ] `shell/src/title-bar.tsx`: fixed-height bar (44px token), `-webkit-app-region: drag`
      with `no-drag` on every interactive child; renders **only** when a
      `WindowChromeBridge` with `frameless: true` is provided (browser renders nothing).
- [ ] Traffic-light clearance (left padding for the inset ●●●) that **collapses in
      fullscreen** via `onFullscreenChange` (macOS hides the lights in fullscreen;
      `env(titlebar-area-*)` is not populated on mac, so the bridge event is the source
      of truth).
- [ ] Focus/blur dimming: when the window blurs, the bar's text/icons drop to the muted
      token (the Slack behaviour), driven by `onFocusChange`.
- [ ] Theme-seamless surface: bar background = the app's own background token; on
      appearance-runtime theme change, call `setBackgroundColor` so the native window
      backing follows (no flash on resize / rounded corners).
- [ ] `AppFrame` integration: a `titleBar` slot prop (injected by the host like nav
      config); existing `banner`/`headerActions` behaviour unchanged when absent.
- [ ] `boundary.test.ts` stays green (imports from `shared` + `ui` only); RTL tests +
      a Storybook story (framed vs frameless vs fullscreen vs blurred states).

## Theme D — Bar contents (web wires it up) — **M**

- [ ] Search pill, centered Slack-style: displays placeholder + `⌘K` hint, opens the
      Phase 41 command palette on click (no new search UI).
- [ ] History back/forward arrows with real enabled/disabled state (Next router /
      `history` API), `no-drag`.
- [ ] Workspace/page title label in the bar (doubles as the source for `document.title`).
- [ ] On desktop, the floating `headerActions` cluster (notifications/avatar/status)
      relocates into the bar's right side; browser layout untouched.
- [ ] `web` mounts the TitleBar via the desktop bridge; component tests for the
      pill/nav/relocation gating.

## Theme E — Lock screen & auth coverage — **S**

- [ ] `LockScreen` (shell) and the auth/login pages stay draggable under the hidden
      title bar — a top drag strip overlays the starfield without blocking the form.
- [ ] Manual verification pass in the packaged app: drag from every surface (board,
      task detail, lock screen, login, failure page), double-click-to-zoom, fullscreen
      in/out, theme switch (backing color follows).

---

## Files this phase touches

| Area | Files |
|------|-------|
| Desktop main | [`packages/desktop/src/main/index.ts`](../packages/desktop/src/main/index.ts) (window opts, event forwarding, failure page) |
| Desktop preload | [`packages/desktop/src/preload/index.ts`](../packages/desktop/src/preload/index.ts) (`windowChrome` bridge) |
| Shared | `packages/shared/src/desktop/window-chrome.ts` (new — bridge contract) |
| Shell | `packages/shell/src/title-bar.tsx` (new), [`packages/shell/src/app-frame.tsx`](../packages/shell/src/app-frame.tsx) (slot), [`packages/shell/src/lock-screen.tsx`](../packages/shell/src/lock-screen.tsx) (drag strip) |
| Web | [`packages/web/lib/desktop-bridge.ts`](../packages/web/lib/desktop-bridge.ts) (mirror), shell mount point + palette/nav/headerActions wiring |

## Verification

- [ ] `moon run :typecheck && moon run :lint && moon run :test` green (incl. all three
      `boundary.test.ts`).
- [ ] Packaged app (`desktop install:local` flow): frameless window, seamless bar color
      in light + dark + accent themes, traffic lights inset correctly.
- [ ] Drag works from the bar on every surface; interactive children still clickable.
- [ ] Fullscreen: clearance collapses on enter, restores on leave.
- [ ] Blur dims the bar; focus restores it.
- [ ] Browser web + admin render byte-identical chrome to today (no TitleBar).
- [ ] Gateway-failure page is draggable.

## Decisions / open questions

- **Bar height** — recommend **44px** (Slack density; clears the traffic lights at
  their default inset y).
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
