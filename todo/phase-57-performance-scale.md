# Phase 57 — Performance & Scale (stay snappy as the fleet grows)

> midnite works great with a few dozen tasks. The grounding is honest about what happens at a few
> thousand: it falls over. The board's `GET /tasks` **hydrates every task with 6 extra queries
> each** ([`tasks.repository.ts`](../packages/gateway/src/tasks/tasks.repository.ts) `hydrate()` —
> prStatus + deps + checkRuns + events + attachments + links), so **1k tasks ≈ 6,000 queries** per
> board load — and that same path is paid by the sessions list (which calls `listTasks()`
> internally), search reindex, and even `AgentPoolService.snapshot()` (which **hydrates every
> `todo` task just to count them**). There's **no pagination** on the big lists, **no
> virtualization** (the board renders every card in the DOM), a **refetch storm** (`staleTime: 0`
> + `invalidateQueries()` on *every* WS event → a full board reload per event), and **bloated
> payloads** (the list DTO carries full event history — ~1–2.5 MB per board). Phase 57 makes
> midnite scale — **evidence-driven**, across backend and frontend, with a seed + benchmark
> harness so every fix is measured and regressions can't creep back.

> **Scope guardrails (CLAUDE.md).** No new domain — performance work across existing layers. Query
> fixes stay in **repositories** (batch loads, indexes); the **service → controller** shape is
> unchanged; new list/summary shapes are **zod schemas in [`shared`](../packages/shared/src/)**
> (mirroring the existing `SessionSummary`/`WorkflowSummary`/`DeckSummary` split). Web + CLI update
> in **lockstep** with the shared contract (a summary DTO + pagination changes `GET /tasks`).
> Migrations are **forward-only** (new indexes only — no data change). The refetch/cache theme
> **coordinates with Phase 56's per-event-type cache strategy** — build on it, don't fork a second
> cache layer. Every optimization is **behavior-preserving** (same data, fewer queries / smaller
> payloads / windowed render) and **proven by the harness** (Theme A), not asserted. Batch loads
> keep the pool's single-tick discipline (no new query in the hot tick path without a measured win).

> Effort tags: **S** small · **M** medium · **L** large. **A** (harness) ships **first** — it's the
> measurement backbone every other theme reports against. **B** (N+1) is the biggest single win;
> **C** (DTOs + pagination) + **D** (indexes) are the backend scale story; **E** (cache) + **F**
> (virtualization) are the frontend snappiness story. A → B/C/D (backend) ∥ E/F (frontend).

---

## Current state (efficient ✅ and cliffs ❌)

- **List endpoints** — ❌ **no pagination** on `GET /tasks`, `/sessions`, `/workflows`, `/projects`,
  `/repos`, `/memories` (all return every row). ✅ **ideas paginate** (20/page — the template) and
  **workflows/slides/sessions return lean summaries** already.
- ❌ **Task-hydration N+1** — [`tasks.repository.ts`](../packages/gateway/src/tasks/tasks.repository.ts)
  `hydrate(row)` = **6 queries/task** (prStatus, dependsOn, checkRunStatus, events, attachments, links).
  `listTasks()` ([`tasks.service.ts`](../packages/gateway/src/tasks/tasks.service.ts)) hydrates all rows;
  callers that pay it needlessly: [`sessions.service.ts`](../packages/gateway/src/sessions/sessions.service.ts)
  `list()` (calls `listTasks()`), [`agent-pool.service.ts`](../packages/gateway/src/pool/agent-pool.service.ts)
  `snapshot()` (**hydrates `todo` tasks to count**), search reindex.
- ❌ **Workflow `listSummaries` N+1** — [`workflows.service.ts`](../packages/gateway/src/workflows/workflows.service.ts)
  calls `latestRunRow()` per workflow.
- ✅ **Many indexes exist** ([`db/schema.ts`](../packages/gateway/src/db/schema.ts)) — `tasks(status)`,
  `(status, priority)`, `(projectId)`, `(archivedAt)`, event/link/attachment hydration indexes, workflow
  run indexes. ❌ **Missing:** `tasks(teamId)` / `(teamId, status)`, `tasks(status, projectId)`,
  `projects(teamId)`, `workflows(teamId)` — team-scoped list queries **full-scan**.
