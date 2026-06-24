# Phase 22 — Fleet visibility: ops metrics & PR lifecycle

> midnite's whole premise is running **many agents in parallel** and walking away — but today you can't see how the fleet is *running*, and the work it ships goes dark the moment a PR URL is captured. The scheduler is a single tick loop that **records no metrics** ([`agent-pool-scheduler.service.ts`](../packages/gateway/src/pool/agent-pool-scheduler.service.ts)); the dashboard's throughput/health tiles are **client-derived** from the task list ([`dashboard-metrics.ts`](../packages/web/lib/dashboard-metrics.ts)), so there's no server-recorded history of run durations, queue depth, or retry/abandon rates. And `task.prUrl` is an **inert string** — scraped from agent output by the Stop hook ([`lifecycle-hook.controller.ts:53`](../packages/gateway/src/pool/lifecycle-hook.controller.ts)) and rendered as a link by the [Shipped widget](../packages/web/components/shipped-widget.tsx), but never resolved to a live **state / CI / review** status. **Phase 22 gives the orchestrator eyes on the whole agent lifecycle — queue → running → shipped → merged** — by recording runtime metrics and an ops surface (the *running* side), and by upgrading PRs from links to polled, status-aware deliverables (the *shipped* side).

> **Scope guardrails (CLAUDE.md).** Two new concerns, both boundary-clean. **Ops metrics** is a new gateway `metrics` module modeled on [`usage`](../packages/gateway/src/usage/) (record → summarize): the scheduler/pool/runner feed it through a thin recorder; it never reaches into other domains' repositories, and LLM spend **reuses** `GET /usage/summary` rather than re-aggregating. **PR status** augments the task entity, so it lives in the **tasks module** (`controller → service → repository`); the GitHub poller is a **single gateway-owned loop** (mirror the scheduler's `OnModuleInit` + `setInterval` + reentrancy-guard shape) and reuses the gh-first / SSRF-guarded fetch posture from [Phase 15 §2](phase-15-smart-intake.md). New wire shapes (the ops summary, the PR-status payload, `config` blocks) live in [`@midnite/shared`](../packages/shared/src/) with zod schemas; `cli`/`web` stay pure clients. New tables get a **forward-only** migration (next is `0030_*`, after [`0029_workflow_storage`](../packages/gateway/drizzle/)); no triggers, no cross-domain FKs. `shared` is the contract.

> Effort tags: **S** small · **M** medium · **L** large. The phase is a **balanced slice of both halves** (Decision §3): Themes **A → B** are the ops spine, **C → D** the delivery spine; the two halves are independent — A gates B, C gates D, but ops and delivery don't depend on each other. Every box starts unchecked — this is net-new work.

---

## Current state (baseline to build on)

- **scheduler/pool (no metrics):** [`agent-pool-scheduler.service.ts`](../packages/gateway/src/pool/agent-pool-scheduler.service.ts) is a single tick loop (`config.agent.schedulerTickMs`, `pool.capacity()`, a `running` reentrancy guard, public `tick()` for tests). [`pool.controller.ts`](../packages/gateway/src/pool/pool.controller.ts) exposes `GET /pool` → `pool.snapshot()` (the **live** slot state) — but nothing records tick latency, queue depth over time, or run outcomes.
- **runner (retries tracked, timing not):** [`agent-runner.service.ts`](../packages/gateway/src/pool/agent-runner.service.ts) spawns the agent session and retries crashes up to `agent.maxRetries` before `abandoned`. `tasks.retryCount` is already a column ([`schema.ts:23`](../packages/gateway/src/db/schema.ts)) — but run **start/end/duration/outcome** is not persisted as a queryable record.
- **usage (the template):** [`usage`](../packages/gateway/src/usage/) module records per-LLM-call cost in `llm_usage` and serves `GET /usage/summary?from=&to=&groupBy=day|provider|feature` ([`usage.controller.ts`](../packages/gateway/src/usage/usage.controller.ts)). Phase 22's `metrics` module copies this record→summarize shape; spend trends reuse this endpoint.
- **dashboard (client-derived widgets):** the registry ([`dashboard-widgets.ts`](../packages/web/lib/dashboard-widgets.ts)) already ships `throughput`, `system-health`, `llm cost & usage`, `shipped`, and `activity` — all computed **client-side** from `getTasks()` via [`dashboard-metrics.ts`](../packages/web/lib/dashboard-metrics.ts) + `usePolling`. There is **no** `/ops` or `/metrics` route; app routes today are dashboard · tasks · sessions · projects · workflows · councils · memory · media · settings · office.
- **PR capture (inert):** the Stop hook scrapes a PR URL via `extractPrUrl(...)` and calls `markDone(sessionId, prUrl)` ([`lifecycle-hook.controller.ts`](../packages/gateway/src/pool/lifecycle-hook.controller.ts), [`tasks.service.ts`](../packages/gateway/src/tasks/tasks.service.ts)). `task.prUrl` ([`task.ts:68`](../packages/shared/src/task.ts), `pr_url` at [`schema.ts:29`](../packages/gateway/src/db/schema.ts)) is surfaced as a `task_links` row ([`tasks.repository.ts`](../packages/gateway/src/tasks/tasks.repository.ts)) and rendered by [`shipped-widget.tsx`](../packages/web/components/shipped-widget.tsx) (which already regex-parses `github.com/owner/repo/pull/N`). **No PR state / CI / review is ever fetched.**
- **gh-first fetch posture:** Phase 15 settled shelling out to `gh` when present (existing auth, private repos), falling back to anonymous `api.github.com` REST for public resources, all behind the SSRF guard [`allowed-origin.ts`](../packages/gateway/src/lib/allowed-origin.ts). Phase 22 reuses this — no second fetch path.

