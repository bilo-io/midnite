# Web e2e flow tests + screenshot capture (Playwright)

Phase 10 Theme D — end-to-end flow tests that drive the **real Next.js app
against a real gateway**, covering the cross-package paths unit/component tests
can't (navigation, the kanban drag, live data, the office canvas) — plus Theme
**E1**, deterministic per-page screenshot capture.

Two Playwright projects share one webServer:

- **`chromium`** — the flow specs (`*.e2e.ts`).
- **`screenshots`** — the capture spec (`*.shots.ts`), at a fixed 1440×900
  viewport with reduced motion.

## Run

```bash
moon run web:e2e                          # flow tests (chromium project)
moon run web:screenshots                  # capture PNGs (screenshots project)

pnpm exec playwright test --project=chromium      # from packages/web
pnpm exec playwright test --project=screenshots
pnpm exec playwright test --project=chromium board # a single flow spec
pnpm exec playwright test --headed                 # watch it drive a browser
```

First time only, install the browser: `pnpm exec playwright install chromium`.

> Run from the **primary checkout**, not a `.git/worktrees` worktree — Vite/Next
> tooling can't collect files under `.git/**`.

## How it works

[`playwright.config.ts`](../playwright.config.ts) boots two servers for the run:

- **Gateway** (`node --import tsx src/main.ts`) on **:7811**, against a throwaway
  temp SQLite file (removed before each run → deterministic, isolated seed data),
  with its agent pool disabled and no LLM credentials
  ([`e2e/fixtures/midnite.e2e.json`](fixtures/midnite.e2e.json)) — it serves real
  REST/WS but never spawns an agent or makes an external call.
- **Next dev** on **:3311**, pointed at that gateway via `NEXT_PUBLIC_GATEWAY_URL`.

Dedicated ports (see [`config.ts`](config.ts)) keep a run from colliding with your
dev `:3000`/`:7777`. Specs seed data over the gateway REST API
([`helpers/gateway.ts`](helpers/gateway.ts)) and assert against accessible
roles/text — never pixels or test IDs.

> **One run per machine at a time.** The ports and the temp DB path are fixed, so
> a second concurrent run on the same box would free the first run's ports and
> wipe its DB. Fine for CI (isolated) and normal local use; don't run two at once.

## Screenshot capture (Theme E1)

[`screenshots/pages.shots.ts`](screenshots/pages.shots.ts) saves a PNG of every
key page (board, dashboard, workflows, councils, office) in **light and dark** to
`e2e/__shots__/` (gitignored). Determinism is engineered, not hoped for:

- **Stable seed data** — a fixed spread of tasks across columns.
- **Frozen clock** — `page.clock.setFixedTime` fixes `Date.now()`/`new Date()`
  (so date/clock-driven widgets don't drift) while keeping timers running, so the
  office's rAF-driven canvas still paints.
- **Reduced motion + an animation-kill stylesheet** — the app's typewriter header
  and page-reveal honour `prefers-reduced-motion` and render their final state
  instantly, so a capture never lands mid-animation.
- **Setup nudge dismissed + external widgets stubbed** — the first-run nudge and
  the news/weather/market proxies would otherwise add nondeterministic chrome.

These are **preview artifacts, not `toHaveScreenshot` baselines** — there's no
pixel assertion, so the task never fails on a rendering delta and never commits
OS-specific images. The committed visual baseline + diff (Theme E2) and the CI
artifact upload + gallery (Theme E3) build on top of this capture.

## Not in `moon ci`

`web:e2e` and `web:screenshots` are heavier and spawn servers, so they're kept
out of the default `:test` gate and out of `moon ci` (`runInCI: false`). A
dedicated CI job + screenshot artifacts are Phase 10 Themes F / E3.
