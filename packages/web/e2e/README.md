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

## The shared harness — import `test` from `helpers/harness`

**Every spec must `import { expect, test } from './helpers/harness'`, not from
`@playwright/test`.** The harness's `test` boots each page past two first-run
modal gates that are permanently on in this environment and swallow every click,
drag and keypress:

- **The setup wizard** auto-opens whenever the gateway reports `ready === false`.
  The config deliberately blanks the LLM keys (so task titles stay deterministic),
  which means the e2e gateway is *never* ready and the wizard *always* opens.
- **The idle screensaver**, `inactivityTimeoutS` (30s by default). Any spec that
  stalls for half a minute picks up a second overlay on top of the first.

This used to be an `addInitScript` block copy-pasted into each spec — so a new
spec was born broken and seven older ones never had it at all. Importing from the
harness is now the whole opt-in. Related helpers:

| Helper | Use it for |
| --- | --- |
| `mergeSettings(target, partial)` | Setting anything in `midnite.settings`. **Never** `setItem('midnite.settings', …)` directly — init scripts stack and re-run on every navigation, so a wholesale assignment clobbers the harness's `inactivityTimeoutS` and hands your spec a screensaver mid-test. |
| `suppressFirstRunGates(target)` | Contexts you build yourself with `browser.newContext()` — the `page` fixture can't reach those. |
| `pressGlobalKey(page, key, expectation)` | ⌘K, `?`, and the `G _` nav chords. Their listeners attach in effects inside `<AuthGate>`, which renders `null` until the session resolves, so a single un-retried keypress right after `goto()` lands on nothing. |
| `uniqueLabel(base)` from `helpers/gateway` | Any fixture a spec later locates by its visible text. `workers: 1` + `retries: 1` + one shared gateway DB means a `beforeAll` re-runs on retry and leaves two rows with the same title, turning your failure into a confusing strict-mode violation. |

The gateway fixture ([`fixtures/midnite.e2e.json`](fixtures/midnite.e2e.json))
carries `agent.pool: 4` for the same reason: `poolEnabled: false` only stops the
autonomous scheduler, and `POST /tasks/:id/start` bypasses it by design — with a
single slot, a retry that seeds a fresh task hits `409 no free agent slot`
because the first attempt's stub agent still holds the only one.

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

## Docs feature screenshots

[`docs-features.shots.ts`](docs-features.shots.ts) (re)generates the screenshots
embedded by the docs app's product-feature pages
(`packages/docs/src/content/{app,agents,overview,settings}`). Because the docs app
never talks to the gateway, those screens are committed static PNGs; this spec
captures each feature route in **light and dark** (`<name>-light.png` /
`<name>-dark.png`) and writes the PNGs into `packages/docs/src/content/assets/`,
so a docs page can show whichever matches the reader's theme. It's gated behind
`CAPTURE_DOCS` so a routine `web:screenshots` run skips it:

```bash
CAPTURE_DOCS=1 pnpm exec playwright test --project=screenshots docs-features.shots.ts
```

## Not in `moon ci`

`web:e2e` and `web:screenshots` are heavier and spawn servers, so they're kept
out of the default `:test` gate and out of `moon ci` (`runInCI: false`). A
dedicated CI job + screenshot artifacts are Phase 10 Themes F / E3.
