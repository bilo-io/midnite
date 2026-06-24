# Phase 27 — Task dependencies & dependency-aware scheduling

> midnite's agent pool runs tasks **independently** — there's no way to say "task B can't start until task A ships." The scheduler already does the *other* half of smart sequencing well: **priority is wired** (`task.priority` 0 Low · 1 Normal · 2 High · 3 Urgent, [`task.ts:61`](../packages/shared/src/task.ts); a `tasks_status_priority_idx`; `listTasks('todo')` orders `desc(priority), asc(createdAt)`, [`tasks.repository.ts:137`](../packages/gateway/src/tasks/tasks.repository.ts); the tick picks the highest-priority oldest unassigned todo, [`agent-pool-scheduler.service.ts:55`](../packages/gateway/src/pool/agent-pool-scheduler.service.ts)). What's **entirely missing is dependencies**: no blocker relation exists anywhere, so a multi-step project ("scaffold the API, *then* build the client, *then* write the docs") can only be run by babysitting the order by hand. **Phase 27 adds task dependencies** — a blocker graph, a scheduler that only starts *ready* tasks (all blockers `done`), and the UI/CLI to express and see it — turning a flat priority queue into real DAG-ordered execution.

> **Scope guardrails (CLAUDE.md).** Dependencies are a new **tasks-module** concern: the edge store is a normalized table queried only in [`tasks.repository.ts`](../packages/gateway/src/tasks/tasks.repository.ts), business rules (cycle rejection, ready-computation) live in [`tasks.service.ts`](../packages/gateway/src/tasks/tasks.service.ts), the controller stays thin. The dependency wire shapes live in [`@midnite/shared`](../packages/shared/src/) with zod; `cli`/`web` stay pure clients. **No new task status** (Decision §2) — "blocked" is *derived* (computed from blocker states), so the existing `backlog · todo · wip · waiting · done · abandoned` state machine and all its consumers are untouched. Forward-only migration; a task references another **by id** (intra-domain, fine — no cross-domain FK). `shared` is the contract.

> Effort tags: **S** small · **M** medium · **L** large. Themes ordered **A → B → C/D** (model gates the scheduler gates the surfaces). Every box starts unchecked — this is net-new work.

---

## Current state (baseline to build on)

- **priority (already done — do not rebuild):** `task.priority` (0–3, default 1) on the schema ([`db/schema.ts:21`](../packages/gateway/src/db/schema.ts)) + `tasks_status_priority_idx`; `listTasks(status)` returns `desc(priority), asc(createdAt)`; the scheduler `tick()` fills free slots with the highest-priority oldest unassigned `todo` ([`agent-pool-scheduler.service.ts`](../packages/gateway/src/pool/agent-pool-scheduler.service.ts)).
- **no dependency concept:** nothing in [`task.ts`](../packages/shared/src/task.ts), [`db/schema.ts`](../packages/gateway/src/db/schema.ts), or the scheduler models blockers. Tasks are independent.
- **existing relational tables (the pattern to mirror):** `task_events`, `task_links`, `task_attachments` — each a normalized child table keyed by `task_id`, queried in [`tasks.repository.ts`](../packages/gateway/src/tasks/tasks.repository.ts). A `task_dependencies` edge table fits this exactly (Decision §1).
- **cycle-rejection precedent:** the workflow engine already rejects cycles in its DAG run ([`workflow-engine.service.ts`](../packages/gateway/src/workflows/engine/workflow-engine.service.ts)) — reuse that approach for dependency-cycle detection rather than inventing one.
- **manual start path:** `POST /tasks/:id/start` ([`pool.controller.ts`](../packages/gateway/src/pool/pool.controller.ts)) lets a human start a `todo`/`backlog` task directly, bypassing the scheduler — must be made dependency-aware (Decision §4).

---

## Theme A — Dependency model (shared + gateway) — **M** ✅ (PR #106)

The blocker graph and its integrity rules.

