# Phase 61 — Fable-Observability (real tokens, cycle time, live ops)

> midnite already has the *skeleton* of observability — a [`metrics/`](../packages/gateway/src/metrics/)
> module with an `agent_run_stats` table + `GET /metrics/ops`, an in-memory
> [`gauge-store`](../packages/gateway/src/metrics/gauge-store.ts) (queue depth, slots, tick
> latency), an **Ops page** with recharts, a 40+ **widget registry**, and per-call LLM usage
> tracking. What it *doesn't* have is the truth: **session token counts are a hash-seeded
> placeholder** (the biggest number in the product is fake — P51 §4 labeled it honestly and moved
> on), there's **no cost attribution** (which task/repo/project spent what), **no cycle-time
> metrics** (todo→wip→done exists only as raw `task_events`), **gauge history dies on restart**,
> the metrics tables **grow unbounded with zero pruning**, and every chart **polls** despite
> Phase 56 shipping a reliable WS. Phase 61 turns the skeleton into an instrument: harvest **real**
> token usage where it's reachable (and label estimates honestly where it isn't), attribute cost,
> make lifecycle time a first-class metric, keep history bounded via rollups, and let the Ops page
> go live. Second phase of the **fable series**: designed with breadth, sliced for execution —
> every theme is a self-contained `/exec` slice.

> **Scope guardrails (CLAUDE.md).** **Deepen the existing seam, don't rebuild it** — all gateway
> work extends the [`metrics/`](../packages/gateway/src/metrics/) + [`usage/`](../packages/gateway/src/usage/)
> modules (controller → service → repository; no second metrics pipeline). New wire shapes
> (session usage, cycle-time, rollups, gauge samples) are **zod schemas in
> [`shared`](../packages/shared/src/)**. Forward-only Drizzle migrations. **Honesty is a hard
> rule** (P51 continuity): a token figure is either **measured** (from a real source) or **labeled
> an estimate** — never fake precision; if harvesting finds no real source for a session, the UI
> says so. **Pruning touches metrics tables only** (`llm_usage`, `agent_run_stats`, gauge samples,
> rollups) — **never `task_events`** (product history, not telemetry). Rollup aggregation rides the
> existing scheduler seam (one tick discipline — no parallel schedulers); the live channel rides
> **Phase 56's reliable WS** (a new scoped channel, not a new socket stack). Budget enforcement
> (P50) keeps its contract — it just starts reading *real* numbers. Web/CLI stay pure API clients.

> Effort tags: **S** small · **M** medium · **L** large. Section I (accounting) is the heart —
> **A** feeds **B**; Section II (lifecycle/fleet) and III (store/pipeline) are independent of I;
> Section IV (surfaces) consumes everything. A→B · C/D anytime · E→(D) · F after 56-B lands ·
> G/H/I last.

---

## Current state (exists ✅ vs. gap ❌)

- ✅ **Metrics seam** — [`gauge-store.ts`](../packages/gateway/src/metrics/gauge-store.ts)
  (`recordQueueDepth`/`recordSlotChange`/`recordTickLatency`, in-memory by design);
  `agent_run_stats` (`taskId`, `startedAt`, `endedAt`, `durationMs`, `outcome`, `retryCount`,
  `repo`) populated by `recordRunStart/End` from [`agent-runner.service.ts`](../packages/gateway/src/pool/agent-runner.service.ts);
  `GET /metrics/ops` (gauges + 7-day throughput/duration/outcome aggregates).
- ✅ **Usage tracking** — [`usage.service.ts`](../packages/gateway/src/usage/usage.service.ts):
  `llm_usage` rows per **gateway** LLM call (provider, model, feature, tokens, `estCostUsd` from a
  static [`pricing`](../packages/gateway/src/usage/) table), `GET /usage/summary`, `checkBudget()`
  (P50 hard caps read it).
