# Phase 60 Theme F — Data integrity & boundary-condition bugs

**Date:** 2026-07-08 · **Scope:** referential integrity (orphan refs, no FKs), pagination boundaries (Phase 57), null/empty/limits, time & ordering · **Method:** parallel static audits (referential-integrity + pagination completed; null/empty + time-ordering agents were interrupted — the highest-value items in those areas were self-checked and are covered below).

## Summary

| # | Area | Severity | Status |
|---|------|----------|--------|
| RI-1 | `deleteProject` leaves `media.projectId` dangling (stranded media) | **HIGH** | ✅ **Fixed** |
| RI-2 | `deleteProject` orphans milestones + leaves tasks a phantom `milestoneId` chip | **HIGH** | ✅ **Fixed** |
| RI-7 | `deleteWorkflow` leaks `workflow_storage` rows | LOW | ✅ **Fixed** |
| PG-2..5 | 4 offset-paginated `ORDER BY`s lack a unique `id` tiebreaker (tasks/ideas/audit/approval-log) — dup/skip at a page edge on ties | MED | ✅ **Fixed** |
| TO-1 | scheduler ready-set (`listReadyTodoTasks`) shares the tiebreaker-less ordering → nondeterministic pick on `priority`+`createdAt` ties (fairness/starvation) | MED | ✅ **Fixed** (same tiebreaker) |
| RI-3/4/8 | repo delete/rename orphans `task.repo` (by-name) → wrong cwd, skipped checks, phantom chip; dangling `phaseDocSyncRepoId` | **HIGH**/MED | 📋 Documented — cross-domain by-name cascade + design call |
| RI-5 | `setProject` accepts a non-existent projectId (no existence check) | MED | 📋 Documented — needs a tasks→projects check w/o a circular dep |
| RI-6 | `deleteProject` leaves the promoted `idea.projectId` dangling + idea stuck `promoted` | MED | 📋 Documented — needs idea status-revert semantics |
| PG-1 | notifications feed: mutable `readAt` sort key + offset + no filtered `total` | MED | ◐ tiebreaker added; keyset+total documented |
| NE / TO | null/empty/limits + remaining time/ordering | — | ◐ Partially audited — self-checked highlights below |

**Applied:** the project-delete cascade (RI-1/2, HIGH), `deleteWorkflow` storage cleanup (RI-7), and a unique `id` tiebreaker on all five offset-paginated `ORDER BY`s **plus the scheduler ready-set** (PG-2..5 + TO-1) — with real-SQLite regression tests. The remaining referential-integrity gaps need either a cross-domain by-name cascade + a cascade-vs-block product decision (repo delete/rename) or domain-status semantics (idea revert) and are documented.

---

## Referential integrity — no cross-domain FKs, so integrity is an app-layer invariant

### RI-1/2 — `deleteProject` cascade — ✅ FIXED (HIGH)

