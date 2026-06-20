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

### B1. Controller + WS boundary coverage — **M**
- [ ] Audit each Nest feature module for an untested **controller** (HTTP decode/encode + status codes) and **gateway** (WS event shapes). Add specs where missing — assert the `ZodValidationPipe` rejects bad bodies with the right status, and that services throwing domain errors map to the right HTTP codes.
- [ ] Cover the **authenticated webhook path** (`POST /hooks/:taskId/:event`, per-session secret) — accept valid, reject missing/wrong secret. (Build on the existing `lifecycle-hook.controller.test.ts`.)

### B2. Scheduler, pool & lifecycle integration — **M**
- [ ] Integration tests around the **scheduler tick** + **agent pool** slot transitions and the **heartbeat** scheduler — drive a few task/agent lifecycles end-to-end against `:memory:` SQLite and assert the emitted WS events + persisted state agree. Use `AbortSignal`-driven ticks so tests stay deterministic (no wall-clock sleeps; inject a clock/fake timers).
- [ ] Confirm **restart recovery**: persisted state is the source of truth — seed the DB, boot the service, assert in-memory slots reconstruct correctly.

### B3. Standardise gateway test harness — **S**
- [ ] A shared gateway test helper (`gateway/src/test/`) to build a `Db` on `:memory:` with migrations applied and to spin a Nest testing module with overridable providers — so new feature tests have one obvious setup path. Refactor a couple of existing specs onto it as proof; don't churn all of them.

---

## Theme C — Component tests via Storybook

> 18 stories already exist but nothing asserts them. Storybook 10's **Vitest addon** runs every story as a test (mount + optional `play` interaction) in a real browser via Playwright, sharing our existing Vitest config — so "story renders without error" becomes a test for free, and `play` functions become interaction tests.