- ❌ **Payload bloat** — `GET /tasks` returns the **full hydrated `Task`** (all events/links/attachments):
  ~5–25 KB/task, **1–2.5 MB per board**. No lean list DTO (unlike sessions/workflows/decks).
- ❌ **Refetch storm** — [`query-client.ts`](../packages/web/lib/query-client.ts) `staleTime: 0` +
  [`data-refresh.ts`](../packages/web/lib/data-refresh.ts) `invalidateData()` = `invalidateQueries()`
  (**all** queries) on every WS event → full board refetch. On a busy board this dominates load.
- ❌ **No virtualization** — [`board-view.tsx`](../packages/web/components/board-view.tsx) renders **every**
  card (dnd-kit); sessions/workflows/projects lists render every row. **No `react-window`/`@tanstack/react-virtual`
  in deps.**
- ✅ **Memory mostly bounded** — terminal ring buffers capped, agent pool fixed-size, search index ~1 MB/10k
  tasks. Minor: passive token cleanup, possible subscriber-set leak on incomplete WS drain (low priority).

---

## Theme A — Seed + benchmark harness (evidence first) — **M** — ✅ DONE (PR #308, 2026-07-05)

Measure before you optimize; guard against regressions forever.

- [x] A **repeatable large-dataset seed** ([`test/seed-large.ts`](../packages/gateway/src/test/seed-large.ts)) —
      a deterministic mulberry32 PRNG (fixed seed ⇒ comparable runs), configurable size (modest default so the
      suite stays fast; `BENCH_SIZE=10000` for the full profile), realistic event/link/dep/prStatus/checkRun depth
      per task + workflows with runs.
- [x] A **gateway benchmark** ([`bench/hot-paths.spec.ts`](../packages/gateway/src/bench/hot-paths.spec.ts)):
      exact **query count** via a better-sqlite3 `verbose` hook (`createCountingDb`) + wall-time — it **prints the
      real numbers** (400 tasks → **2401 queries**, i.e. the 6N N+1; workflow summaries → N+1) and **budget-asserts
      the query count** (deterministic; wall-time printed only). Baseline budgets document today's N+1 and fail if
      it regresses; Theme B tightens them.
- [x] A **web benchmark** ([`components/board-render.bench.spec.tsx`](../packages/web/components/board-render.bench.spec.tsx)):
      renders the board with a seeded set and asserts **mounted-card count** (200/200 today — the un-virtualized
      baseline; Theme F bounds it). Both run in the normal `moon` test suite as perf budgets (no separate CI job).
      Every later theme reports its before/after here. (Sessions/snapshot/search benches ride the same harness as
      Theme B lands them.)

---

## Theme B — Kill the task-hydration N+1 — **L**

The single biggest win: stop firing 6 queries per task.

- [ ] Add `hydrateMany(rows)` to [`tasks.repository.ts`](../packages/gateway/src/tasks/tasks.repository.ts):
      **set-based batch loads** — one query per relation over the whole page (`WHERE taskId IN (…)` for events,
      links, attachments, prStatus, deps, checkRuns), grouped in memory. Keep single-row `hydrate()` for detail.
      Result: a list of N tasks = **~7 queries total**, not `6N`.
- [ ] Fix the needless callers: [`sessions.service.ts`](../packages/gateway/src/sessions/sessions.service.ts)
      `list()` derives `SessionSummary` **without** full hydration; `AgentPoolService.snapshot()` +
      status badges use **`COUNT(*)`** (cached, invalidated on mutation), never hydrate-to-count; search reindex
      batches.
- [ ] Batch the workflow `listSummaries` `latestRunRow` N+1 into one grouped query (latest run per workflow).

---

## Theme C — Lean list DTOs + pagination — **L**

Send less, in pages.

- [ ] **shared:** a `TaskSummary` DTO (board-card fields — id, title, status, priority, repo, tags, prStatus
      badge, checkRun status, dependsOn count, updatedAt) **without** full event/attachment/link history; the full
      `Task` stays the **detail** shape. Mirrors the existing Session/Workflow/Deck summary split.
- [ ] `GET /tasks` returns `TaskSummary` pages; the detail (`GET /tasks/:id`) returns the full `Task`. Board cards
      + task detail consume the right shape.
