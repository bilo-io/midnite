# Phase 60 Theme J — Mobile & responsive polish (findings)

> Audit of the small-screen + PWA paths. Evidence is from a Playwright sweep of
> every top-level surface across the full breakpoint matrix (320 / 375 / 390 / 768 /
> 844-landscape px) asserting **no horizontal body scroll** (the CLAUDE.md
> invariant), plus a static pass for hand-written widths, touch targets, and
> safe-area handling. Shots: [`e2e/mobile-audit.shots.ts`](../../packages/web/e2e/mobile-audit.shots.ts)
> (preview PNGs in `e2e/__shots__/`, gitignored).
>
> Per the phase's quick-win rule this slice also **fixed the ≥P2 / S-effort
> issues inline** (marked ✅ FIXED); the regression is locked by the shots spec.
> Severity: **P0** exploitable/data-loss · **P1** real bug · **P2** quality ·
> **P3** nice-to-have.

## Method

- **Viewport matrix:** 320×640 (smallest phone), 375×667 (iPhone SE), 390×844
  (iPhone 14), 768×1024 (iPad portrait / `md`), 844×390 (landscape phone).
- **Automated invariant:** `document.body.scrollWidth ≤ documentElement.clientWidth`
  on every surface at every width — a failure is a real horizontal-scroll bug.
- **Surfaces:** board, tasks, sessions, dashboard, projects, memory, councils,
  media, slides, workflows, ops, schedules, ideas, search, settings (+ appearance /
  api-tokens / integrations), and a seeded task-detail page.
- **Static:** grep for `window.innerWidth`/hand-rolled `matchMedia` width branches,
  `env(safe-area-inset-*)` coverage, raw `<table>` overflow wrappers, and icon-button
  touch-target sizes.

---

## Finding J1 — `/projects` toolbar overflows the viewport on phones ✅ FIXED

- **severity:** P1
- **evidence:** [`projects-view.tsx:246`](../../packages/web/app/(main)/projects/projects-view.tsx) —
  the controls row `flex items-center justify-between gap-3` never wraps; its right
  group (view-mode toggles + "New project") is pushed off-screen. Measured body
  overflow: **+163px @320, +108px @375, +93px @390**. The overflowing node was the
  right-hand `div.flex.items-center.gap-2` (`right=483` at a 375px viewport).
- **repro:** `/projects` at ≤390px → page scrolls sideways; the New-project button
  is partly off-screen.
- **fix:** added `flex-wrap gap-y-2` so the toolbar wraps to a second row on narrow
  screens. **effort:** S.

## Finding J2 — `/ops` overflows the viewport on phones ✅ FIXED

- **severity:** P1
- **evidence:** [`ops-cycle-fleet.tsx:191`](../../packages/web/components/ops-cycle-fleet.tsx) —
  the Recharts `ResponsiveContainer` chart wrappers (`MiniChart`, cycle-time chart)
  sit in a grid/flex track without `min-w-0`, so the chart keeps its measured width
  and forces the page wider; the metrics/decisions tab bar
  ([`ops-view.tsx:405`](../../packages/web/components/ops-view.tsx)) also didn't wrap.
  Measured body overflow: **+51px @375, +36px @390**.
- **repro:** `/ops` at ≤390px → sideways scroll (reproduces even before the charts
  have data — the container measures wide).
- **fix:** `min-w-0` on the chart wrappers (the standard Recharts-in-flex guard) +
  `flex-wrap` on the tab bar. **effort:** S.

## Finding J3 — `/schedules` toolbar overflows at ≤375px ✅ FIXED

- **severity:** P2
- **evidence:** [`schedules-view.tsx:103`](../../packages/web/app/(main)/schedules/schedules-view.tsx) —
  same non-wrapping `justify-between` controls row (preset menu + "New schedule").
  Overflow **+57px @320, +2px @375**; right group `right=377` at 375px.
- **fix:** `flex-wrap gap-y-2`. **effort:** S.

## Finding J4 — `/workflows` toolbar overflows at 320px ✅ FIXED

- **severity:** P2
- **evidence:** [`workflows-view.tsx:167`](../../packages/web/app/(main)/workflows/workflows-view.tsx) —
  the controls row overflows **+8px @320** (tightest phone only).
- **fix:** `flex-wrap gap-y-2`. **effort:** S.