- ✅ **Surfaces** — [`ops/page.tsx`](../packages/web/app/(main)/ops/page.tsx) + `ops-view.tsx`
  (slots, queue, tick latency, throughput, durations, outcomes, task health); the
  [`dashboard-widgets.ts`](../packages/web/lib/dashboard-widgets.ts) registry (40+ types,
  react-grid-layout, add/customize picker); **recharts** in deps;
  [`usage-widget.tsx`](../packages/web/components/usage-widget.tsx) (30-day spend, 60s poll).
- ❌ **Session tokens are fake** — [`sessions.service.ts`](../packages/gateway/src/sessions/sessions.service.ts)
  `deriveContextTokens()` is **hash-seeded** (`contextEstimate: true` always). The Stop hook
  carries **no usage payload**; nothing parses the session transcript for real counts. **The core
  gap.**
- ❌ **No cost attribution** — `llm_usage` covers only the gateway's own calls (classifier,
  planner, council, workflow…); no per-**session/task/repo/project** usage or cost anywhere.
- ❌ **No cycle-time metric** — task timestamps are `createdAt`/`updatedAt` (+ `nextRetryAt`);
  todo→wip→done durations are reconstructable from `task_events` but not first-class.
- ❌ **Gauges lost on restart** — the fast-moving gauges are never sampled to disk; trend history
  starts over every boot.
- ❌ **Unbounded growth, no pruning** — `llm_usage`, `agent_run_stats`, `task_failures` grow
  forever; no rollup/retention anywhere (aggregation is query-time only).
- ❌ **Polling-only charts** — Ops polls 10s, widgets 60s; no metrics on the P56 reliable WS.

---

# Section I — Accounting (the truth about tokens & cost)

## Theme A — Real session-token harvesting (best-effort, honestly labeled) — **M-L**

Replace the placeholder with measured numbers where a source exists — and say so where it doesn't.

- [ ] **Probe the sources:** (1) inspect a real Claude Code **session transcript/JSONL** for
      per-message or cumulative `usage` records (the CLI writes session files; verify what token
      data they actually contain per `agentCli`); (2) check whether the **Stop hook** payload can
      carry usage (and whether other CLIs — gemini/codex/opencode — expose anything comparable).
      Document the per-CLI reality in the theme's notes — this is the load-bearing investigation.