- [ ] **Cursor (keyset) pagination** on the big list endpoints (`tasks`, `sessions`, `workflows`, `projects`,
      `repos`) — a composite cursor over the existing `desc(priority), asc(createdAt)` ordering (stable under
      inserts); a shared `Paged<T>` response schema. The board/lists request pages (infinite scroll / paged UI).

---

## Theme D — DB indexes on hot paths — **S-M**

Close the full-scan gaps.

- [ ] Forward-only migration adding: `tasks(teamId)` (or composite `(teamId, status)` for the common scoped-board
      query), `tasks(status, projectId)`, `projects(teamId)`, `workflows(teamId)` — the paths `teamScopeFilter`
      hits today with no index.
- [ ] Verify each with the Theme A harness (query timing / `EXPLAIN QUERY PLAN` before vs. after) — add only
      indexes with a **measured** win; don't over-index (write cost).

---

## Theme E — Refetch / cache tuning — **M** — ✅ DONE (PR #307, 2026-07-05)

Stop reloading the whole board on every event.

- [x] **Coalesce** the blanket `invalidateData()` → `invalidateQueries()` with a **leading + trailing debounce**
      (~300ms, [`data-refresh.ts`](../packages/web/lib/data-refresh.ts)): the first event in a quiet period refetches
      immediately (single mutations stay instant), further events in the window coalesce into one trailing refetch —
      so N rapid events cost ~2 refetches, not N. **Granular per-channel / per-key invalidation is deferred to Phase
      56's per-event-type cache strategy** — `useApiData` keys every query by an opaque `useId()`, so true per-key
      invalidation needs a keying refactor that would fork Phase 56's (in-flight) cache work; this slice bounds *how
      often* the existing global invalidation fires instead.