---

## Theme A — Runtime metrics recording (gateway) — **M**

The substrate for the ops surface: record what the fleet does, cheaply. Per-run rows for low-volume run history + in-memory gauges for high-frequency state (Decision §1).

### A1. Per-run stats table + repository — **S–M**
- [x] ✅ (PR #130) New low-volume Drizzle table (`agent_run_stats`) in [`schema.ts`](../packages/gateway/src/db/schema.ts) — **one row per agent run**: `id`, `task_id`, `started_at`, `ended_at` (nullable while live), `duration_ms`, `outcome` (`done | abandoned | failed | cancelled`), `retry_count`, optional `repo`. Forward-only migration `0039`.
- [x] ✅ (PR #130) A `MetricsRepository` (Drizzle only): `insertStart`, `recordEnd`, `countByDay`, `durationBuckets` (5-bucket histogram), `outcomeCounts`. 11 integration tests.

### A2. In-memory gauges — **S**
- [x] ✅ (PR #131) A `GaugeStore` class in `src/metrics/gauge-store.ts`: **queue depth**, **slot state** (used/total), and **last tick latency** — sampled via `recordQueueDepth`, `recordSlotChange`, `recordTickLatency`; a `snapshot()` method returns a defensive copy. No DB, lost on restart by design (Decision §1). 8 unit tests.
- [x] ✅ (PR #139, open) The scheduler/pool/runner feed metrics through a **thin recorder injected into them** (they call `metrics.record*`), not the other way around — the `metrics` module never imports the scheduler's internals.

### A3. `metrics` module + `GET /metrics/ops` — **M**
- [x] ✅ (PR #132) `MetricsModule` registered in `AppModule` — `MetricsService` (wraps `GaugeStore` + `MetricsRepository`, exposes `record*` + `getOpsSummary`), `MetricsController` (`GET /metrics/ops?from=&to=` → `OpsSummary`, zod-validated). 7-day default window. 4 controller tests.
- [x] ✅ (PR #132) LLM spend not re-aggregated — `OpsSummary` has no cost field (Decision §5); the web page will call `GET /usage/summary` separately.
- [x] ✅ (PR #132) `MetricsGauges`, `RunCountByDay`, `DurationBuckets`, `OutcomeCounts`, `OpsQuery`, `OpsSummary` zod schemas in `@midnite/shared/metrics.ts` + 8 tests. Typed web client `getOpsMetrics()` deferred to Theme B.

---

## Theme B — Ops dashboard surface (web) — **M** — ✅ DONE (PR #142)

A dedicated operational view — not more scattered dashboard tiles. **Compose** the existing client-derived widgets, add only the genuinely-missing server-recorded series (Decision §4).

- [x] ✅ (PR #142) A new **`/ops`** route under [`app/(main)/`](../packages/web/app/(main)/) (own route, not a dashboard tab — Decision §4): **live** queue depth + slot utilization (gauges + `GET /pool`), **throughput over time**, **run-duration distribution**, **retry/abandon rates**, and the **LLM-spend trend** (reuse `GET /usage/summary`).
- [x] ✅ (PR #142) Charts read from `getOpsMetrics()` + `usePolling`; empty/no-data and loading states; theme-aware. A nav entry for `/ops` (`ActivitySquare`, default on).
- [x] ✅ (PR #142) `getPoolSnapshot()` (`GET /pool`) + `getOpsMetrics()` (`GET /metrics/ops`) typed clients added to [`lib/api.ts`](../packages/web/lib/api.ts); 14 component tests.
- [ ] **Stretch (defer if the slice tightens):** a compact **run-timeline** — a Gantt-style strip of agent runs over time (from `agent_run_stats`) showing parallelism, durations, and outcomes. *(The full timeline is the "ops-weighted" path we didn't pick — keep it a single stretch bullet, not a theme.)*

---

## Theme C — PR status model + refresh (gateway, tasks module) — **M** — ✅ DONE (PR #122)

✅ **Landed 2026-06-23 (PR #122)** — see [`done.md`](done.md). C1 `PrStatus` contract + `parseGithubPr` (already in `shared/source.ts`); C2 `PrStatusService` (gh-first → anonymous REST, fail-open) + `pr_status` table (migration `0037`, keyed by `task_id`, on the task read shape); C3 single gateway-owned poller (unmerged-only, bounded concurrency) + `POST /tasks/:id/pr/refresh` + `config.prStatus` knob. **Note for follow-ups:** the migration landed as `0037` (the doc's `0030_*` was stale); the shipped-widget regex consolidation (C1's "lift out of `shipped-widget.tsx`") was deferred to **Theme D**, which rewrites that widget anyway.

---

## Theme D — PR/git surface (web) — **M** — ✅ DONE (PR #132)

Make the delivery status visible where the work lives.

- [x] ✅ (PR #132) **PR-status chip** on task cards (state + checks colour: draft/open/merged + passing/failing/pending).
- [x] ✅ (PR #132) A **delivery panel** in the task **thread modal**: PR state, the checks list, review decision, a link out to the PR, and an on-demand **refresh** button (`POST /tasks/:id/pr/refresh`).
- [x] ✅ (PR #132) **Upgraded the Shipped widget** to show live PR/CI status beside each link.
- [x] ✅ **Optional (shipped):** an "awaiting review / awaiting merge" board filter — `DELIVERY_FILTERS` on the tasks board ([`tasks-view.tsx`](../packages/web/components/tasks-view.tsx)) backed by the `?delivery=` URL param (reusing the `FilterPills` saved-filter pattern); classification lives in [`lib/pr-delivery.ts`](../packages/web/lib/pr-delivery.ts) (`deliveryState`/`matchesDelivery`, unit-tested in `pr-delivery.test.ts`). Triages open PRs blocked on a human.
- [x] ✅ (PR #132 + #142) `getOpsMetrics` and PR client calls land in [`lib/api.ts`](../packages/web/lib/api.ts); web tests per Phase 10 conventions.

---

## Out of scope (named, not built here)

- **Setup readiness / "are we configured"** — that's [Phase 19](phase-19-onboarding-wizard.md). Phase 22's "health" is **runtime** (how the fleet is running), not setup state.
- **Notifications on PR/CI events** (PR merged, CI failed → toast/webhook) — a natural [Phase 21](phase-21-notifications.md) synergy once both land; the metrics/PR signals are emitted, but wiring them to channels is **not** built here.
- **midnite *managing* git** — cloning, branching, worktree creation, opening PRs. Phase 22 **observes** the PRs agents create; it doesn't create or mutate them. (Repo-on-disk management stays out, matching [Phase 13](phase-13-repos-first-class.md)'s boundary.)
- **Non-GitHub forges** (GitLab/Bitbucket) and **GitHub webhooks** (push-based status) — polling GitHub only for v1; a webhook receiver is a possible follow-on.
- **Long-term metric retention / downsampling** — the per-run table + in-memory gauges are the v1; rollups/TTL/retention policy are deferred.

---

## Files this phase touches (map)

- **shared:** new [`metrics.ts`](../packages/shared/src/) (`OpsSummary` / `MetricsGauges` + request query) and a PR helper + `PrStatus` shape (new `pr-url.ts` or extend [`source.ts`](../packages/shared/src/source.ts)); a `config` knob for the PR poll interval in [`config.ts`](../packages/shared/src/config.ts); typed clients `getOpsMetrics()` / PR refresh. Barrels + tests.
- **gateway:** new `metrics/` module — `metrics.controller.ts` (`GET /metrics/ops`), `metrics.service.ts` (gauges + aggregation), `metrics.repository.ts` (`agent_run_stats`), `metrics.module.ts`; thin recorder calls in [`agent-pool-scheduler.service.ts`](../packages/gateway/src/pool/agent-pool-scheduler.service.ts) / [`agent-pool.service.ts`](../packages/gateway/src/pool/agent-pool.service.ts) / [`agent-runner.service.ts`](../packages/gateway/src/pool/agent-runner.service.ts). PR status in the tasks module — `PrStatusService` + the poller, `POST /tasks/:id/pr/refresh` in [`tasks.controller.ts`](../packages/gateway/src/tasks/tasks.controller.ts), persistence via [`tasks.repository.ts`](../packages/gateway/src/tasks/tasks.repository.ts); reuse [`allowed-origin.ts`](../packages/gateway/src/lib/allowed-origin.ts). Migration(s) under [`drizzle/`](../packages/gateway/drizzle/) (`0030_*`).
- **web:** a new **`/ops`** page under [`app/(main)/`](../packages/web/app/(main)/) composing existing widgets ([`dashboard-widgets.ts`](../packages/web/lib/dashboard-widgets.ts), [`dashboard-metrics.ts`](../packages/web/lib/dashboard-metrics.ts), [`dashboard-grid.tsx`](../packages/web/components/dashboard-grid.tsx)); PR chip on task cards; a delivery panel in the thread modal; upgraded [`shipped-widget.tsx`](../packages/web/components/shipped-widget.tsx); client calls in [`lib/api.ts`](../packages/web/lib/api.ts).
- **Docs:** update [`CLAUDE.md`](../CLAUDE.md) (the `metrics` module + PR-status polling pattern) + README (`config` PR-poll knob, `/ops` surface); append to [`done.md`](done.md) as slices land.

---

## Verification

- [ ] `moon run gateway:dev` + `moon run web:dev`, open **`/ops`**: queue depth + slot utilization update live; throughput, run-duration distribution, and retry/abandon rates render from server-recorded stats; the LLM-spend trend matches `GET /usage/summary`. (Existing dashboard widgets are unchanged.)
- [ ] Run a task to completion (and one that abandons after retries) → an `agent_run_stats` row records start/end/duration/outcome/retryCount; the ops charts reflect both runs.
- [ ] A task whose agent opened a PR shows a **status chip** on its card (draft/open/merged + checks colour); the thread's delivery panel lists checks + review decision; **refresh** re-fetches.
- [ ] With `gh` authed, a **private**-repo PR resolves; without `gh`, a **public** PR resolves via REST; a network failure leaves the last-known status and never breaks the board.
- [ ] A merged/closed PR stops being polled; the poller only touches tasks with an unmerged PR; the on-demand `POST /tasks/:id/pr/refresh` works.
- [ ] The Shipped widget shows live PR/CI status, not just a link.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across the graph; `moon ci` green. (Run web tests from the **primary checkout**, not a `.git` worktree.)

---

## Decisions / open questions

1. **Metrics storage** *(settled in brainstorm).* **Per-run rows** (one low-volume `agent_run_stats` row per agent run → throughput, duration distribution, retry rates, timeline) **plus light in-memory gauges** (queue depth, slot utilization, tick latency — sampled, not persisted). No high-volume metrics table.
2. **PR refresh strategy** *(settled in brainstorm).* **Interval-poll only tasks with an unmerged PR** on a modest interval + an on-demand refresh; **gh-first** with anonymous GitHub REST fallback for public repos (Phase 15 §2). Bounded concurrency, rate-limit back-off, graceful degrade.
3. **Phase emphasis** *(settled in brainstorm).* **Balanced** — a recommended slice of both halves (A+B ops, C+D delivery), rather than going deep on one. The full run-timeline (ops) and full CI/review surfacing stay as stretch/optional bullets.
4. **Ops surface placement** *(recommend: own `/ops` route).* A dedicated page that *composes* the existing client-derived widgets and adds the server-recorded series, vs. a tab under the dashboard. Own route keeps the operational view distinct from the customisable dashboard. Confirm in the B PR.
5. **LLM spend** *(settled).* Reuse `GET /usage/summary` — the ops page references it; the `metrics` module does **not** re-aggregate cost.
6. **Run-stats home** *(open).* A net-new `agent_run_stats` table (recommended) vs. extending an existing session/run record if one already persists timing. Confirm there's nothing to extend before adding the table, in the A1 PR.
7. **PR-status home** *(open).* A small `pr_status` table keyed by `task_id` (recommended — clean, doesn't bloat the tasks row) vs. columns on `task_links` / `tasks`. Settle in the C2 PR; reference stays the PR **URL**, parsed by the shared helper.
8. **Poll interval + gauge window** *(open).* Concrete numbers — PR poll cadence, gauge rolling-window size, sampling granularity — picked in the implementing PRs.