- [ ] **Harvest what's real:** a `SessionUsageCollector` in the gateway that, on session end (the
      Stop-hook / `onExit` path) and opportunistically during transcript reads, extracts real
      input/output/cached token counts when present; store per session (Theme B's table).
- [ ] **Replace `deriveContextTokens`:** [`sessions.service.ts`](../packages/gateway/src/sessions/sessions.service.ts)
      returns **measured** figures when harvested (`contextEstimate: false`) and falls back to the
      labeled estimate otherwise — the P51 honesty contract holds; no fake precision, ever.
- [ ] **Pricing:** extend the static [`pricing`](../packages/gateway/src/usage/) table with the
      agent-session models (per-CLI defaults) so harvested tokens convert to `estCostUsd` the same
      way gateway calls do; unknown model ⇒ tokens shown, cost marked unpriced.

## Theme B — Cost attribution: per task, session, repo, project — **M**

Which work cost what.

- [ ] **shared + gateway:** a `session_usage` table (`sessionId`/`taskId`, `agentCli`, `model?`,
      `inputTokens`, `outputTokens`, `cachedTokens?`, `estCostUsd?`, `measured: boolean`,
      timestamps) + zod contract; written by Theme A's collector; forward-only migration.
- [ ] **Attribution rollups in the read path:** extend [`usage.service.ts`](../packages/gateway/src/usage/usage.service.ts)
      `summary()` with `groupBy=task|repo|project|session` (joining `session_usage` +
      `agent_run_stats` + tasks) so "what did repo X / project Y spend this month?" is one query.
- [ ] **Budgets get real:** `checkBudget()` includes harvested session cost in the daily/monthly
      totals (P50 hard caps + soft warns now reflect agent work, not just gateway calls) — flagged
      in the response so the UI can show measured-vs-estimated composition.

---

# Section II — Lifecycle & fleet metrics

## Theme C — Cycle-time as a first-class metric — **M**

How long work actually takes — waiting vs. working.

- [ ] **Derive from `task_events`** (no schema change first): a `CycleTimeService` computing per-task
      `todo→wip` (wait), `wip→done` (work, incl. retries/waiting detours), and end-to-end
      `created→done`, using the existing `status.changed` events; memoize per terminal task.
- [ ] **Aggregates:** p50/p90 cycle-time by repo/project/priority over a window; retry overhead
      (time spent in retry loops, from `agent_run_stats` attempts per task); expose via
      `GET /metrics/cycle-time` on the existing metrics controller.
- [ ] **Decide-and-document:** if event-reconstruction proves too slow at P57 scale, add
      `wipStartedAt`/`doneAt` columns as a follow-up finding — **measure first** (use the P57 bench
      harness), don't pre-add columns.

## Theme D — Gauge history that survives restarts — **S-M** — ✅ DONE (PR #343, 2026-07-07)

Trends, not just the current needle.

- [x] A **sampler** ([`metrics-sampler.service.ts`](../packages/gateway/src/metrics/metrics-sampler.service.ts)):
      every `metrics.sampleIntervalMs` (default 60s; `0` disables) persist a `gauge_samples` row
      (`at`, `queueDepth`, `slotsUsed`, `slotsTotal`, `tickLatencyMs`) from the in-memory store — one
      `unref`'d timer + reentrancy guard, **fail-open**, **skips an all-null snapshot**, and
      **self-prunes** samples older than `metrics.rawRetentionDays` (default 30) each run so the table
      stays bounded before Theme E's rollups/retention.
- [x] `GET /metrics/gauges/history?from&to` returning the sampled series (oldest-first) for the Ops
      charts — bounded at `GAUGE_HISTORY_MAX_POINTS` (newest kept + `truncated` flag); the live
      snapshot endpoint is unchanged. Contract + config in `shared`; migration `0074`.

---

# Section III — Store & pipeline

## Theme E — Rollups + retention (bounded forever) — **M-L**

Keep the truth without keeping every row.

- [ ] **Rollup tables:** `metrics_rollup_hourly` + `metrics_rollup_daily` — per bucket ×
      repo × provider/model: run counts by outcome, total duration, tokens (measured vs estimated),
      `estCostUsd`, avg cycle-time, gauge averages. Zod contracts in `shared`; forward-only migration.
- [ ] **Scheduled aggregation:** a rollup job on the existing scheduler seam (mirroring the P49
      auto-backup pattern): aggregate closed buckets from `llm_usage` + `session_usage` +
      `agent_run_stats` + `gauge_samples`, idempotent (re-run safe), fail-open (a failed rollup
      logs `warn`, never blocks ticks).
- [ ] **Retention:** prune **raw metrics rows** past a config window (`metrics.rawRetentionDays`,
      default 30) *after* their buckets are rolled up; rollups keep forever. **`task_events` and
      `task_failures` are never pruned** (product history — Decision §3). `0` disables pruning
      (today's behavior).
- [ ] **Query switch:** `GET /metrics/ops` + `usage/summary` read **rollups for long windows** and
      raw for the recent window, transparently — charts stay fast at P57 scale (verify with the
      bench harness).

## Theme F — Live metrics channel (ride Phase 56) — **S-M**

The Ops page stops polling.

- [ ] A **`metrics` scoped channel** on the P56 `ReliableBroadcastService` (seq + ring + resume like
      the board channels): the gateway publishes gauge snapshots on change/sample and rollup-bucket
      closes; **depends on 56-B (resume protocol) being merged** — if not yet, land the publish side
      behind the existing broadcast and let the client keep a fast-poll fallback.
- [ ] **web:** the Ops page consumes the channel via the P56 reliable-subscription hook (patch the
      gauge/series state; no full refetch storm — P57 cache discipline); widgets keep their poll as
      the fallback path.

---

# Section IV — Surfaces

## Theme G — Ops page deepening — **M-L**

From snapshot to instrument.

- [ ] **Cost views:** spend by repo/project/provider over time (from Theme B attribution + Theme E
      rollups), measured-vs-estimated composition visible (hatched/labeled segments — honesty in the
      chart, not just the tooltip).
- [ ] **Cycle-time views:** p50/p90 trends, wait-vs-work split, retry overhead — per repo/project
      filters (Theme C data).
- [ ] **Fleet trends:** queue depth / slot utilization / tick latency over time (Theme D history) —
      the restart no longer erases the story; annotate clean-shutdown/boot markers (P54) on the
      timeline where cheap.
- [ ] **Run timeline:** a per-task run strip (attempt bars from `agent_run_stats`: started→ended,
      outcome-colored, retries visible) on the task detail / Ops drill-down — reuse recharts, no new
      chart lib.

## Theme H — Widgets + cockpit integration — **M**

Meet users where they already look.

- [ ] New widget types in [`dashboard-widgets.ts`](../packages/web/lib/dashboard-widgets.ts):
      **cost-by-repo**, **cycle-time**, **fleet-trend** — registered in the existing picker/registry
      (category, sizes, config), rendered with recharts, reading the same endpoints as Ops.
- [ ] **Session cockpit (P51):** the right-panel context/token stat shows **measured** numbers when
      harvested (estimate label only when falling back) + the session's cost line.
- [ ] **Project cockpit (P55):** a cost/throughput card (this project's spend, cycle-time, run
      counts) from the `groupBy=project` attribution.

## Theme I — CLI + docs — **S-M**

Observability from a shell; the model written down.

- [ ] `midnite usage --by repo|project|task` + `midnite ops [--watch]` (or extend the existing
      dashboard/usage commands) via the typed client — tables + global `--json`; exit codes per the
      house pattern.
- [ ] Document the **metrics model** (what's measured vs. estimated, where session tokens come from
      per CLI, rollup grain, retention knobs) in the README/config docs — the honesty contract is
      only real if it's written down.

---

## Files this phase touches (map)

- **New/edit (shared):** `SessionUsage`, `CycleTime`, `GaugeSample`, `MetricsRollup` (+ query
  params) schemas in [`shared/src/`](../packages/shared/src/); `metrics.sampleIntervalMs` /
  `metrics.rawRetentionDays` config in [`config.ts`](../packages/shared/src/config.ts); client
  methods in [`web/lib/api.ts`](../packages/web/lib/api.ts) + [`cli/src/client.ts`](../packages/cli/src/client.ts)
- **New (gateway):** `session_usage`, `gauge_samples`, `metrics_rollup_hourly/daily` tables in
  [`db/schema.ts`](../packages/gateway/src/db/schema.ts) + forward-only [`drizzle/`](../packages/gateway/drizzle/)
  migrations; a `SessionUsageCollector` (in [`usage/`](../packages/gateway/src/usage/) or
  `sessions/`), a `CycleTimeService`, the gauge sampler + rollup job (in
  [`metrics/`](../packages/gateway/src/metrics/))
- **Edit (gateway):** [`metrics.service.ts`](../packages/gateway/src/metrics/metrics.service.ts) /
  `metrics.repository.ts` / controller (new endpoints, rollup-aware reads);
  [`usage.service.ts`](../packages/gateway/src/usage/usage.service.ts) (attribution `groupBy`,
  budget composition); [`sessions.service.ts`](../packages/gateway/src/sessions/sessions.service.ts)
  (real tokens replace `deriveContextTokens`); the Stop-hook/`onExit` path (harvest trigger); the
  P56 broadcast layer (a `metrics` channel)
- **Edit (web):** [`ops-view.tsx`](../packages/web/components/ops-view.tsx) + the Ops page (new
  charts, live channel); [`dashboard-widgets.ts`](../packages/web/lib/dashboard-widgets.ts) (+ the
  new widget components); the session (P51) + project (P55) cockpit panels;
  [`usage-widget.tsx`](../packages/web/components/usage-widget.tsx)
- **New (cli):** `usage`/`ops` command extensions in [`cli/src/index.ts`](../packages/cli/src/index.ts)
- **Reuse:** `agent_run_stats` + `recordRunStart/End`, the gauge store, the pricing table, the P56
  reliable WS, the P57 bench harness (perf checks), the scheduler seam (rollup job), recharts + the
  widget registry — no parallel pipelines.

---

## Verification

- [ ] **Token honesty:** a session whose CLI/transcript exposes real usage shows **measured**
      tokens (`contextEstimate: false`) in the session cockpit + `session_usage`; one with no real
      source still shows the **labeled estimate** — nowhere does an estimated number render as
      exact. The per-CLI source reality is documented.
- [ ] **Attribution:** `usage/summary?groupBy=repo|project|task|session` returns correct joined
      totals; the P50 budget check includes session cost and reports measured-vs-estimated
      composition; a capped budget still blocks spawns as before.
- [ ] **Cycle time:** `GET /metrics/cycle-time` returns todo→wip / wip→done / end-to-end p50/p90
      per repo/project consistent with a hand-checked task's `task_events`; retry overhead matches
      `agent_run_stats` attempts.
- [ ] **History survives restart:** gauge samples persist across a gateway restart and the Ops
      fleet-trend chart shows a continuous series (with the restart visible, not erased).
- [ ] **Rollups + retention:** closed hourly/daily buckets match raw aggregates (idempotent re-run
      = same result); raw metrics rows older than the window are pruned **only after** rollup;
      `task_events`/`task_failures` are untouched; long-window Ops queries hit rollups and stay fast
      on the P57 large seed.
- [ ] **Live channel:** with 56-B available, the Ops page updates gauges without polling (resume/
      resync semantics hold); without it, the fast-poll fallback works.
- [ ] **Surfaces:** the new Ops charts (cost, cycle-time, fleet trends, run timeline), the three
      new dashboard widgets, and the session/project cockpit cards all render real data; `midnite
      usage --by repo` and `--json` output are correct.
- [ ] **Defaults preserve behavior:** with sampling/retention config unset (`0`), no pruning
      happens and existing endpoints behave as before; no schema change breaks the existing Ops
      page mid-phase.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green (shared schema units;
      gateway collector/attribution/cycle-time/rollup/pruning tests incl. idempotency; a bench check
      on rollup-backed queries; web RTL for the new charts/widgets; CLI snapshot; **web tests from
      the primary checkout, not a `.git` worktree**).

---

## Decisions / open questions

1. **Deepen the existing seam** *(settled).* All work extends `metrics/` + `usage/` + the existing
   Ops page/widget registry — no second pipeline, no new chart lib, no Prometheus (see §6).
2. **Best-effort tokens, honestly labeled** *(settled).* Harvest real usage from whatever the
   session transcript / Stop hook actually exposes (per-CLI reality documented in Theme A); measured
   vs. estimated is a first-class flag end-to-end (schema → API → chart). No new agent-CLI
   instrumentation beyond reading what's already emitted.
3. **Prune metrics only — never product history** *(settled).* Retention applies to `llm_usage`,
   `session_usage`, `agent_run_stats` raws, `gauge_samples` (post-rollup); `task_events` and
   `task_failures` are product data and are never pruned by this phase.
4. **Raw + rollups** *(settled).* Bounded raw window (default 30d) + hourly/daily rollups kept
   forever; long-range charts read rollups. Rollup job is idempotent + fail-open on the existing
   scheduler seam.
5. **Cycle time derives from `task_events` first** *(recommend).* No new task columns until the
   P57 bench harness proves reconstruction too slow — measure, then decide (a follow-up, not a
   pre-emptive migration).
6. **Prometheus exporter deferred** *(settled).* In-app Ops + widgets is the chosen surface; a
   `/metrics` scrape endpoint is a clean future add on the same services if external
   Grafana/alerting demand appears.
7. **Live channel depends on 56-B** *(noted).* The metrics channel rides the P56 reliable WS; if
   the resume protocol isn't merged when F starts, land the publish side + keep fast-poll fallback,
   and finish the resume wiring when 56-B lands.
8. **Alerting rules engine out of scope** *(settled).* Budget warns (P50) + notifications (P21)
   already cover thresholds; a general alert-rule builder is a future phase if wanted.