- [x] A sensible `staleTime` (5s, [`query-client.ts`](../packages/web/lib/query-client.ts)) so rapid event bursts +
      incidental remounts coalesce instead of refetching each; WS stays the freshness signal. `refetchOnWindowFocus`
      flipped on as a safety net for events missed while backgrounded (can't storm — gated by staleTime).
- [x] Verified with a **Playwright** flow ([`refetch-coalescing.e2e.ts`](../packages/web/e2e/refetch-coalescing.e2e.ts))
      against the real gateway + WS: **8** concurrent task events produce **≤3** `GET /tasks` refetches, not 8.

---

## Theme F — List virtualization — **M**

Keep the DOM bounded no matter the count.

- [ ] Add `@tanstack/react-virtual` (headless, composes with the existing TanStack stack + dnd-kit) and **windowed
      rendering** for the board columns in [`board-view.tsx`](../packages/web/components/board-view.tsx) — only
      visible cards mount; drag-and-drop still works across a virtualized column.
- [ ] Virtualize the other long lists: sessions, workflows, projects, **workflow run history**, the **approval
      log**. Bounded DOM = smooth scroll + flat memory regardless of row count.
- [ ] Verify with the web benchmark: mounted-node count stays ~constant as the seeded dataset grows.

---

## Files this phase touches (map)

- **New (repo tooling):** a seed script + a benchmark harness (query-count hook + web render metrics) under
  `gateway/src/test/` / a `bench/` area; CI perf-budget wiring
- **Edit (gateway):** [`tasks.repository.ts`](../packages/gateway/src/tasks/tasks.repository.ts) (`hydrateMany`
  batch loads + `COUNT(*)` helpers); [`tasks.service.ts`](../packages/gateway/src/tasks/tasks.service.ts) +
  [`tasks.controller.ts`](../packages/gateway/src/tasks/tasks.controller.ts) (summary + paged list);
  [`sessions.service.ts`](../packages/gateway/src/sessions/sessions.service.ts) (no full hydration);
  [`agent-pool.service.ts`](../packages/gateway/src/pool/agent-pool.service.ts) (count, don't hydrate);
  [`workflows.service.ts`](../packages/gateway/src/workflows/workflows.service.ts) (batch latest-run);
  new indexes in [`db/schema.ts`](../packages/gateway/src/db/schema.ts) + a forward-only [`drizzle/`](../packages/gateway/drizzle/) migration
- **New/edit (shared):** `TaskSummary` + `Paged<T>` + cursor schemas in [`shared/src/`](../packages/shared/src/);
  client methods in [`web/lib/api.ts`](../packages/web/lib/api.ts) + [`cli/src/client.ts`](../packages/cli/src/client.ts)
- **Edit (web):** [`board-view.tsx`](../packages/web/components/board-view.tsx) (virtualization + paged/summary
  consumption); the sessions/workflows/projects lists; [`query-client.ts`](../packages/web/lib/query-client.ts) +
  [`data-refresh.ts`](../packages/web/lib/data-refresh.ts) (granular invalidation + staleTime); new
  `@tanstack/react-virtual` dep
- **Reuse:** the existing summary-DTO pattern, the ideas pagination precedent, Phase 56's per-event-type cache
  strategy, `teamScopeFilter` — behavior-preserving.

---

## Verification

- [ ] **Harness proves it:** on the 10k-task seed, the benchmark reports a **measured** drop — `GET /tasks` goes
      from **~6N queries to a small constant** — and CI **fails** if query count / payload size / render count
      regress past budget.
- [ ] **N+1 gone:** a paged `GET /tasks` issues ~a-handful of queries regardless of page size; the sessions list no
      longer full-hydrates; `snapshot()`/badge counts use `COUNT(*)` (no hydrate-to-count); workflow summaries batch
      the latest run.
- [ ] **Pagination:** the board + big lists load a **page** (cursor-based), fetch more on scroll, and stay correct
      under concurrent inserts (no dupes/skips at page boundaries); the CLI/web clients consume the paged contract.
- [ ] **Lean payload:** `GET /tasks` returns `TaskSummary` (no full event history) — board payload drops from MBs to
      a fraction; the task **detail** view still gets the full `Task`.
- [ ] **Indexes:** the team-scoped board query + `(status, projectId)` filter use an index (`EXPLAIN QUERY PLAN`),
      not a full scan; write throughput isn't materially hurt.
- [ ] **No refetch storm:** a burst of task events triggers **granular** cache updates, not a full board refetch per
      event (verified on the web benchmark); live freshness is preserved (coordinated with Phase 56).
- [ ] **Virtualized:** the board + long lists mount a **bounded** number of DOM nodes at 10k rows; scroll stays
      smooth; **drag-and-drop still works** across a virtualized column.
- [ ] **Behavior-preserving:** the board, sessions, workflows, and cockpits show the **same data** as before — just
      faster/lighter; small datasets behave identically.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green + the perf-budget benchmark (gateway query
      counts, web render metrics); **web tests/benchmarks run from the primary checkout, not a `.git` worktree**.

---

## Decisions / open questions

1. **Evidence first — seed + benchmark harness leads** *(settled).* Theme A ships before the fixes so every claim
   is a measured before/after, and CI perf budgets stop regressions from creeping back.
2. **Batch hydration (`hydrateMany`), keep `hydrate` for detail** *(recommend).* Set-based `IN (…)` loads grouped in
   memory turn `6N` into ~7 queries — the single biggest win. Single-task detail keeps the simple path.
3. **Lean `TaskSummary` for lists, full `Task` for detail** *(recommend).* Mirrors the existing
   Session/Workflow/Deck summary split; the board never needs full event history. This changes the `GET /tasks`
   contract — web + CLI update in lockstep via `shared`.
4. **Keyset cursor pagination** *(recommend).* A composite cursor over `desc(priority), asc(createdAt)` is stable
   under inserts (no offset drift). *(Alt: offset/limit like the ideas endpoint — simpler, but skips/dupes under
   concurrent inserts on a busy board.)*
5. **Coordinate cache tuning with Phase 56, don't fork it** *(settled).* Phase 56's per-event-type strategy is the
   vehicle for granular invalidation; this phase tunes `staleTime` + measures the refetch reduction. If 56 lands
   first, 57 builds on it; if concurrent, coordinate the one cache layer.
6. **`@tanstack/react-virtual` for virtualization** *(recommend).* Headless, composes with dnd-kit + the existing
   TanStack stack; the board keeps working DnD across windowed columns. *(Alt: `react-window`.)*
7. **Count without hydrating** *(recommend).* `snapshot()` + badges use cached `COUNT(*)` (invalidated on mutation);
   never hydrate a list just to take its length.
8. **Out of scope** *(settled).* Sharding / moving off SQLite / read replicas, server-side board rendering, and
   offline/local-first are deferred. The minor memory items (passive token reaper, subscriber-set drain on
   incomplete WS close) are noted as low-priority follow-ups, not this phase.
