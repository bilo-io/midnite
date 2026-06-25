# Phase 10 — Test suite hardening & visual previews

> Phases 0–9 built the product; **Phase 10 makes it trustworthy to change.** We already have a real test base — ~55 Vitest specs in the gateway (services, repositories against `:memory:` SQLite, WS gateways, a terminal e2e spec), 13 schema tests in `shared`, a handful of web unit/component tests, and 18 Storybook stories — but coverage is **uneven**: large parts of `shared` have no tests, web components are storied-but-not-asserted, and there are **no end-to-end flow tests** at all. Phase 10 closes those gaps across four layers — **shared unit**, **gateway**, **Storybook component tests**, **Playwright flows** — and adds a **screenshot-preview pipeline** so every phase's new/changed UI can be previewed (and visually diffed) from a PR.

> This phase is **infrastructure + coverage**, not features. It should not change product behaviour; where a test surfaces a real bug, fix it in a small separate commit and note it. Treat each theme as independently shippable (Decisions §1 for ordering).

> Effort tags: **S** small · **M** medium · **L** large.

> **Why now.** Phase 9's [`execute-phase`](../.claude/commands/execute-phase.md) workflow added a PR-review stage and a wrap-up that reports phase state. A screenshot pipeline (Theme E) gives that review stage **real artifacts** — "here's what this slice looks like" — instead of prose. The robustness work (Themes A–D) is what lets us keep merging phases without regressing the board, the office, councils, or workflows.

---

## Current state (baseline to build on)