### C1. Wire Storybook-as-tests — **M**
- [ ] Add **`@storybook/addon-vitest`** (SB 10) + its Playwright browser provider; register it in [`.storybook/main.ts`](../packages/web/.storybook/main.ts) and add the Vitest **project** so `moon run web:test` runs unit specs **and** stories. (Alternative if the addon fights Next: `@storybook/test-runner` as a separate `web:test-stories` task — see Decisions §2.)
- [ ] Every story must **render without throwing** (the addon's default per-story smoke test). Fix any story that currently only renders by luck.

### C2. Interaction tests on key components — **M**
- [ ] Add `play` functions (using `storybook/test` — `within`, `userEvent`, `expect`) to the highest-value interactive components: **board-view** (drag/cards), **task-card**, **session-card**, **command-palette**, **filter-pills**, **templates-table**, **theme-toggle**. Assert the visible outcome, query by role/label (not test IDs), per CLAUDE.md.
- [ ] Backfill **stories for un-storied high-value components** so the component layer is broadly covered — prioritise anything a phase is likely to touch (office HUD pieces, project/memory/library modals, widgets). Stories double as the screenshot source for Theme E.

### C3. Accessibility checks — **S**
- [ ] Enable the Storybook **a11y addon** in the test run (axe) so stories also assert no critical a11y violations. Start as warnings; promote to failures once clean.

---

## Theme D — Flow tests via Playwright

> No e2e exists. Playwright drives the **real Next.js app against a real (or seeded) gateway**, covering the cross-package flows unit/component tests can't: navigation, live WS updates, the kanban, the office.

### D1. Playwright harness — **M**
- [ ] Add `packages/web/playwright.config.ts` + an `e2e/` dir. `webServer` boots the app for the run; point tests at a **gateway with seeded, deterministic data** — either `midnite serve` against a temp `:memory:`/seeded store, or a lightweight mock-gateway fixture (Decisions §3). No reliance on real Claude Code agents or network.
- [ ] New moon task **`web:e2e`** (`pnpm exec playwright test`) with `deps: ['^:build']` and Playwright browsers installed in CI. Keep it **out of the default `:test`** (it's heavier) — run it in its own CI job (Theme F).

### D2. Core flow specs — **M–L**
- [ ] **Board:** load `/`, see seeded tasks in columns, drag a task between columns, assert it persists + the WS-driven board reflects it.
- [ ] **Office:** load `/office`, the canvas mounts, walk to the **board room** and open the project modal (URL stays `/office`), open the **library** (E), toggle a **break** (E) — proximity → `E` → modal/badge. (Phaser canvas: drive via keyboard + assert the HUD/store-driven DOM, not pixels.)
- [ ] **Workflows / councils / dashboard:** one happy-path flow each (create/view), enough to catch a broken route or a contract mismatch with the gateway.
- [ ] Tests are **deterministic & isolated** — seed per test, no shared mutable state, no arbitrary `waitForTimeout` (await on roles/text/network-idle).

---

## Theme E — Screenshot previews per phase

> The payoff the user asked for: **whenever a phase lands, preview screenshots of new/changed UI**, and diff them against a baseline. Two complementary sources — **Storybook** (per-component) and **Playwright** (per-flow/page) — both capture deterministically and publish as PR artifacts, feeding the [`execute-phase`](../.claude/commands/execute-phase.md) Stage 7 review.

### E1. Deterministic screenshot capture — **M**
- [ ] **Playwright screenshots** of key pages/flows (board, office rooms, workflows, dashboard, councils) in both **light & dark** theme, at a fixed viewport. Freeze nondeterminism: stable seed data, disable animations (`prefers-reduced-motion` / CSS), pin any clock-driven widgets (the world-clocks/market widgets) to fixed values.
- [ ] **Storybook screenshots** of the storied components (reuse the Theme C browser run — capture per story) so component-level changes show up even without a full page.

### E2. Visual baseline & diff — **M**
- [ ] Use Playwright's built-in **`toHaveScreenshot`** snapshotting (per-OS baselines committed under `e2e/__screenshots__/`, or a chosen visual service — Decisions §4). A changed pixel fails the visual test and **emits a diff image**; an intended change is accepted by updating the baseline (`--update-snapshots`) in the same PR.
- [ ] Keep baselines **CI-OS-pinned** (screenshots differ across OSes) — generate/verify on the Linux CI image; document the `--update-snapshots` workflow in the web README.

### E3. PR preview artifacts + gallery — **M**
- [ ] CI uploads the screenshots (and any diffs) as **build artifacts** on every PR, and **deploys/uploads the static Storybook** (`build-storybook` already exists) so reviewers can browse components for the branch.
- [ ] A small **index/gallery** (a generated `screenshots.html` or markdown manifest of captured images, grouped by page/component) so a phase's visual delta is browsable in one place. This is what Stage 7 of `execute-phase` links to. (A hosted Chromatic-style service is an optional upgrade — Decisions §4.)

---

## Theme F — CI wiring, coverage & gates

### F1. Slot the new layers into CI — **M**
- [ ] Storybook tests (C1) run inside `moon run web:test` (so `moon ci` covers them). **Playwright e2e + screenshots** run in a **separate CI job** (own browser install + `web:e2e`/screenshot tasks) so they don't slow the main typecheck/test/build gate. Both must be **affected-aware** where moon allows.
- [ ] Cache Playwright browsers in CI; install with `playwright install --with-deps` on the e2e job only.

### F2. Coverage reporting & thresholds — **S–M**
- [ ] Enable Vitest **coverage** (`--coverage`, v8) per package; print a summary in CI. Set **modest initial thresholds** (e.g. shared higher than web) and a "no-regression" ratchet rather than an aspirational 100% — Decisions §5. Don't block PRs on coverage until the baseline is real.

### F3. Docs — **S**
- [ ] A `docs/TESTING.md` (or a section in the root README): the four layers, how to run each (`moon run :test`, `web:e2e`, `web:test-stories`, screenshot update), where baselines live, and how to add a test at each layer. Update CLAUDE.md "Testing" to point at it.

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
