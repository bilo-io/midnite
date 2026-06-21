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
- [ ] New low-volume Drizzle table (`agent_run_stats`) in [`schema.ts`](../packages/gateway/src/db/schema.ts) — **one row per agent run**: `id` (UUIDv7), `task_id`, `started_at`, `ended_at` (nullable while live), `duration_ms`, `outcome` (`done | abandoned | failed | cancelled`), `retry_count`, optional `repo`. Forward-only migration `0030_*`. (Net-new — confirm there's no existing run/session record to extend before adding; Decision §6.)
- [ ] A `MetricsRepository` (Drizzle only): `insertStart`, `recordEnd`, and windowed aggregate reads (`countByDay`, `durationBuckets`, `outcomeCounts`). Accepts a `Db` so the service owns transactions.

### A2. In-memory gauges — **S**
- [ ] A small rolling-window gauge store in the `metrics` service: **queue depth** (ready `todo` count), **slots free/used** (from [`pool.snapshot()`](../packages/gateway/src/pool/pool.controller.ts)), and **last tick latency** — sampled by the scheduler each `tick()` and by the pool on slot change. No high-volume table; lost on restart by design (Decision §1).
- [ ] The scheduler/pool/runner feed metrics through a **thin recorder injected into them** (they call `metrics.record*`), not the other way around — the `metrics` module never imports the scheduler's internals.

### A3. `metrics` module + `GET /metrics/ops` — **M**
- [ ] New `MetricsModule` (registered in `AppModule`) — `MetricsService` composes the gauge store + `MetricsRepository`; a thin `MetricsController` serves `GET /metrics/ops?from=&to=` → current gauges + aggregated run stats (throughput, duration distribution, retry/abandon rates) over the window. Validate the query against a shared schema.
- [ ] **Don't re-aggregate LLM spend** — the ops summary references/links `GET /usage/summary`; the web page calls both. (Decision §5.)
- [ ] `OpsSummary` / `MetricsGauges` shapes in [`@midnite/shared`](../packages/shared/src/) (new `metrics.ts`) + zod + tests; typed client `getOpsMetrics()`.

---

## Theme B — Ops dashboard surface (web) — **M**

A dedicated operational view — not more scattered dashboard tiles. **Compose** the existing client-derived widgets, add only the genuinely-missing server-recorded series (Decision §4).

- [ ] A new **`/ops`** route under [`app/(main)/`](../packages/web/app/(main)/) (own route, not a dashboard tab — Decision §4): **live** queue depth + slot utilization (gauges + `GET /pool`), **throughput over time**, **run-duration distribution**, **retry/abandon rates**, and the **LLM-spend trend** (reuse `GET /usage/summary`).
- [ ] **Reuse, don't rebuild:** embed/share the existing `throughput` / `system-health` / `llm cost & usage` rendering ([`dashboard-widgets.ts`](../packages/web/lib/dashboard-widgets.ts), [`dashboard-grid.tsx`](../packages/web/components/dashboard-grid.tsx), [`dashboard-metrics.ts`](../packages/web/lib/dashboard-metrics.ts)); the page adds the server-recorded charts those client-derived tiles can't produce.
- [ ] Charts read from `getOpsMetrics()` + `usePolling`; empty/no-data and loading states; theme-aware. A nav entry for `/ops`.
- [ ] **Stretch (defer if the slice tightens):** a compact **run-timeline** — a Gantt-style strip of agent runs over time (from `agent_run_stats`) showing parallelism, durations, and outcomes. *(The full timeline is the "ops-weighted" path we didn't pick — keep it a single stretch bullet, not a theme.)*

---

## Theme C — PR status model + refresh (gateway, tasks module) — **M**

Upgrade `prUrl` from a link to a polled, status-aware deliverable. gh-first, interval-poll-open-PRs + on-demand (Decision §2).

### C1. PR-status model + shared parse helper — **S**
- [ ] Lift the `github.com/owner/repo/pull/N` regex out of [`shipped-widget.tsx`](../packages/web/components/shipped-widget.tsx) into a **pure helper in [`@midnite/shared`](../packages/shared/src/)** (`pr-url.ts` or extend [`source.ts`](../packages/shared/src/source.ts)) so the gateway poller and the web both parse identically.
- [ ] `PrStatus` shape in `shared`: `{ state: 'open' | 'draft' | 'merged' | 'closed', checks: 'passing' | 'failing' | 'pending' | 'none', reviewDecision?: 'approved' | 'changes_requested' | 'review_required', url, number, fetchedAt }`. zod + tests.

### C2. PR fetcher + persistence — **M**
- [ ] A `PrStatusService` in the tasks module: fetch a PR's status **gh-first** (`gh pr view <url> --json state,isDraft,statusCheckRollup,reviewDecision,mergeStateStatus`), fall back to **anonymous `api.github.com` REST** for public repos when `gh` is absent (Phase 15 §2). Degrade gracefully — `gh` missing / private repo unauthenticated / network failure logs a warn and leaves the last-known status, never throws into task flow.
- [ ] Persist the status — **home is open (Decision §7):** a small `pr_status` table keyed by `task_id` (recommended), or columns on `task_links` / `tasks`. Forward-only migration (shares `0030_*` or a sibling). Exposed on the task read shape so the board/thread render it.

### C3. Refresh loop + on-demand — **S–M**
- [ ] A **single gateway-owned poller** (mirror [`agent-pool-scheduler.service.ts`](../packages/gateway/src/pool/agent-pool-scheduler.service.ts): `OnModuleInit`/`Destroy`, `setInterval` + `unref`, reentrancy guard) that refreshes **only tasks whose PR is not yet merged/closed**, on a modest interval, with bounded concurrency (reuse the `mapWithConcurrency` lib helper from Phase 16). Stops polling a PR once it's terminal (merged/closed).
- [ ] `POST /tasks/:id/pr/refresh` for an on-demand refresh; `config` knob for the poll interval (read via `loadConfig()` only). Respect GitHub rate limits (back off on 403/secondary-limit).

---

## Theme D — PR/git surface (web) — **M**

Make the delivery status visible where the work lives.

- [ ] **PR-status chip** on task cards (state + checks colour: draft/open/merged + passing/failing/pending) — a compact glyph that reads at a glance on the board.
- [ ] A **delivery panel** in the task **thread modal**: PR state, the checks list, review decision, a link out to the PR, and an on-demand **refresh** button (`POST /tasks/:id/pr/refresh`).
- [ ] **Upgrade the Shipped widget** ([`shipped-widget.tsx`](../packages/web/components/shipped-widget.tsx)) to show **live PR/CI status** beside each link, not just the URL.
- [ ] **Optional:** an "awaiting review / awaiting merge" board filter (reuse the existing `?tags=`-style URL-backed saved-filter pattern) so you can triage what's blocked on a human.
- [ ] `getOpsMetrics` and PR client calls land in [`lib/api.ts`](../packages/web/lib/api.ts); web tests per Phase 10 conventions (a chip renders each state; the panel renders checks/review from mocked status).

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