- **Runner:** **Vitest** everywhere (`moon run <pkg>:test` → `vitest run`); web runs under **jsdom** ([`packages/web/vitest.config.ts`](../packages/web/vitest.config.ts) + [`vitest.setup.ts`](../packages/web/vitest.setup.ts), `@testing-library/react` + `jest-dom`).
- **Gateway:** strong. Services tested with in-memory fakes, repositories + integration against `:memory:` SQLite, WS gateways (`*.gateway.test.ts`), controllers, lifecycle-hook auth, and one `terminal.e2e.spec.ts`.
- **Shared:** **partial.** Tested: agent-pool, agents, color, config, council, environment, events/{hooks,task,terminal}, node-types, plan, report, source. **Untested:** agent, backup, dashboard, fs, llm, media, memory, node, note, project, routine, run, session, task, trigger, usage, workflow, events/workflow, config-loader.
- **Web:** ~10 unit/component tests (command-palette, market/clocks widgets, dashboard tabs/widgets, office-store, office layout/projects, task-events, use-local-storage). **18 Storybook stories** (SB 10 `@storybook/nextjs-vite`; some use `fn()` from `storybook/test`) — but **stories aren't run as tests** (no `@storybook/addon-vitest` / test-runner).
- **E2E / visual:** **none.** `playwright` is a root devDependency ([`package.json`](../package.json)) but there's no `playwright.config`, no flow specs, and no screenshot/visual-regression tooling.
- **CI:** [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs `moon ci` (typecheck + test + build + lint, affected-aware). Whatever we add must slot into `moon ci` or a sibling job.

---

## Theme A — Shared unit coverage (the contract)

> `shared` is the contract every other package depends on (CLAUDE.md "Golden Rule"). Untested schemas are the highest-leverage gap: a broken zod shape or state-machine transition breaks gateway + cli + web at once.

### A1. Cover the untested `shared` modules — **M** — ✅ DONE (PR #23, 2026-06-20)
- [x] Added `*.test.ts` alongside all 19 previously-untested modules (**agent, backup, dashboard, fs, llm, media, memory, node, note, project, routine, run, session, task, trigger, usage, workflow, events/workflow, config-loader**) — ~150 tests, `shared` now 32 files / 204 tests.
- [x] Each zod schema **round-trips** valid fixtures + **rejects** invalid inputs; discriminated unions (`trigger`, `events/workflow`) asserted to narrow on `type`; pure helpers (`missingProjectRequirements`, `providerSupportsBaseUrl`, `CLI_PROVIDER_MAP`) covered. See [done.md](done.md).
- ❌ **N/A** — the "task state machine" bullet: `shared/task.ts` holds only schemas/enums; the status-transition logic lives in the gateway and is covered under Theme B, not here.

### A2. Schema invariants & client contract — **S–M** — ✅ DONE (PR #25, 2026-06-20)
- [x] WS event unions in [`events/`](../packages/shared/src/events/) — `TaskBoardEvent`, `WorkflowEvent`, `Client`/`ServerTerminalMessage` — each have a fixture for **every discriminant** and a **JSON encode→decode identity** assertion. (No standalone "typed API client" module exists in `shared`; the request/response + event schemas are the contract, covered here + in A1.)
- [x] `shared/src/__fixtures__/` — canonical *complete* valid objects (Task, Session, Project, Workflow(Node/Edge/Run), Memory, Note, Media, Routine, triggers, UsageRecord, …), each asserted to **parse to identity**. Exposed via the **`@midnite/shared/fixtures`** subpath (test-only entry, not the package root) so gateway/web tests reuse them. See [done.md](done.md).

---

## Theme B — Gateway test depth

> Already the strongest layer; the work here is **filling holes and standardising**, not a rewrite. Keep the layering discipline: unit-test services with in-memory repository fakes, integration-test against real `:memory:` SQLite (CLAUDE.md "Testing").

### B1. Controller + WS boundary coverage — **M** — ✅ DONE (PR #28 + #30, 2026-06-21)
- [x] Pattern + first slice landed: `tasks`, `projects`, `notes` controllers (manual Zod `safeParse` rejection → `BadRequestException` 400; valid input delegates with parsed data; service-thrown domain errors propagate, e.g. `NotFoundException` → 404). All 3 WS gateways were already tested. (PR #28)
- [x] **Authenticated hook path** covered: `approval` (PreToolUse — missing/wrong `x-midnite-hook-secret` → 404, valid + bad payload → 400, valid → delegates) + `workflows/webhook` (forwards id/token/body, defaults null body, propagates bad-token rejection). Builds on the existing `lifecycle-hook.controller.test.ts`. (PR #28)
- [x] **Follow-up done (PR #30):** the remaining 18 controllers (admin, agents, councils, environment, fs, health, market, media, memories, metadata, news, providers, routines, sessions, terminal, usage, weather, workflows) under the same direct-instantiation + `vi.fn()` pattern. Councils maps domain errors to 404/400/409; market/news/weather wrap upstream failures as 500. (No `ZodValidationPipe` class exists — controllers validate via manual `safeParse`.)
- [x] **Flaky test fixed (PR #30):** `terminal/terminal.service.spec.ts` snapshots/restores `process.env` per test, so cross-file `MIDNITE_*` leakage between Vitest worker-shared specs can no longer break the secret-scrub assertions.

### B2. Scheduler, pool & lifecycle integration — **M** — ✅ DONE (PR #31, 2026-06-21)
- [x] Integration tests driving lifecycles end-to-end against `:memory:` SQLite: real `TasksService` (+ repository, `TaskEventBus`) wired to the agent pool, scheduler, and runner, with only the PTY boundary (`TerminalService`) faked so each spawn's `onExit` is driven deterministically (no wall-clock sleeps, no real processes). Covers: tick fills slots from the queue; emitted `task.*` WS events agree with persisted state; Stop-hook completion frees + reuses a slot; PTY crash → retry then abandon; failed spawn requeues. (`pool/agent-pool.integration.spec.ts`)
- [x] **Restart recovery** confirmed: a fresh `AgentPoolService.onModuleInit()` requeues orphaned `wip`/`waiting` → `todo` (persisted state is authoritative), leaves terminal states alone, slots start idle, and the scheduler re-runs the recovered tasks.
- [x] **Heartbeat scheduler** due-logic covered with the LLM faked disabled: a due tick records a skip and advances the schedule clock so the next tick is not due; not-due / disabled / blank-prompt / never-fired cases. (`agents/heartbeat-scheduler.integration.spec.ts`)

### B3. Standardise gateway test harness — **S** — ✅ DONE (PR #32, 2026-06-21)
- [x] `gateway/src/test/createTestDb()` consolidates the `:memory:` → `foreign_keys = ON` → `drizzle(schema)` → `migrate` block that **nine** specs hand-rolled, returning `{ db, sqlite, close }` (the `MidniteDb` repositories accept + the raw handle); migration-folder resolution mirrors the production `DbModule`. Refactored `tasks` + `projects` repository specs onto it as proof; `db.test.ts` covers migrations-applied / FK-on / usable handle / per-instance isolation / close.
- ⚠️ **Deviation (documented):** no "Nest testing module with overridable providers" — `@nestjs/testing` isn't a dep and the house style settled in PRs #28/#30/#31 is direct instantiation + `vi.fn()` fakes, so the real duplication (DB setup) is what was consolidated; provider wiring stays explicit. `gateway:typecheck`/`lint`/`test` (481 pass) green; `moon ci` green on PR #32.

---

## Theme C — Component tests via Storybook

> 18 stories already exist but nothing asserts them. Storybook 10's **Vitest addon** runs every story as a test (mount + optional `play` interaction) in a real browser via Playwright, sharing our existing Vitest config — so "story renders without error" becomes a test for free, and `play` functions become interaction tests.

### C1. Wire Storybook-as-tests — **M** — ✅ DONE (PR #35, 2026-06-21)
- [x] `@storybook/addon-vitest` (+ `@vitest/browser`, `playwright`) added to web and registered in [`.storybook/main.ts`](../packages/web/.storybook/main.ts). `vitest.config.ts` split into two projects — **`unit`** (jsdom, the existing specs) and **`storybook`** (headless chromium via Playwright) — so `moon run web:test` runs both. The addon (SB ≥10.3) auto-applies the `.storybook/preview` decorators, so no extra setup file. CI installs chromium (`playwright install --with-deps chromium`) before `moon ci`; `.storybook/**` added to the `web:test` inputs.
- [x] All **18 stories render without throwing** (68 story smoke tests) alongside the 67 unit tests — 135 total green. No story needed fixing.

### C2. Interaction tests on key components — ✅ DONE (PR #36 + #48 + #53 + #146 + #148 + #150, 2026-06-23)
- [x] `play` functions added to **task-card** / **session-card** / **board-view** (click a card → `onSelect`/`onClick`, a plain click not a flaky dnd drag), **theme-toggle** (open menu → pick Light → it becomes the checked option), **templates-table** (expand an accordion row), and a **backfilled command-palette** story (Ctrl+K opens it; typing filters the list; a non-matching query shows the empty state). All assert visible outcomes / `storybook/test` spies, querying by role/label. 71 story tests green. (PR #36)
- ⏳ **filter-pills** play deferred: its story documents that the Next router mock doesn't feed `router.replace` back into `useSearchParams`, so a click can't assert a visible toggle — render stories already cover it.
- [x] **High-value backfill done (PR #48):** stories for the named un-storied components — **modals** (`project-modal`, `memory-modal`, office `library-modal`), the **office HUD** (`office-hud`, seeding the Zustand office store per story), and **widget primitives** (`memory-card`, `widget-card`, `empty-state`). Render smoke + `play` interaction (search/close, tab-switch, store-driven HUD states); `useConfirm` callers wrap in `ConfirmProvider`, `useRouter` uses the global `nextjs.appDirectory` mock. Shared `Memory`/`OfficeAgent` fixtures added. 20 new story tests; `web:test` 190 green.
- [x] **Data-fetching mock infra + first widgets (PR #53):** added a story-only `installMockFetch` helper ([`stories/mock-fetch.ts`](../packages/web/stories/mock-fetch.ts)) that swaps `globalThis.fetch` for a path-keyed stub of canned, schema-valid gateway responses (a `status >= 400` handler drives the error branch; unmatched requests fall through to the real fetch so Storybook's own module loading isn't intercepted). Storied **`news-widget`** (list/grid/error), **`weather-widget`** (°C/°F/error), and the multi-endpoint **`health-widget`** (healthy / gateway-down). 8 new story tests; `web:test` 202 green.
- [x] **More widgets storied (PR #60):** `sessions-widget` (`GET /sessions`), `memories-widget` (`GET /memories`), `activity-widget` (`GET /tasks`) — each loaded/empty/error on `installMockFetch`. 9 more story tests; `web:test` 211 green.
- [x] **List widgets storied (PR #70):** `workflows-widget` (`GET /workflows`), `councils-widget` (`GET /councils`), `shipped-widget` (`GET /tasks`) — each loaded/empty/error. 9 more story tests; `web:test` 245 green.
- [x] **Two-endpoint widgets storied (PR #146):** `agents-widget` (`GET /agents` + `POST /agents/ping`) and `all-projects-widget` (`GET /projects` + `GET /tasks`) — each loaded/empty/error on `installMockFetch`, with the `/agents/ping` handler listed before `/agents` so the broader match can't swallow it.
- [x] **Chart widgets storied (PR #148):** `throughput-widget` (pins `Date.now` via a plain-JS monkeypatch in `beforeEach` so the day-bucketed "done this week" count is deterministic), `usage-widget` (bars come from the mocked `/usage/summary` payload, so no clock pinning — loaded/over-budget/no-calls/error), and `system-monitor-widget` (a no-endpoint random-walk sim — asserts structure: card, CPU/RAM legend, area-chart SVG).
- [x] **Market widgets + boardroom storied (PR #150):** `market-asset-widget` (configured asset off `/market/quote` + `/market/history`), `market-watchlist-widget` (rows off `/market/history`), and the office `boardroom-panel` (the `Promise.all` of `/projects` + `/tasks` + `/memories`). With this **every dashboard/office widget is storied — C2 is complete.**

### C3. Accessibility checks — ◐ PARTIAL (PR #39, 2026-06-21)
- [x] `@storybook/addon-a11y` (pinned `10.4.3`, matching `addon-vitest`) added to web + registered in [`.storybook/main.ts`](../packages/web/.storybook/main.ts). SB ≥10.3 auto-applies the addon's preview annotations, so **axe-core runs against every story** in `moon run web:test` (and the Storybook a11y panel) — no setup file needed. Enabled at `parameters.a11y.test: 'todo'` (warnings) in [`.storybook/preview.tsx`](../packages/web/.storybook/preview.tsx), per "start as warnings": violations surface without failing CI. `web:test` green (71 stories scanned).
- [x] **Structural backlog cleared + promoted to `'error'` (PR #207, 2026-06-25).** Flipped `parameters.a11y.test` to `'error'`; the 57 structural violations the run surfaced are all fixed, so addon-a11y now fails `web:test` on any structural regression:
  - `board-view` — `nested-interactive` ×26 (dropped inert dnd-kit `attributes` — no KeyboardSensor wired), `scrollable-region-focusable` (focusable columns container)
  - `session-card` — `aria-prohibited-attr` ×14 (`role="img"` on the status dot)
  - `page-header` — `empty-heading` (`aria-label={title}` on the typewriter `<h1>`)
  - `markdown-preview` — `label` (state `aria-label` on GFM task-list checkboxes)
  - `memory-modal` / `markdown-editor` — `label` (new `ariaLabel` prop names the textarea)
  - `expression-editor` — `aria-required-children` (`role="tree"`→`"group"`), `scrollable-region-focusable`
- [ ] ⏳ **`color-contrast` backlog (deferred — needs a design pass).** ~99 hits rooted in `--muted-foreground` + the `text-muted-foreground/50,60,70` opacity utilities across ~45 components. Disabled via `parameters.a11y.config.rules` in [`.storybook/preview.tsx`](../packages/web/.storybook/preview.tsx) (documented there) so the rest of the suite runs at `'error'`; re-enable the single rule once the token/opacity contrast pass lands.

---

## Theme D — Flow tests via Playwright

> No e2e exists. Playwright drives the **real Next.js app against a real (or seeded) gateway**, covering the cross-package flows unit/component tests can't: navigation, live WS updates, the kanban, the office.

### D1. Playwright harness — **M** — ✅ DONE (PR #84, 2026-06-22)
- [x] Added [`packages/web/playwright.config.ts`](../packages/web/playwright.config.ts) + [`e2e/`](../packages/web/e2e/). `webServer` boots **both** the real gateway (a direct `node --import tsx` child — killable, so teardown can't orphan it) on a throwaway absolute temp SQLite file with its pool/heartbeat/workflows disabled and **no LLM credentials**, and a Next dev server pointed at it. State reset before each run (ports freed + temp DB removed); seeded over the gateway REST API. Per Decisions §3 (seeded real gateway).
- [x] New moon task **`web:e2e`** (`pnpm exec playwright test`, `deps: ['^:build']`) with **`runInCI: false`** — kept out of `moon ci` and the default `:test`. The dedicated CI job + browser-install step is Theme F.

### D2. Core flow specs — **M–L** — ◐ MOSTLY DONE (PR #84, 2026-06-22)
- [x] **Board:** load `/tasks` (the board route), see seeded tasks in their columns, drag a card Todo→Backlog, assert it **persists across a reload**. (A plain restatus — never into `wip`, which would spawn an agent.)
- [x] **Office:** load `/office`, assert the Phaser **canvas + HUD mount** against the live gateway (controls hint, "0 agents online"), driving the store-driven DOM, not pixels.
  - [ ] ⏳ **Deferred:** the proximity-walk interactions (walk to board room / library / break via `E`) — they need deterministic Phaser physics control that's inherently flaky; covered at the component level by the office-HUD stories (C2).
- [x] **Workflows / councils / dashboard:** one happy-path "view" flow each — the route loads and the gateway-backed view renders (empty state / chrome), catching a broken route or a contract mismatch. Dashboard stubs the external widget calls.
- [x] Tests are **deterministic & isolated** — fresh gateway + temp DB per run, assertions query by role/text (no test IDs), no arbitrary `waitForTimeout`.

---

## Theme E — Screenshot previews per phase

> The payoff the user asked for: **whenever a phase lands, preview screenshots of new/changed UI**, and diff them against a baseline. Two complementary sources — **Storybook** (per-component) and **Playwright** (per-flow/page) — both capture deterministically and publish as PR artifacts, feeding the [`execute-phase`](../.claude/commands/execute-phase.md) Stage 7 review.

### E1. Deterministic screenshot capture — **M** — ✅ DONE (PR #111, 2026-06-22; PR #184, 2026-06-24)
- [x] **Playwright screenshots** of key pages (board, office, workflows, dashboard, councils) in both **light & dark**, at a fixed 1440×900 viewport. A new `screenshots` Playwright project + [`e2e/screenshots/pages.shots.ts`](../packages/web/e2e/screenshots/pages.shots.ts) (+ `moon run web:screenshots`, `runInCI:false`); output → `e2e/__shots__/` (gitignored). Nondeterminism frozen: stable seed data, `setFixedTime` (clocks don't drift but rAF still paints the office canvas), forced reduced-motion (the typewriter header + page-reveal render their final state) + an animation-kill stylesheet, the setup nudge dismissed, external widgets (news/weather/market) stubbed. **Preview artifacts, not pixel-asserted baselines** (that's E2). `web:e2e` scoped to `--project=chromium`.
- [x] **🐛 Surfaced + fixed a real bug:** the e2e gateway never booted on a *fresh* DB (`no such table: council_runs`) — migration ran in `DbModule.onModuleInit`, but a feature module's `onModuleInit` could fire first. Moved migration to DB-handle build (`DbFactory`), before any lifecycle hook; regression test added. (`web:e2e` is `runInCI:false`, so CI never caught it.) Also stabilised the `terminal.service.spec` `MIDNITE_*` env-dump flake (grep `^MIDNITE_` so a large CI env can't truncate the capture).
- [x] **Storybook screenshots** of every storied component in light and dark via [`e2e/screenshots/storybook.shots.ts`](../packages/web/e2e/screenshots/storybook.shots.ts): a new `stories` Playwright project (port 6007, 1280×900) discovers stories from `/index.json`, navigates to `iframe.html?id=<storyId>&viewMode=story&globals=theme:<theme>`, waits on `body[data-story-rendered]`, and saves PNGs to `e2e/__shots__/stories/`. Output is gitignored; `moon run web:screenshots` now runs both `--project=screenshots` and `--project=stories`. (PR #184)

### E2. Visual baseline & diff — **M** — ✅ DONE (PR #177, 2026-06-24)
- [x] `toHaveScreenshot` assertions added to `pages.shots.ts` — each page capture is pixel-asserted against committed baselines in `e2e/__screenshots__/`; a diff image is emitted on failure.
- [x] 10 **Linux (amd64)** baselines committed (board, dashboard, workflows, councils, office × light/dark). Docker command documented in spec + README for regenerating Linux-compatible baselines.
- [x] `playwright.config.ts` extended: `snapshotDir`, `snapshotPathTemplate`, and `toHaveScreenshot.maxDiffPixelRatio: 0.005`.
- [x] **Linux baselines regenerated (2026-06-26, PR #210).** Ran `mcr.microsoft.com/playwright:v1.61.0-jammy` on `linux/amd64` with `build-essential`; 7 of 10 PNGs updated (3 are platform-identical); CI `e2e` job on `ubuntu-latest` will now pass the visual check.

### E3. PR preview artifacts + gallery — **M** — ✅ DONE (PR #186, 2026-06-24)
- [x] `packages/web/scripts/generate-gallery.mjs` — gallery generator (plain ESM, no deps) walks `e2e/__shots__/`, groups pages vs. stories, produces `gallery.html` (dark-themed, relative image refs) and `SCREENSHOTS.md` (markdown manifest grouped by page/component).
- [x] `.github/workflows/preview.yml` — `gallery` job: captures `web:screenshots`, runs gallery gen, uploads whole `__shots__/` dir as 14-day artifact. `storybook` job: builds Storybook, deploys to `gh-pages` branch under `/pr-<N>/` per PR (or `/main/` on main push), posts a preview URL comment; `cleanup` job removes the subdirectory on PR close. All jobs `continue-on-error: true` — never blocks a merge.
- ⚠️ **GitHub Pages prerequisite:** the Storybook deploy requires Pages enabled + configured for the `gh-pages` branch. The workflow is in place; activate when ready.

---

## Theme F — CI wiring, coverage & gates

### F1. Slot the new layers into CI — **M** — ✅ DONE (PR #177, 2026-06-24)
- [x] New `.github/workflows/e2e.yml`: `e2e` job runs `web:e2e` + `web:screenshots` (Playwright flow + visual regression, `continue-on-error: true`); `coverage` job runs `gateway:test-coverage` + `web:test-coverage`.
- [x] Playwright browsers cached in CI via `actions/cache@v4` (key: OS + `package.json` hash).
- [x] Screenshot artifacts uploaded on every run (14 days); diff artifacts uploaded on failure (7 days).

### F2. Coverage reporting & thresholds — **S–M** — ✅ DONE (PR #177, 2026-06-24)
- [x] `@vitest/coverage-v8` wired into both `web` (`vitest.config.ts` coverage block, 20% thresholds) and `gateway` (new `vitest.config.ts`, 40% thresholds).
- [x] `test-coverage` moon tasks added to both packages (`runInCI: false`); CI `coverage` job invokes them with `--force`.
- [x] Reporters: `text` (CI summary) + `json-summary` + `lcov` → uploaded as artifacts (14 days).

### F3. Docs — **S** — ✅ DONE (PR #186, 2026-06-24)
- [x] `docs/TESTING.md` — all four layers (shared unit, gateway, Storybook, Playwright flows + visual), run commands, baseline update instructions (macOS + Docker/Linux), and a cheatsheet for adding a test at each layer.
- [x] `CLAUDE.md` "Testing" section updated: summary table with layer → command → scope, link to `docs/TESTING.md`, Storybook-as-tests and `.git/worktrees` gotcha added.

---

## Libraries & tooling to consider

- **Vitest 3** (installed) — keep as the single runner across unit/component/story tests.
- **`@storybook/addon-vitest` (SB 10)** — runs stories as Vitest tests in a real browser (Playwright provider); the modern replacement for the standalone `@storybook/test-runner`. Already on **`storybook/test`** (`fn`) in several stories. _Recommended over test-runner — see Decisions §2._
- **`@storybook/addon-a11y`** — axe-core a11y assertions in the story run (C3).
- **Playwright 1.61** (installed at root) — flow tests (D) + `toHaveScreenshot` visual snapshots (E). Built-in trace viewer for debugging CI failures.
- **`@vitest/coverage-v8`** — coverage (F2).
- **Optional:** a hosted visual-review service (Chromatic / Playwright's UI service) instead of committed baselines (Decisions §4); **`@faker-js`**/fixed seed helpers for deterministic seed data (or just hand-written fixtures from A2).

---

## Files this phase touches (map)

- **Shared unit:** new `*.test.ts` across [`packages/shared/src/`](../packages/shared/src/); new `shared/src/__fixtures__/`.
- **Gateway:** new controller/gateway specs across [`packages/gateway/src/`](../packages/gateway/src/); new `gateway/src/test/` harness helpers.
- **Storybook:** [`packages/web/.storybook/main.ts`](../packages/web/.storybook/main.ts) (addons + vitest project), new/expanded `*.stories.tsx`, [`packages/web/vitest.config.ts`](../packages/web/vitest.config.ts).
- **Playwright:** new `packages/web/playwright.config.ts`, `packages/web/e2e/**`, `e2e/__screenshots__/**` baselines.
- **Moon/CI:** [`packages/web/moon.yml`](../packages/web/moon.yml) (`test-stories`, `e2e`, `screenshots` tasks), [`packages/gateway/moon.yml`](../packages/gateway/moon.yml), [`.moon/tasks.yml`](../.moon/tasks.yml), [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) (e2e/screenshot job + artifact upload).
- **Docs:** new `docs/TESTING.md`; update [`CLAUDE.md`](../CLAUDE.md) "Testing" and append to [`done.md`](done.md) as items land.

## Verification

- `moon run :test` green across all packages, now including **Storybook-as-tests** for web.
- `moon run web:e2e` green locally and in its CI job; flows are deterministic on repeat runs (no flakes over N runs).
- Editing a component **on purpose** makes the visual test fail with a **diff image**; `--update-snapshots` in the same PR makes it pass again.
- A PR shows **screenshot artifacts** (pages + stories, light/dark) and a browsable gallery/Storybook for the branch — usable from `execute-phase` Stage 7.
- `moon ci` stays green; coverage summary prints; thresholds (where set) hold.
- (Run web tests from the **primary checkout**, not a `.git` worktree — vite can't collect inside `.git/**`.)

## Decisions (resolved 2026-06-20)

> All six confirmed with the recommended option. Recorded here as the decided approach; implementers should follow these, not re-litigate them.

1. **Shipping order** — ✅ **A** (shared unit, cheapest/highest-leverage) → **B** (gateway holes) → **C** (Storybook-as-tests) → **D** (Playwright harness + core flows) → **E** (screenshots, depends on C+D) → **F** (CI/coverage, ongoing). Each is independently shippable.
2. **Story test runner** — ✅ **`@storybook/addon-vitest`** (shares our Vitest config, runs in `web:test`). Fall back to the standalone `@storybook/test-runner` **only** if the Next-vite framework fights the browser provider in CI.
3. **E2E gateway** — ✅ **Seeded real gateway on `:memory:`** (`midnite serve` against a deterministic seed) for the core flows; route-mock only where a real backend is impractical.
4. **Visual baselines** — ✅ **Committed Playwright `toHaveScreenshot` baselines** (in-repo, OS-pinned on the Linux CI image). Revisit a hosted service (Chromatic) later only if review friction proves high.
5. **Coverage gates** — ✅ **Reporting only to start** + modest per-package thresholds and a no-regression ratchet, **not** a hard global number; raise over time. Confirm the *specific* initial threshold numbers in the F2 PR.
6. **CI cost/time** — ✅ Playwright e2e + screenshots run as a **separate, affected-aware CI job** (not in the hot `moon ci` path), with browsers cached.