### A1. `task_dependencies` table + repository — **S–M**
- [x] A normalized edge table `task_dependencies` (`task_id`, `depends_on_task_id`, `created_at`; unique on the pair) — forward-only migration; indexed both directions so "my blockers" and "who depends on me" are both cheap. Mirrors `task_links`/`task_events`.
- [x] Repository methods (Drizzle only): `addDependency`, `removeDependency`, `dependenciesOf(taskId)`, `dependentsOf(taskId)`, and a **ready-set** query (`todo` tasks whose every blocker is `done`) to back the scheduler (Theme B).

### A2. Shared schema + create/update — **S**
- [x] Extend [`task.ts`](../packages/shared/src/task.ts): a `dependsOn: string[]` on the read shape (derived from edges) and on `CreateTaskRequest`/an update request; a typed `TaskDependencyError`. zod + tests; typed client functions. *(`dependsOn` is `.optional()` to match `links`/`attachments`; web/cli client calls deferred to Themes C/D when consumed.)*

### A3. Integrity: cycles, self-refs, existence — **M**
- [x] In [`tasks.service.ts`](../packages/gateway/src/tasks/tasks.service.ts): adding a dependency **rejects** a self-reference, a non-existent task, and any edge that would create a **cycle** (DFS over the existing edges — reuse the [`workflow-engine`](../packages/gateway/src/workflows/engine/workflow-engine.service.ts) cycle-check approach). Errors map to 400/409 at the controller.
- [x] Deleting a task cleans up its edges (both as blocker and dependent); document what happens to a task whose blocker is deleted (becomes unblocked).

---

## Theme B — Dependency-aware scheduling (gateway) — **M** — ✅ DONE (PR #109)

Make the tick respect the graph, keeping the existing priority+age ordering. **Landed — see [done.md](done.md).**

- [x] **Ready-gating:** the scheduler selects from **ready** `todo` tasks only — a task is *ready* iff every `dependsOn` blocker is in a terminal **`done`** state. The `listTasks('todo').find(...)` selection now reads the repository's ready-set query via `TasksService.listReadyTodoTasks()` (→ `TasksRepository.listReadyTodoTasks()`), preserving `desc(priority), asc(createdAt)` among ready tasks.
- [x] **Unblock-on-complete:** when a blocker reaches `done`, its dependents become eligible on the **next tick** automatically (the tick re-evaluates readiness — no new event needed). The service also re-emits `task.updated` for the blocker's dependents (`notifyDependents`) so the board's "blocked by N" chip refreshes promptly.
- [x] **Abandoned-blocker policy** (Decision §3/§4 — **hold + surface**): a blocker that ends `abandoned` (not `done`) is `!= 'done'`, so the ready-set query keeps its dependents **out** of scheduling (held, never silently run). Dependents are re-broadcast on the abandon transition so a derived "blocked by an abandoned task" state can surface; the explicit "drop the dead edge" action is the existing `removeDependency` (Theme A). The richer warning UI is Theme C.
- [x] Tests (`:memory:`): a 3-task chain runs in order; raising a mid-chain task's priority doesn't let it jump its blocker; completing a blocker releases its dependent next tick (and emits its `task.updated`); an abandoned blocker holds its dependent. (Scheduler unit + pool integration specs.)

---

## Theme C — Dependencies in the UI (web) — **M** — ✅ DONE (PR #114)

Express and see the graph; "blocked" is derived, not a new status (Decision §2).

