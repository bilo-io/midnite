# Phase 24 — Responsive & mobile companion (PWA)

> midnite's web UI is **desktop-only**. The only `@media` rules in [`globals.css`](../packages/web/app/globals.css) are `prefers-reduced-motion` — there are **no width breakpoints**, no `viewport`/`theme-color` export in [`layout.tsx`](../packages/web/app/layout.tsx), the nav is a collapse/expand desktop **sidebar** ([`nav-bar.tsx`](../packages/web/components/nav-bar.tsx)), and the board's drag uses a `PointerSensor` whose 6px activation fights touch-scrolling ([`board-view.tsx:56`](../packages/web/components/board-view.tsx)). A `site.webmanifest` is referenced from `metadata` but it's a **stub** (empty `name`/`short_name`, hardcoded white colours, two icons) with **no service worker** behind it. **Phase 24 makes midnite usable on a phone:** a responsive layout that reflows the core monitoring surfaces to one column, touch-friendly interactions (including a tap-to-move fallback for the kanban), and a real **installable PWA** — so you can glance at the board, watch sessions, and clear notifications/approvals from a small touch screen. It's the surface that completes "start a batch and walk away" alongside notifications ([Phase 21](phase-21-notifications.md)) and the approvals inbox ([Phase 23](phase-23-approvals-autonomy.md)).

> **The boundary that shapes this phase (read first).** The gateway is **loopback-only by decision** — `gateway.host` defaults to `127.0.0.1` ([`config.ts:75`](../packages/shared/src/config.ts)), and [Phase 7](phase-7-hardening-reports-widgets.md) **A5 (remote-access auth) was explicitly ruled OUT OF SCOPE — "local-only."** Phase 24 **does not reverse that.** It is **purely client-side** (Decision §1): responsive + touch + PWA work that pays off the moment you can already reach the gateway — a narrow desktop window, the Electron app, or a phone on the same network via the user's own LAN/Tailscale/tunnel. **Making the gateway reachable from outside loopback (a non-loopback bind + a bearer-token guard + rate limiting) stays the separate, deferred Phase 7 A5 follow-on** — and true background **Web Push** depends on it, so it's out of scope here too.

> **Scope guardrails (CLAUDE.md).** This is **web-package-only** — no gateway, shared, or CLI changes (the data contract is unchanged; the phone is just another client of the same loopback API). Components stay function-components + hooks; reuse the existing styling/utility system and the existing surfaces — don't fork mobile-specific copies of components, make the *one* component responsive. No new cross-package types.

> Effort tags: **S** small · **M** medium · **L** large. Themes are independent and individually shippable. Every box starts unchecked — this is net-new work.

---

## Current state (baseline to build on)

- **layout:** Next.js App Router; routes under [`app/(main)/`](../packages/web/app/(main)/) (dashboard · tasks · sessions · projects · workflows · councils · memory · media · settings · office). Root [`layout.tsx`](../packages/web/app/layout.tsx) sets `metadata.icons` + `manifest: '/site.webmanifest'` but **no `viewport`/`theme-color`** (Next.js `viewport` export missing).
- **no responsiveness:** `globals.css` has **13 `@media` blocks, all `prefers-reduced-motion`** — zero width-based breakpoints. The layout assumes a wide viewport.
- **nav:** [`nav-bar.tsx`](../packages/web/components/nav-bar.tsx) `NavBar()` renders `FEATURES` ([`lib/features.ts`](../packages/web/lib/features.ts)) as a sidebar with an `expandedView` collapse-to-icon-rail mode + tooltips — a **desktop** pattern, not a mobile drawer/tab bar.
- **drag:** [`board-view.tsx:56`](../packages/web/components/board-view.tsx) `useSensor(PointerSensor, { activationConstraint: { distance: 6 } })`; [`sortable-accordions.tsx`](../packages/web/components/sortable-accordions.tsx) similar. PointerSensor receives touch via Pointer Events, but a small distance-activation **conflicts with scrolling** on a phone.
- **notifications (built):** the browser Notification API is already wired ([`use-task-notifications.ts`](../packages/web/hooks/use-task-notifications.ts), Phase 7 D) — foreground/in-tab alerts work; this phase makes them reachable on the installed PWA, not background push.
- **manifest (stub):** [`public/site.webmanifest`](../packages/web/public/) = `{"name":"","short_name":"","icons":[192,512 android-chrome],"theme_color":"#ffffff","background_color":"#ffffff","display":"standalone"}` — empty names, hardcoded white (not theme-aware), missing apple-touch + `start_url`/`scope`. No service worker anywhere.

---

## Theme A — Responsive layout & navigation — **M–L**