## Finding J5 — Settings tables clip columns instead of scrolling ✅ FIXED

- **severity:** P2
- **evidence:** the API-tokens table
  ([`api-tokens-view.tsx:248`](../../packages/web/app/(main)/settings/api-tokens/api-tokens-view.tsx))
  and the webhooks table
  ([`integrations-view.tsx:399`](../../packages/web/app/(main)/settings/integrations/integrations-view.tsx))
  wrap `<table>` in `overflow-hidden` — on a narrow screen the trailing columns
  (token prefix, created-at, actions) are **clipped and unreachable** rather than
  scrollable, violating the CLAUDE.md "tables scroll in their own container" rule.
  (The other 6 app tables already use `overflow-x-auto`.)
- **repro:** create an API token, open `/settings/api-tokens` at 375px → the
  right-most cells are cut off with no way to scroll to them.
- **fix:** `overflow-hidden` → `overflow-x-auto` (keeps the rounded border, adds
  horizontal scroll). **effort:** S. *(Verified by inspection; the shots spec hits
  the empty state, which renders no table.)*

## Finding J6 — Secondary icon buttons are below the 44px touch target

- **severity:** P3
- **evidence:** most icon-only controls render at 28–32px — e.g. the cockpit rail
  toggles ([`rail-shell.tsx`](../../packages/web/components/rail-shell.tsx),
  `h-8 w-8`), project view-mode toggles
  ([`projects-view.tsx:280`](../../packages/web/app/(main)/projects/projects-view.tsx),
  `h-7 w-7`), and various card overflow menus. Apple/Material guidance is ≥44px.
  The **primary** mobile control — the bottom tab bar
  ([`mobile-nav.tsx:132`](../../packages/web/components/mobile-nav.tsx)) — is
  correctly sized (each tab is `h-full flex-1` inside a 4rem bar).
- **repro:** tapping a 28px view-toggle on a phone is fiddly (no failure, just
  imprecise).
- **suggested fix:** a mobile-only min-hit-area pass — e.g. an `after:` pseudo hit
  slop or `max-md:h-10 max-md:w-10` on icon buttons that appear on touch surfaces —
  without inflating desktop density. **effort:** M (broad, cross-cutting → left as a
  follow-up, not a quick-win).

---

## Verified good (no action)

- **No horizontal body scroll** on any surface at any of the 5 widths after J1–J5
  (the shots spec is green) — board snap-scroll, cockpit drawers (51/55), memory /
  councils / media / dashboard / search / task-detail all reflow cleanly.
- **Safe-area insets** are handled: the app shell pads
  `env(safe-area-inset-bottom)` ([`layout.tsx:35`](../../packages/web/app/(main)/layout.tsx))
  and the mobile nav + its sheet both inset for the home indicator
  ([`mobile-nav.tsx:92,132`](../../packages/web/components/mobile-nav.tsx)).
- **JS ↔ CSS cutoffs agree:** no hand-written viewport-width branches — every
  `window.matchMedia` call is for `prefers-reduced-motion` or `display-mode:
  standalone`, and layout branching goes through `useIsMobile`/`useIsTablet`/
  `useIsDesktop` (CLAUDE.md rule upheld).
- **Tables elsewhere** (councils, ideas, ops, markdown-preview, inbound deliveries)
  already scroll in an `overflow-x-auto` container.

## Not deeply verified (data-dependent — follow-up)

- **Diff viewer (P52)** + **slides present mode (P48)** deep touch behavior — the
  e2e gateway can't seed a real PR diff / running deck, so only their shell reflow
  was checked (no overflow). Worth a manual phone pass.
- **xterm read-only-on-touch** — requires a live session/agent; not exercised here.

---

## Ranked summary

| # | Severity | Area | Status | Effort |
|---|----------|------|--------|--------|
| J1 | P1 | `/projects` toolbar overflow | ✅ fixed | S |
| J2 | P1 | `/ops` chart + tab-bar overflow | ✅ fixed | S |
| J3 | P2 | `/schedules` toolbar overflow | ✅ fixed | S |
| J4 | P2 | `/workflows` toolbar overflow | ✅ fixed | S |
| J5 | P2 | settings tables clip vs. scroll | ✅ fixed | S |
| J6 | P3 | sub-44px secondary touch targets | ⏳ follow-up | M |
</content>
