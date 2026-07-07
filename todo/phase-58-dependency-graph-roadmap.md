# Phase 58 — Dependency Graph & Milestone Roadmap (make the plan visible)

> midnite already *models* how work fits together — Phase 27 stores task blockers as a normalized
> edge graph, derives each task's `dependsOn`, and the scheduler runs a readiness query so a blocked
> task waits its turn. But that structure is **invisible**: the only surfacing is a "blocked by N"
> badge and a text list on the task detail. You can't *see* the shape — the critical path, what's
> gating what, where the fleet should focus. And there's no notion of a **plan** in the product: a
> project has freeform `plan` markdown, but no milestones, no progress rollup, no roadmap. Phase 58
> makes the plan visible with two complementary read-only views: a **dependency DAG** (what blocks
> what) and a **milestone roadmap** (a project's plan and how far along) — both rendered with the
> **same React Flow library the workflow editor already uses**. The dependency half is mostly
> *reuse*; the roadmap half is a small, net-new data model.

> **Scope guardrails (CLAUDE.md).** Reuse over reinvention: the graph renderer is
> **`@xyflow/react` v12** (already a dep, powering [`workflow-canvas.tsx`](../packages/web/components/workflow-canvas.tsx))
> in **read-only** mode; the dependency model is **entirely reused** — the `task_dependencies` edge
> table, `dependsOn[]`, `dependentsOf`/`dependenciesOf`, the `wouldCreateCycle` DFS, and the
> `listReadyTodoTasks` ready-set in [`tasks.service.ts`](../packages/gateway/src/tasks/tasks.service.ts).
> New wire shapes (graph nodes/edges, milestone) are **zod schemas in
> [`shared`](../packages/shared/src/)**. Readiness is **computed server-side** from the existing
> logic (the graph can't drift from what the scheduler sees). The new **milestone** concept is
> deliberately **not** called "phase" (that word means the `todo/` planning docs); milestones are
> **project-scoped**, follow **controller → service → repository**, are **team-scoped**
> ([`teamScopeFilter`](../packages/gateway/src/db/team-scope.ts)), and progress is **computed, not
> stored** (mirroring how "blocked" and sessions are derived). The DAG is **read-only** — dependency
> edits stay in the task detail (which already has the cycle-check UX). Web stays **static export**
> (query-string routes). Forward-only migrations.

> Effort tags: **S** small · **M** medium · **L** large. **A** (graph API) + **B** (DAG view) are the
> dependency-graph half (reuse-heavy); **C** (project progress) is the cheap overlay; **D**
> (milestone model) + **E** (roadmap view) are the net-new roadmap half; **F** wires entry points.
> A→B→C (graph) ∥ D→E (roadmap); F last.

---

## Current state (reuse ✅ and gaps ❌)

- ✅ **Graph renderer exists** — [`workflow-canvas.tsx`](../packages/web/components/workflow-canvas.tsx) uses
  **`@xyflow/react` v12.3** (`ReactFlow`, `Background`, `Controls`, `MiniMap`); read-write with **manual node
  positions** persisted in the workflow graph JSON. **No dagre/elk auto-layout.** React Flow supports read-only
  natively.
- ✅ **Dependency model is solid** — `task_dependencies` (`taskId`→`dependsOnTaskId`, composite PK + reverse
  index) in [`db/schema.ts`](../packages/gateway/src/db/schema.ts); `task.dependsOn[]`
  ([`shared/src/task.ts`](../packages/shared/src/task.ts)); repo helpers `dependenciesOf`/`dependentsOf`; service
  `addDependency`/`removeDependency`/`wouldCreateCycle` (DFS) + `listReadyTodoTasks(now)` ready-set.
- ❌ **No bulk graph endpoint** — deps are exposed only per-task (`POST`/`DELETE /tasks/:id/dependencies`); no
  `{nodes, edges}` graph. (And Phase 57 makes the board fetch lean summaries, so **client-side assembly from the
  full task list stops being reliable** — a dedicated endpoint is the scale-safe choice.)
- ✅ **Existing dep UI to build on** — [`blocked-badge.tsx`](../packages/web/components/blocked-badge.tsx) +
  the "Blocked by / Blocks" lists in [`task-detail.tsx`](../packages/web/components/task-detail.tsx) +
  [`lib/task-dependencies.ts`](../packages/web/lib/task-dependencies.ts) (`unmetBlockerCount`, `dependentsOf`).
  ❌ **No DAG/graph view anywhere** except the workflow editor.
- ❌ **No roadmap/milestone data in-app** — projects have only `plan` (freeform markdown) + `phaseDocSync`
  (write-back to repo markdown). Phases live in `todo/` files **outside** the gateway. There's a
  [`breakdown.ts`](../packages/shared/src/breakdown.ts) LLM decomposition (`BreakdownTask` with `dependsOn`) +
  `POST /projects/:id/tasks/breakdown/create`, but it's **ephemeral** — no stored roadmap.

---

## Theme A — Graph API (server-authoritative) — **M** — ✅ DONE (PR #318, 2026-07-06)

Expose the dependency graph as data, computed from the source of truth.

- [x] **shared:** `TaskGraphSchema` — `{ nodes: [{ id, title, status, priority, ready, unmetBlockerCount,
      projectId?, milestoneId?, foreign? }], edges: [{ from, to }] }` + `{ truncated, totalCount }`, `TASK_GRAPH_NODE_CAP`. Zod, re-exported.
- [x] **gateway:** `GET /tasks/graph` (optional `?projectId=`) — thin controller → `TasksService.buildGraph` (over
      batch `tasksByIds`/`dependencyEdges`, no N+1), computing **ready/unmetBlockerCount with the scheduler's
      definition** (`ready` = a `todo` task whose every blocker is `done`; false for non-todo). Team-scoped. A
      cross-project blocker under `?projectId=` is pulled in as a flagged `foreign` node.
- [x] Client method `getTaskGraph(projectId?)` in [`web/lib/api.ts`](../packages/web/lib/api.ts); bounded at 500
      nodes → `truncated` + `totalCount` (no silent truncation).

---

## Theme B — Dependency DAG view (React Flow + dagre) — **L** — ✅ DONE (PR #324, 2026-07-06)

The missing shape: see what blocks what.

- [x] **web:** reuse **`@xyflow/react` read-only** (nodes non-draggable, no connect handles; keep pan/zoom + minimap
      + controls) and add an **auto-layout pass** via **`dagre`** (`@dagrejs/dagre`) computing **left-to-right** x/y
      from the edge set — the one net-new piece (the workflow editor persists manual positions; the DAG has none).
      ([`task-graph-layout.ts`](../packages/web/lib/task-graph-layout.ts))
- [x] A **custom node** ([`task-graph-node.tsx`](../packages/web/components/task-graph/task-graph-node.tsx)): status
      color (todo/wip/waiting/done, blocked derived), title, ready/blocked + priority chips; edges styled to surface
      **unmet blockers** (dashed + animated while the blocker isn't `done`). Click a node → opens the shared `?task=`
      modal **in place** (stays on the graph, per Phase 42).
- [x] A new **static-export** view (`/tasks/graph` query-string route, client-only like the cockpits) with a
      **project-scope picker**; empty/loading/large-graph (truncated banner → narrow by project) states; live over
      the Phase 56 reliable task channel; responsive (pan/zoom everywhere, minimap hidden on mobile).

---

## Theme C — Project progress overlay — **S-M** — ✅ DONE (PR #320, #327, 2026-07-06)

A roadmap-ish read without any new data.

- [x] Filter/group the DAG by **project** (the `?projectId` graph) and show **per-project completion %** (done /
      total tasks) — reuses projects + tasks, **no new model**. A project picker on the graph view. *(PR #324 shipped
      the picker as part of Theme B; PR #327 added the per-project completion bar to the graph toolbar via the shared
      `ProjectProgressBar` — server-computed `taskStatusCounts`, hidden for "All projects".)*
- [x] Surface the same per-project progress where projects already appear (list + the Phase 55 project detail) — a
      cheap "how far along" without waiting on the milestone model. *(PR #320: server-computed `taskStatusCounts` +
      `projectCompletion` + a `ProjectProgressBar` on project cards, the detail stats panel, and dashboard widgets.)*

---

## Theme D — Milestone data model — **M** — ✅ DONE (PR #322, 2026-07-06)

A real, minimal plan structure in the product.

- [x] **shared:** `MilestoneSchema` (`id`, `projectId`, `name`, `description?`, `position`, `targetDate?`, timestamps,
      `createdBy?`, `teamId?`) + create/update/reorder requests + an assignment shape. **Named "milestone," not
      "phase"** (avoid the `todo/` overload).
- [x] **gateway:** `roadmap_milestones` table (forward-only migration `0071`) + a nullable `task.milestoneId` column;
      `MilestonesRepository` (team-scoped) → `MilestonesService` (CRUD, reorder by full ordered id list, assign/unassign a
      task with strict same-project validation, delete-unassigns tasks) → `MilestonesController`
      (`GET`/`POST`/`PATCH`/`DELETE /projects/:id/milestones` + `POST …/reorder` + `PATCH /tasks/:id/milestone`).
      **Progress is computed** (done/total per milestone), never stored. Writes gated to `member+`; milestones FTS-indexed;
      `milestoneId` surfaced on the task DTO + dependency-graph nodes.
- [x] A milestone graph/rollup endpoint (`GET /projects/:id/roadmap` → milestones ordered + per-milestone task
      counts/completion + the tasks as lean `TaskSummary` projections + an unassigned backlog) feeding Theme E.

---

## Theme E — Roadmap view + milestone assignment — **L** — ✅ DONE (PR #326, 2026-07-06)

The plan, as lanes with progress.

- [x] **web:** a **roadmap lane view** ([`roadmap-board.tsx`](../packages/web/components/roadmap/roadmap-board.tsx) +
      [`roadmap-lane.tsx`](../packages/web/components/roadmap/roadmap-lane.tsx)) — milestones as ordered horizontal
      columns, each with a **progress bar** (done/total, reusing Theme C's `ProjectProgressBar`) + its tasks, plus a
      fixed **backlog** lane. Reuses the board's card + `@dnd-kit` patterns.
- [x] **Assign a task to a milestone** — from the task detail (a milestone picker,
      [`task-milestone-picker.tsx`](../packages/web/components/task-milestone-picker.tsx)) and by **dragging** a task
      into a lane; reorder milestones by dragging the lane header grip. Optimistic with rollback. Inline milestone
      CRUD (add / rename / delete). Live over the Phase 56 reliable task channel.
- [x] Lives on the **static-export** project cockpit as a deep-linkable `?tab=roadmap` tab (Phase 55); empty state
      ("no milestones yet — add one to group this project's tasks into a plan").

---

## Theme F — Entry points + breakdown tie-in — **S-M** — ✅ DONE (PR #338, 2026-07-07)

Make both views reachable, and seed roadmaps from what agents already produce.

- [x] Entry points: a **Graph** affordance from the board (PR #324) and a **Roadmap** section on the Phase 55 project
      detail page — shipped as the `?tab=roadmap` tab (PR #326).
- [x] **Breakdown tie-in:** a "Generate tasks…" lane action drafts a dependency-aware breakdown from a goal
      (`POST /tasks/breakdown`), curates it in the shared `BreakdownEditor`, then creates the tasks project-linked +
      **assigned to the milestone** (`create-from-breakdown` gains an optional `milestoneId`, validated same-project via
      a repo-level lookup — no milestones-module cycle). ([`milestone-breakdown-modal.tsx`](../packages/web/components/roadmap/milestone-breakdown-modal.tsx))
- [x] Cross-link: a task's milestone shows on its **card** (a `milestoneName` joined onto `TaskSummary`) + **detail**
      (the picker); a milestone links into the **DAG filtered to its tasks** (`GET /tasks/graph?milestoneId=`, a
      clearable filter chip on the graph toolbar).

---

## Files this phase touches (map)

- **New/edit (shared):** `TaskGraph` + `Milestone` (+ create/update/reorder/assign) + `RoadmapView` schemas in
  [`shared/src/`](../packages/shared/src/); `task.milestoneId` on [`task.ts`](../packages/shared/src/task.ts); client
  methods in [`web/lib/api.ts`](../packages/web/lib/api.ts) + [`cli/src/client.ts`](../packages/cli/src/client.ts)
- **New (gateway):** `roadmap_milestones` table + `task.milestoneId` column in
  [`db/schema.ts`](../packages/gateway/src/db/schema.ts) + a forward-only [`drizzle/`](../packages/gateway/drizzle/)
  migration; `milestones/` module (`milestones.controller.ts`/`service.ts`/`repository.ts`); a `TaskGraphService`
  (or a method on tasks) for `GET /tasks/graph`
- **Edit (gateway):** [`tasks.controller.ts`](../packages/gateway/src/tasks/tasks.controller.ts) (`/tasks/graph`,
  `PATCH /tasks/:id/milestone`); register the milestones module in [`app.module.ts`](../packages/gateway/src/app.module.ts)
- **New (web):** a dependency-DAG view (`components/task-graph/` — React Flow wrapper + dagre layout + custom node) and
  a roadmap view (`components/roadmap/` — lanes + progress + assignment); the `@dagrejs/dagre` dep
- **Edit (web):** [`task-detail.tsx`](../packages/web/components/task-detail.tsx) (milestone picker); the project
  detail (Phase 55) roadmap section; board entry point; [`next.config.mjs`](../packages/web/next.config.mjs)
  `transpilePackages` if dagre needs it
- **Reuse:** `@xyflow/react` (read-only), the deps model + `wouldCreateCycle` + `listReadyTodoTasks`, the breakdown
  endpoint, the board card/dnd patterns — no changes to their contracts.

---

## Verification

- [x] `GET /tasks/graph` returns nodes + edges with **ready/blocked computed server-side** (a node's ready state
      matches `listReadyTodoTasks`); `?projectId` scopes it; a huge graph is capped + flagged, never silently truncated.
- [x] The **dependency DAG** renders (React Flow read-only + **dagre auto-layout**), nodes colored by status with
      ready/blocked/priority chips, edges showing blockers; clicking a node deep-links to the task; pan/zoom + minimap
      work; the workflow editor is **unaffected** (shared lib, separate view).
- [x] **Project progress** shows per-project completion % on the graph view + project surfaces — no new data model.
- [x] **Milestones:** a milestone can be created/renamed/reordered/deleted under a project (team-scoped, RBAC where
      writes apply); a task can be assigned to exactly one milestone from the task detail and by **dragging** on the
      roadmap; **progress is computed** (done/total), correct as tasks complete.
- [x] The **roadmap view** shows milestones as ordered lanes with progress bars + their tasks + an unassigned backlog;
      it's deep-linkable; empty state offers "add milestone / generate from breakdown".
- [x] **Breakdown tie-in:** generating from a goal seeds a milestone's tasks (reusing the breakdown endpoint) and
      assigns them; the DAG for that milestone shows the seeded dependency edges.
- [x] Dependency **editing still happens in the task detail** (with cycle-check); the DAG is read-only (no edge
      dragging) and reflects edits after they're made.
- [x] `moon run :typecheck` · `moon run :lint` · `moon run :test` green (shared graph/milestone schema units; gateway
      graph-build + milestone CRUD/assign + computed-progress tests; web RTL/story for the DAG (dagre layout, node
      click) + the roadmap (assignment, progress); **web tests from the primary checkout, not a `.git` worktree**).

---

## Decisions / open questions

1. **Reuse `@xyflow/react` read-only + add `dagre` auto-layout, laid out left-to-right** *(settled; Theme B built it
   LR, not top-down).* The renderer is already in the repo (workflow editor); the only net-new frontend piece is
   auto-layout, since dependency tasks have no manual positions. **Direction is `rankdir: 'LR'`**: a task's blockers
   sit to its left, so reading left→right follows completion order and every dependency arrow points rightward (wide
   graphs and long titles read better than a top-down stack).
2. **New `GET /tasks/graph`, server-authoritative readiness** *(settled).* Compute ready/blocked from the existing
   scheduler logic so the graph can't drift; a dedicated endpoint is scale-safe under Phase 57's summary/pagination
   shift (client-side assembly from the full task list stops being reliable).
3. **"Milestones," not "phases"** *(settled).* "Phase" already means the `todo/` planning docs; the in-app concept is
   a project **milestone** to avoid overloading the word.
4. **Milestones project-scoped, single `task.milestoneId`, computed progress** *(settled).* One milestone per task
   (simpler than many-to-many); progress = done/total, computed not stored (mirrors "blocked" + sessions).
5. **Both views, one renderer** *(settled).* The DAG uses dagre auto-layout; the roadmap uses a lane layout; they
   share React Flow node styling. Complementary: DAG answers "what blocks what," roadmap answers "the plan + progress."
6. **DAG is read-only** *(settled).* Dependency edits stay in the task detail (which already has the cycle-check UX);
   edge-dragging in the graph is deferred (adds validation-UX complexity for little gain in v1).
7. **Light breakdown tie-in** *(recommend).* Reuse the existing LLM breakdown to seed a milestone's tasks — a
   nice-to-have entry point, not the core of the phase.
8. **Out of scope** *(settled).* Gantt/timeline with real date-scheduling, cross-project/portfolio roadmaps, editing
   dependencies from the graph, and persisting a manual DAG layout are all deferred.