Make the core monitoring surfaces reflow to a phone; gate the canvas-heavy ones (Decision §2).

### A1. Viewport + breakpoint foundation — **S–M**
- [ ] Add the Next.js `viewport` export (`width=device-width, initial-scale=1`, `themeColor` reading the theme tokens) in [`layout.tsx`](../packages/web/app/layout.tsx).
- [ ] Establish the **breakpoint approach** (Decision §4 — use the existing utility/styling system; container queries where a component reflows independently of viewport). Document the mobile/tablet/desktop cutoffs once so every surface uses the same ones.

### A2. Mobile navigation — **M**
- [ ] Adapt [`nav-bar.tsx`](../packages/web/components/nav-bar.tsx): below the breakpoint, the sidebar becomes a **drawer or bottom-tab bar** (Decision §5) — primary surfaces reachable in one tap; the icon-rail/expanded states stay for desktop. The command palette (⌘K) remains the power-user jump.
- [ ] Header/page chrome ([`page-header.tsx`](../packages/web/components/page-header.tsx)) collapses gracefully; no horizontal overflow at narrow widths.

### A3. Per-surface reflow (core monitoring) — **M–L**
- [ ] **Board** ([`board-view.tsx`](../packages/web/components/board-view.tsx)): columns stack / horizontally page on a phone; cards stay legible (Theme B handles moving them).
- [ ] **Sessions**, **Tasks**, **Dashboard** ([`dashboard-grid.tsx`](../packages/web/components/dashboard-grid.tsx)): single-column reflow; widgets/cards full-width; tables → scrollable cards.
- [ ] **Notification center** (P21) + **Approvals inbox** (P23): designed to read and act on a phone (these are the "walk away" surfaces — they must work small).
- [ ] **Desktop-only gates** (Decision §2): the **office** canvas ([`components/office/`](../packages/web/components/office/)) and the **workflow editor** ([`workflow-editor.tsx`](../packages/web/components/workflow-editor.tsx)) show a clean **"best viewed on desktop"** notice on a phone rather than a broken canvas. (A genuine mobile canvas is a later, separate effort.)

---

## Theme B — Touch interactions — **M**

The kanban is the signature surface; make moving a card work by finger, two ways (Decision §3).

- [ ] **Tune drag for touch** — give the board's dnd-kit sensor a touch **activation delay** (or a dedicated drag handle) so a press-and-hold drags while a plain swipe **scrolls**. Apply the same to [`sortable-accordions.tsx`](../packages/web/components/sortable-accordions.tsx).
- [ ] **Tap-to-move fallback** — on touch, a card offers a "move to…" affordance (pick the card → choose the target column) so a column change never *requires* a successful drag. Both paths call the same move mutation.
- [ ] **Touch ergonomics** — ≥44px tap targets on interactive controls; modals/sheets sized for a phone; the **xterm live terminal** scoped to **read/scroll** on touch (typing into a PTY from a phone is a non-goal — surface it clearly rather than half-working).

---

## Theme C — PWA installability — **S–M**

A real installable app, not a stub manifest.

- [ ] **Flesh out the manifest** ([`public/site.webmanifest`](../packages/web/public/)): real `name`/`short_name`, **theme-aware** `theme_color`/`background_color` (not hardcoded white — match the app tokens / default theme), a full icon set + maskable icon, `start_url`, `scope`, `display: standalone`. Add **apple-touch** + `apple-mobile-web-app-*` meta in [`layout.tsx`](../packages/web/app/layout.tsx).
- [ ] **Service worker + app shell** — register a SW that caches the static shell (JS/CSS/icons) for fast launch + installability. **Be honest about offline:** the data is live from the loopback gateway, so this is **installable + fast shell, not an offline app** — the SW does not pretend to cache live board/session data. Guard against staleness (network-first for app code, or a clear update prompt).
- [ ] **Install affordance** — "Add to home screen" launches the responsive UI standalone (no browser chrome); verify on iOS Safari + Android Chrome behaviours.

---

## Out of scope (named, not built here)

- **Remote access / non-loopback bind + auth** — the gateway stays loopback-only; binding to a LAN/public address with a bearer-token guard + rate limiting is **[Phase 7](phase-7-hardening-reports-widgets.md) A5** (deferred, local-only). Reaching the PWA from a phone uses the user's own network path (LAN / Tailscale / tunnel). Phase 24 does **not** reverse the local-only decision.
- **True background Web Push** (VAPID + push subscriptions + a push service) — depends on the remote-access layer above + the SW; the existing foreground Notification API (Phase 7 D) covers in-app alerts. Deferred.
- **Native apps** — no React Native / Capacitor wrapper; the Electron desktop app stays the only packaged shell. This is a responsive **web** PWA.
- **Mobile-native office / workflow-editor** — the canvas-heavy surfaces are desktop-gated (A3), not re-laid-out for a phone this phase.
- **Offline data / sync** — no local persistence of board/session data; the app needs a live gateway connection to be useful.