`ProjectsRepository.deleteProject` only nulled `task.projectId` + deleted `projectSources`. It left:
- **`media.projectId`** pointing at the gone project → media stranded (unreachable via the project gallery, never GC'd). **RI-1.**
- **`roadmapMilestones`** (project's milestones) undeleted, and each former task kept its **`milestoneId`** → the board renders a **phantom milestone chip** for a task with no project, and the milestone's roadmap 404s. **RI-2.**

**Fix:** the `deleteProject` transaction now also nulls `media.projectId`, nulls `task.milestoneId` alongside `projectId` (one update), and deletes the project's `roadmapMilestones`. Regression test in `projects.repository.test.ts` asserts a project + milestone + tagged task + media → after delete the project & milestone are gone and the task/media survive fully unlinked (no dangling `projectId`/`milestoneId`).

### RI-7 — `deleteWorkflow` storage leak — ✅ FIXED (LOW)

`deleteWorkflow` cascaded `workflowRuns` + `nodeRuns` but not `workflowStorage` (per-workflow KV) → leaked on delete. Fixed: added `tx.delete(workflowStorage)` to the transaction.

### RI-3/4/8 — repo delete/rename orphans `task.repo` — 📋 DOCUMENTED (HIGH/MED)

`ReposService.delete`/`update` change the registry with **no cascade** to the tasks that reference a repo **by name** (`task.repo` is a name string). `resolveRepoReference` blocks *new* dangling refs but a delete/rename creates them retroactively. Downstream: `terminal.service` cwd resolution silently falls back to the gateway cwd (**agent spawns in the wrong directory**, no error); quality-gate checks are silently skipped (`this.repos.findByName(task.repo)` → undefined); the board renders a phantom repo chip; `guardrails.pausedRepos` and `projects.phaseDocSyncRepoId` (an id) can dangle (the phase-doc sync tick then *throws* on a missing id rather than no-op'ing).
**Fix (follow-up):** on delete, either 409 when any task references the repo, or cascade-null `task.repo` (+ strip `pausedRepos`, null `phaseDocSyncRepoId`); on rename, cascade-update `task.repo` old→new (+ `pausedRepos`). Left as a follow-up — it's a cross-domain by-name cascade plus a cascade-vs-block product decision.

### RI-5 — `setProject` no existence check — 📋 DOCUMENTED (MED)

`TasksService.setProject` (via `PATCH /tasks/:id/project`) explicitly does **not** validate the projectId → a client can point a task at a gone/arbitrary project (dangling ref, wrong `workDirFor`). The clean fix (assert the project exists) needs a tasks→projects lookup, but `ProjectsService` already depends on `TasksService` — so a direct inject is circular. Left as a follow-up (validate via a `forwardRef`, in the controller, or a shared existence check) to avoid introducing a circular dependency mid-audit.

### RI-6 — `deleteProject` leaves promoted `idea.projectId` dangling — 📋 DOCUMENTED (MED)

A project promoted from an idea stamps `idea.projectId` + `status:'promoted'`. Deleting the project leaves the idea pointing at a gone project and stuck `promoted` (can't be re-promoted). Nulling `idea.projectId` is a one-liner but a *complete* fix reverts the idea's status — domain semantics I've left to a follow-up rather than half-fix.

### Verified correctly cleaned (no action)

`deleteTask` clears `task_dependencies` both directions (Phase 27/60 E); `deleteMilestone` nulls holders' `milestoneId` (Phase 58); `deleteCouncil`/`deleteIdea` cascade their children; repo/milestone **assignment** paths validate existence. (LOW nit: on blocker *deletion* the service emits `task.deleted` but doesn't re-broadcast the now-unblocked dependents' `task.updated` — the board's "blocked by N" chip is stale until the next fetch; scheduling itself is SQL-driven and correct.)

## Pagination boundaries (Phase 57) — ✅ tiebreakers FIXED

Every offset-paginated list ordered on a **non-unique** key (`createdAt`/`priority`+`createdAt`) with **no `id` tiebreaker**, so rows sharing the sort key (a same-millisecond bulk insert / seed / import) have undefined relative order → under offset paging a row can be **duplicated on page N and skipped on N+1** at the boundary.

**Fixed** — appended a unique `id` tiebreaker to: `listTaskPage` + `listTasks` (`GET /tasks`, PG-2), `ideas.findByTeam` (PG-3), `audit` (PG-4), `approval-log` (PG-5). Regression test asserts identical-`priority`+`createdAt` rows come back id-ordered and identical across fetches.

**PG-1 (notifications, MED) — partially fixed:** the tiebreaker was added, but its lead sort column `readAt` is **mutable** (marking one read mid-paging shifts the whole offset window → a still-unread row is skipped), and it returns no filtered `total`. The real fix is keyset pagination on `(createdAt, id)` + a `total` — documented as a follow-up.

**Verified correct:** all paginated endpoints **cap `limit`** (tasks 200, ideas/approvals 100, notifications/audit capped) — no unbounded-limit OOM; `total` is computed with the same `where` as `items`; empty/last-page + negative-offset handling is safe; `search`/`recentActivity`/`task-failures`/`metrics` are top-N (no offset) so have no page-edge hazard.

## Time & ordering — ◐ (self-checked highlights)

- **TO-1 (MED) — ✅ fixed:** the scheduler ready-set (`listReadyTodoTasks`) uses `desc(priority), asc(createdAt)` with no tiebreaker → under identical `priority`+`createdAt` the tick's pick is nondeterministic (a fairness/starvation risk). The `id` tiebreaker added for pagination covers this (same ordering); regression test asserts the ready-set is deterministic.
- **Verified safe:** the scheduler backoff gate `nextRetryAt <= now` compares two **UTC ISO strings** of the same format (both `new Date().toISOString()`) — lexicographic == chronological, correct. `projectCompletion` guards division by zero (`total > 0 ? … : 0`, Phase 58 C).
- **Not fully swept** (agent interrupted): timezone assumptions in recurring-task/digest cadence + metrics `DATE()` rollups, and monotonicity assumptions on `updatedAt`/event `at` — recommend a follow-up sweep.

## Null / empty / limits — ◐ (self-checked highlights)

Agent interrupted; spot-checks: `projectCompletion` div-by-zero is guarded; the pagination limits are capped. **Not fully swept:** empty workflow graph (`startRun` on 0 nodes), zero-slide deck (Phase 48), huge-diff tokenizer (Phase 52), unicode/surrogate-pair `.slice` on titles/prompts — recommend a follow-up sweep of the render/serialize paths.

---

## Applied in this PR
- **RI-1/2** project-delete cascade (media + milestones + tasks' milestoneId) + **RI-7** workflow-storage cleanup.
- **PG-2..5 + TO-1** unique `id` tiebreaker on all five offset-paginated `ORDER BY`s and the scheduler ready-set.
- Real-SQLite regression tests (project cascade; tie-break determinism incl. the ready-set).

## Follow-ups (ranked)
1. **Repo delete/rename cascade** (RI-3/4/8, HIGH — wrong-cwd is a real correctness bug) — by-name cascade + cascade-vs-409 decision.
2. **notifications keyset + `total`** (PG-1) — mutable sort key needs keyset, not offset.
3. `setProject` existence guard (RI-5, forwardRef/controller), idea status-revert on project delete (RI-6).
4. Finish the null/empty + timezone/monotonicity sweeps (agents interrupted).