- [x] **Set/edit blockers** — a `TaskPicker` combobox in the new-task modal ([`new-task-modal.tsx`](../packages/web/components/new-task-modal.tsx), single mode) and the task thread's new **Dependencies** section: choose blocker task(s); the service's cycle / self-reference / unknown-task errors surface inline (`depError`).
- [x] **Derived "blocked" affordance** — a **"Blocked by N"** chip ([`blocked-badge.tsx`](../packages/web/components/blocked-badge.tsx)) on cards (board + abandoned) and rows (list/table), visually dimmed; the task stays in its column. Count is the unmet-blocker count from pure helpers ([`task-dependencies.ts`](../packages/web/lib/task-dependencies.ts)) computed over the *full* list (a filtered-out blocker still counts), mirroring the scheduler's `done`-only rule.
- [x] **Blocker list in the thread** — each blocker shown with its status (done/pending) + remove; a read-only **"Blocks"** list of dependents (`dependentsOf`).
- [x] **Manual start respects deps** (Decision §4): starting a blocked task from the board (drag/Start) **and** the thread Start **warns + requires confirmation** (human override allowed); the scheduler auto-skips. Doesn't silently run a blocked task.

---

## Theme D — CLI + coverage — **S** — ✅ DONE (PR #113)

**Landed — see [done.md](done.md). With Theme C (PR #114), Phase 27 is COMPLETE (A–D).**

- [x] **`midnite add --depends-on <id>`** (repeatable) in the CLI ([`cli/src/index.ts`](../packages/cli/src/index.ts)) — thin: parse → typed client (repeatable multipart `dependsOn` fields). Rejected alongside `--bulk` (a blocker graph is per-task, not a batch default). Unknown/cyclic ids error clearly — the create path now maps `TaskDependencyError` → 4xx (was a 500). Also **`midnite block <id> --on <blockerId>`** / **`unblock <id> --on <blockerId>`** — thin POST/DELETE to `/tasks/:id/dependencies`.
- [x] **End-to-end tests** covering: cycle rejection (400/409 — controller dependency-route tests + new create→400), ready-computation + edge cleanup on delete ([`tasks.dependencies.spec.ts`](../packages/gateway/src/tasks/tasks.dependencies.spec.ts)), scheduler skips blocked + runs in dependency order + blocker-done unblocks + abandoned-blocker holds (Phase 27 B [`agent-pool.integration.spec.ts`](../packages/gateway/src/pool/agent-pool.integration.spec.ts)). Theme D adds the CLI client tests (repeatable `dependsOn`, add/remove endpoints, 409 cycle message surfaced).

---

## Out of scope (named, not built here)

- **Per-repo concurrency caps** (outstanding [`#8`](outstanding.md)) — same scheduler, different axis (fairness, not ordering). Now unblocked by Phase 13 repos but kept **separate** to keep this phase focused on dependencies.
- **A new `blocked` status** — "blocked" stays *derived*; no state-machine change (Decision §2).
- **Auto-inferring dependencies** — the plan/intake model guessing "this task depends on that one" is a future intake enhancement; Phase 27 is explicit, user-set edges.
- **Cross-project / cross-repo dependency semantics** beyond a plain task-id reference — an edge is just `task_id → depends_on_task_id`; richer project-level sequencing is later.
- **Full DAG visualization** — a blocker/dependent **list** in the thread is in; a rendered graph canvas is a nice-to-have, not required this phase.
- **Start-after-time / scheduled-start** (a different kind of "dependency" — on a clock, not a task) — that's the templates/recurring direction, not here.

---

## Files this phase touches (map)

- **shared:** [`task.ts`](../packages/shared/src/task.ts) — `dependsOn` on the task + create/update requests, `TaskDependencyError`; barrel + tests; typed client `addDependency`/`removeDependency` (or fold into create/update).
- **gateway:** `task_dependencies` table in [`db/schema.ts`](../packages/gateway/src/db/schema.ts) + forward-only migration; dependency methods + ready-set query in [`tasks.repository.ts`](../packages/gateway/src/tasks/tasks.repository.ts); cycle/integrity rules + ready-computation in [`tasks.service.ts`](../packages/gateway/src/tasks/tasks.service.ts); dependency routes on [`tasks.controller.ts`](../packages/gateway/src/tasks/tasks.controller.ts); ready-gated selection in [`agent-pool-scheduler.service.ts`](../packages/gateway/src/pool/agent-pool-scheduler.service.ts); dependency-aware manual start in [`pool.controller.ts`](../packages/gateway/src/pool/pool.controller.ts).
- **web:** dependency picker in [`new-task-modal.tsx`](../packages/web/components/new-task-modal.tsx) + the task thread; a "blocked by N" chip on cards; blocker/dependent list in the thread; client calls in [`lib/api.ts`](../packages/web/lib/api.ts).
- **cli:** `add --depends-on` (+ optional `task block`) in [`cli/src/`](../packages/cli/src/).
- **Docs:** update [`CLAUDE.md`](../CLAUDE.md) (dependencies + ready-gated scheduling; note priority was already wired) + README; append to [`done.md`](done.md) as slices land.

---

## Verification

- [x] Create A → B → C with B depending on A and C on B; with the pool enabled, they run **in order** — B doesn't start until A is `done`, C not until B is `done`. *(covered by `agent-pool.integration.spec.ts` 3-task chain test, PR #109)*
- [x] Raising C's priority to Urgent does **not** let it jump ahead of its unmet blockers; among **ready** tasks, priority+age ordering still holds. *(covered by scheduler unit spec, PR #109)*
- [x] Completing a blocker releases its dependent on the next tick (no manual nudge); the board's "blocked by N" chip clears. *(covered by `notifyDependents` + `task.updated` re-broadcast on `done`, PR #109)*
- [x] Adding a dependency that forms a **cycle** (or a self-dependency, or a non-existent task) is rejected with a clear error; deleting a task cleans up its edges and unblocks anything that depended on it. *(covered by `tasks.dependencies.spec.ts`, PR #106)*
- [x] An **abandoned** blocker holds its dependent (per the chosen policy) and surfaces the situation rather than silently stalling. *(hold + warn policy, PR #109)*
- [x] Starting a blocked task **manually** from the board warns + requires confirmation; the scheduler never auto-starts a blocked task. *(web warning modal + `manual-start` confirmation, PR #113)*
- [x] `midnite add --depends-on <id>` sets the edge; an unknown/cyclic id errors clearly. *(CLI `--depends-on` + `block`/`unblock` subcommands, PR #114)*
- [x] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across the graph. *(verified 2026-06-24: 906 gateway + 505 web tests pass; typecheck clean across shared/gateway/cli/web)*

---

## Decisions / open questions

1. **Dependency storage** *(settled in brainstorm).* A normalized **`task_dependencies` join table** (edges, indexed both directions) — clean blocker/dependent queries + cycle detection, mirroring `task_links`/`task_events`.
2. **Blocked representation** *(settled in brainstorm).* **Derived "ready" flag, no new status** — a task stays in its column; readiness is computed and surfaced as a chip; the scheduler skips unready tasks. Avoids state-machine churn.
3. **Scope** *(settled in brainstorm).* **Dependencies only** — per-repo concurrency caps (outstanding #8) stay a separate scheduler follow-on.
4. **Abandoned-blocker policy** *(open).* A blocker ending `abandoned` (not `done`) should **hold** its dependents and surface a clear "blocked by an abandoned task" with an action to drop the edge — vs. treating `abandoned` as satisfying the dependency. Recommend **hold + warn**; confirm in the B PR.
5. **Manual start vs deps** *(open).* The scheduler auto-skips blocked tasks; a **human** starting one from the board should be **warned + allowed to override** (manual intent is explicit), not hard-blocked. Confirm in the C/B PR.
6. **Satisfied-by set** *(recommend: `done` only).* A blocker satisfies a dependency only when `done`; `wip`/`waiting`/`backlog` don't. Keep it strict and predictable.
7. **Ready-set query efficiency** *(open).* Compute the ready set in SQL (a `NOT EXISTS` over unmet blockers) rather than per-task in app code, so the tick stays cheap at scale. Confirm the query shape in the A1/B PR.