---

## Files this phase touches (map)

- **web (only):** [`app/layout.tsx`](../packages/web/app/layout.tsx) (`viewport` + `theme-color` + apple-touch meta), [`app/globals.css`](../packages/web/app/globals.css) (breakpoints / responsive utilities), [`components/nav-bar.tsx`](../packages/web/components/nav-bar.tsx) (mobile nav), [`components/page-header.tsx`](../packages/web/components/page-header.tsx), [`components/board-view.tsx`](../packages/web/components/board-view.tsx) (touch sensors + tap-to-move) + [`components/sortable-accordions.tsx`](../packages/web/components/sortable-accordions.tsx), [`components/dashboard-grid.tsx`](../packages/web/components/dashboard-grid.tsx) and the sessions/tasks views (reflow); the office ([`components/office/`](../packages/web/components/office/)) + [`workflow-editor.tsx`](../packages/web/components/workflow-editor.tsx) (desktop-only notice); [`public/site.webmanifest`](../packages/web/public/) + icons; a new service worker + registration.
- **No gateway/shared/cli changes** — the data contract is unchanged; the phone is another client of the same loopback API.
- **Docs:** note the responsive/PWA support + the explicit local-only reach caveat in the README; update [`CLAUDE.md`](../CLAUDE.md) Web section (responsive + PWA conventions, and that Tailwind/utilities are now the styling path if that note is stale); append to [`done.md`](done.md) as slices land.

---

## Verification

- [ ] At a phone width (e.g. 390px) the board, sessions, tasks, dashboard, the notification center, and the approvals inbox are **usable** — single-column, no horizontal overflow, legible, with a mobile nav (drawer/tabs).
- [ ] On a touchscreen, a card can be moved between columns **two ways**: a press-and-hold drag (without hijacking scroll) **and** a tap-to-move affordance; a plain swipe scrolls the board.
- [ ] The office and workflow editor show a clean **"best on desktop"** notice on a phone rather than a broken canvas.
- [ ] The app is **installable** (valid manifest with real name/icons/theme colour; "Add to home screen") and launches **standalone**; the shell loads fast via the service worker; the app still requires a live gateway connection (no false offline promise).
- [ ] `theme-color` + manifest colours **follow the theme** (not hardcoded white); light/dark both look intentional installed.
- [ ] Reaching the PWA from an actual phone over the user's LAN/tunnel works because the **gateway is not modified** — and the docs state plainly that exposing it beyond loopback is the separate Phase 7 A5 work.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green; Storybook/RTL responsive states covered where practical. (Run web tests from the **primary checkout**, not a `.git` worktree.)

---

## Decisions / open questions

1. **Access model** *(settled in brainstorm).* **Client-only** — responsive + touch + PWA. Reaching from a phone uses the existing LAN/Tailscale/tunnel path; the non-loopback bind + bearer-token guard + rate limiting **stays Phase 7 A5** (deferred). No reversal of local-only.
2. **Surface scope** *(settled in brainstorm).* **Core monitoring responsive + desktop-only gates** — board, sessions, tasks, dashboard, notifications (P21), approvals (P23) reflow; the office canvas and workflow editor show a "best on desktop" notice rather than being forced onto a phone.
3. **Touch task-move** *(settled in brainstorm).* **Both** — tuned dnd-kit drag (activation delay/handle) **and** a tap-to-move fallback, so a column change never depends on a finicky drag.
4. **Breakpoint approach** *(open).* Use the existing utility/styling system's responsive variants + container queries for self-reflowing components, vs. hand-rolled `@media` in `globals.css`. (The codebase already uses utility classes — confirm Tailwind is wired and CLAUDE.md's "not yet" note is stale.) Pick once and apply uniformly; settle in the A1 PR.
5. **Mobile nav pattern** *(open).* A slide-in **drawer** vs. a **bottom-tab bar** for primary navigation on a phone. Recommend bottom-tabs for the top few surfaces + a drawer/overflow for the rest; confirm in the A2 PR.
6. **Service-worker strategy** *(open).* Network-first for app code (avoid stale UI) with a precached shell, vs. stale-while-revalidate + an update prompt. Since data is live and only the shell is cached, recommend network-first-for-code + precached static assets. Confirm in the C PR.
7. **xterm on touch** *(recommend: read/scroll only).* Typing into a live PTY from a phone is a non-goal; the terminal is a read/scroll surface on touch, clearly indicated. Revisit only if there's real demand.
