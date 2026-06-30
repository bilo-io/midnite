# Phase 45 — Recurring & scheduled tasks

> midnite's board is reactive: a human (or the intake flow) adds a task, an agent picks it up. There's no way to say *"every weekday at 09:00, open a standup task"* or *"every Monday, queue the dependency-bump chore."* The pieces to do it already exist — the **workflow engine** (Phase 6/12/14) has a `trigger.schedule` ([`ScheduleTriggerSchema`](../packages/shared/src/trigger.ts): `cron` + `timezone`), the **`WorkflowScheduler`** ([`workflow-scheduler.service.ts`](../packages/gateway/src/workflows/scheduler/workflow-scheduler.service.ts)) already fires enabled schedule-triggered workflows durably (via `croner` + a persisted `lastFiredAt`), and **`workflow_runs`** + the **`RunHistoryPanel`** already record and replay every firing. The one missing link is an **action that creates a board task** — workflows can post to Slack, call HTTP, run Claude, but not enqueue a task. **Phase 45 adds that link and a friendly facade on top:** a `task.create` workflow action, recurrence presets on the schedule trigger, and a dedicated **Schedules** view so "recurring tasks" feel first-class without anyone touching the node canvas — turning midnite from a manual board into an automation layer.

> **Architecture (settled with the requester): build on the workflow engine, do *not* add a parallel `recurring_tasks` entity.** A "recurring task" *is* a workflow = `[trigger.schedule] → [task.create]`. This reuses the scheduler, durable cron firing, run history, expression resolution, and team scoping wholesale; the only net-new backend is one executor + its node-type definition. The **Schedules** view is a thin facade that creates/lists/edits these specific workflows (and round-trips to standard workflows, so power users can still open one in the full builder).

> **Scope guardrails (CLAUDE.md).** Wire contracts (the `task.create` node params, any list filter) are **zod schemas in [`shared`](../packages/shared/src/)** — extend [`node-types.ts`](../packages/shared/src/node-types.ts), never untyped JSON. The new executor follows the existing `NodeExecutor` interface + `ExecutorRegistry` registration ([`workflows.module.ts`](../packages/gateway/src/workflows/workflows.module.ts) DI), injecting [`TasksService.createFromPrompt`](../packages/gateway/src/tasks/tasks.service.ts) — **no new task-creation path**. Scheduling stays the single `WorkflowScheduler` tick (never spawn a second scheduler). Workflows are already team-scoped + RBAC-gated (Phase 33/35); the facade inherits that. Forward-only Drizzle migrations — and this phase likely needs **none** (it rides the existing `workflows`/`workflow_runs` tables).

> Effort tags: **S** small · **M** medium · **L** large. **Theme A** (the `task.create` action) is the keystone — without it nothing else has a point; **B** (preset cron UX) and **C** (the Schedules facade) make it usable by non-workflow-power-users; **D** (run history surfacing + a standup preset) is the polish that delivers the "it just works" standup example.

---

## Current state (what exists to build on)

- **Schedule trigger** — [`shared/src/trigger.ts`](../packages/shared/src/trigger.ts): `ScheduleTriggerSchema = { type:'schedule', cron, timezone }`. A workflow stores its `trigger` (JSON) + `graph` (nodes/edges JSON) + `enabled` + `lastFiredAt` ([`db/schema.ts`](../packages/gateway/src/db/schema.ts) `workflows`).
- **Durable cron firing** — [`workflows/scheduler/workflow-scheduler.service.ts`](../packages/gateway/src/workflows/scheduler/workflow-scheduler.service.ts): ticks every `config.workflows.schedulerTickMs`, evaluates each enabled schedule workflow with `croner` against `lastFiredAt`, fires `engine.startRun(workflow, { triggerSource: 'schedule' })`, persists the slot. Restart-durable. **`croner` v9 is already a dep.**
- **Executors + registry** — [`workflows/engine/executors/*.executor.ts`](../packages/gateway/src/workflows/engine/executors/) (`http.request`, `ai.claude`, `slack.message`, `email.send`, `github.*`, `logic.*`, `data.filter`, `storage.*`). Registered via the `NODE_EXECUTORS` DI factory in [`workflows.module.ts`](../packages/gateway/src/workflows/workflows.module.ts); each is an `@Injectable()` implementing the `NodeExecutor` interface. **There is no `task.create` executor — that's the net-new piece.**
- **Node-type catalog** — [`shared/src/node-types.ts`](../packages/shared/src/node-types.ts) `NODE_TYPE_DEFINITIONS`: each action's `typeId`, param schema, and editor fields. The web `NodePalette` + `NodeConfigPanel` render from it.
- **Task creation** — [`tasks/tasks.service.ts`](../packages/gateway/src/tasks/tasks.service.ts) `createFromPrompt(input, { emit })`: prompt, repo, projectId, priority, dependsOn, images; mints UUIDv7, emits `task.created`.
- **Run history** — `workflow_runs` + `node_runs` tables; `GET /workflows/:id/runs` + `/runs/:runId`; web [`run-history-panel.tsx`](../packages/web/components/run-history-panel.tsx) replays steps. **Fully reusable as-is.**
- **Schedule-trigger UI** — [`node-config-panel.tsx`](../packages/web/components/node-config-panel.tsx) `ScheduleFields`: a raw cron input + timezone + a `describeCron()` human-readable preview. **Net-new: presets.**
- **Workflow web surfaces** — [`app/(main)/workflows/`](../packages/web/app/(main)/workflows/) (list/grid/table + the ReactFlow editor). `WorkflowSummary` ([`shared/src/workflow.ts`](../packages/shared/src/workflow.ts)) exposes `cron?` + a `steps: {type,label}[]` array — enough to client-filter "schedule-triggered workflows whose action is `task.create`" with no schema marker.

---

## Theme A — `task.create` workflow action — **M** — ✅ DONE (PR #241, 2026-06-30)

The keystone: let a workflow enqueue a board task.

- [x] **shared:** add a `task.create` entry to `NODE_TYPE_DEFINITIONS` ([`node-types.ts`](../packages/shared/src/node-types.ts)) with a zod param schema — `prompt` (expression-enabled, so `{{…}}`/date interpolation works), `repo?`, `projectId?`, `priority?` — plus the editor field metadata the config panel renders.
- [x] **gateway:** new `task-create.executor.ts` ([`workflows/engine/executors/`](../packages/gateway/src/workflows/engine/executors/)) implementing `NodeExecutor` (`typeId = 'task.create'`); `execute(ctx)` resolves params, creates the task, returns it as node output. Reaches the task store via a narrow **`TASK_CREATOR` port** ([`tasks/task-creator.ts`](../packages/gateway/src/tasks/task-creator.ts)) bound to `TasksService` by a `@Global` module that resolves it lazily via `ModuleRef` — **avoids the `Tasks ↔ Workflows` module cycle** (TasksModule already imports WorkflowsModule), so no `forwardRef`.
- [x] **gateway:** register the executor in [`workflows.module.ts`](../packages/gateway/src/workflows/workflows.module.ts) providers + the `NODE_EXECUTORS` inject list.
- [x] **Ownership:** `workflowCreatedBy` threaded into `NodeRunContext` so the created task inherits the workflow owner (team scoping derives from `createdBy`). No `dependsOn` for scheduled creation (a recurring task starts ready); `repo` validation reuses `createFromPrompt`. *(✅ DONE — PR #241, 2026-06-30)*

---

## Theme B — Recurrence presets on the schedule trigger — **S–M** — ✅ DONE (PR #243, 2026-06-30)

Make the cadence pickable without knowing cron syntax.

- [x] A **preset → cron compiler** + reverse-map, unit-tested. Lives in [`web/lib/cron.ts`](../packages/web/lib/cron.ts) (co-located with `describeCron`; only web consumes it, the gateway already has croner): `RecurrencePreset` (daily / weekdays / weekly+day / monthly+dom, each with a time) ↔ a 5-field cron via `presetToCron`/`cronToPreset`.
- [x] Extend `ScheduleFields` ([`node-config-panel.tsx`](../packages/web/components/node-config-panel.tsx)): a **Repeats** preset picker (daily/weekdays/weekly/monthly + time + day) writing the compiled cron, **plus the raw-cron field as an escape hatch**, the `describeCron()` preview, and a **"next 3 runs"** readout via `croner` (`nextRuns()`; croner added to web deps).
- [x] Round-trip safe: a cron that doesn't map to a preset shows as **Custom** with the raw field — editing presets never clobbers a hand-written expression. *(✅ DONE — PR #243, 2026-06-30)*

---

## Theme C — Dedicated "Schedules" view (facade) — **M**

Recurring tasks feel first-class, no canvas required.

- [ ] A **Schedules** sidenav entry + page ([`app/(main)/schedules/`](../packages/web/app/(main)/)) listing the workflows that are `trigger.type === 'schedule'` **and** contain a `task.create` action — filtered from `WorkflowSummary` (`cron` + `steps`), no new marker needed. Optionally add a server-side `?triggerType=schedule` filter to `GET /workflows` for cleanliness (Decision §2).
- [ ] Each row: human cadence (`describeCron`), **next run**, **last fired** + last run status, target project/repo/priority, an **enable** toggle (flips the workflow's `enabled`), and **"Run now"** (fires `engine.startRun(..., { triggerSource: 'manual' })`).
- [ ] **"New schedule"** quick-create: a focused form (label + recurrence preset + task prompt + project/repo/priority) that builds and persists the standard `[trigger.schedule] → [task.create]` workflow under the hood — so it's editable here *and* openable in the full ReactFlow builder. Editing a schedule round-trips through the same form.

---

## Theme D — Run history + the standup preset — **S**

Close the loop and ship the headline example.

- [ ] Surface the existing run history from a schedule's detail (reuse `GET /workflows/:id/runs` + [`run-history-panel.tsx`](../packages/web/components/run-history-panel.tsx)); each run links to the **task it created** (from the `task.create` node output) — so "did my standup fire and what did it open?" is one click.
- [ ] Ship a **"Daily standup" starter** as a Phase 36 workflow template (a pre-built `[schedule: weekdays 09:00] → [task.create: "Daily standup — …"]`), surfaced as a one-click **"New from preset"** in the Schedules view. (A weekly-cleanup preset is a nice-to-have second.)

---

## Files this phase touches (map)

- **New (gateway):** [`workflows/engine/executors/task-create.executor.ts`](../packages/gateway/src/workflows/engine/executors/) — the `task.create` action (Theme A)
- **New (shared):** preset→cron compiler (e.g. [`shared/src/recurrence.ts`](../packages/shared/src/)) + unit tests (Theme B)
- **New (web):** [`app/(main)/schedules/`](../packages/web/app/(main)/) — Schedules list + quick-create form + detail (Themes C/D)
- **Edit (shared):** [`node-types.ts`](../packages/shared/src/node-types.ts) — add the `task.create` definition + param schema (Theme A)
- **Edit (gateway):** [`workflows.module.ts`](../packages/gateway/src/workflows/workflows.module.ts) — register the executor in `NODE_EXECUTORS`; maybe a `?triggerType=` query on the workflows controller (Theme C)
- **Edit (web):** [`node-config-panel.tsx`](../packages/web/components/node-config-panel.tsx) — preset picker in `ScheduleFields` (Theme B); the workflows node palette picks up `task.create` automatically from `NODE_TYPE_DEFINITIONS`; add the Schedules nav item
- **Maybe (data):** a "Daily standup" entry in the workflow template seed/marketplace (Theme D)
- **No new tables** — rides `workflows` / `workflow_runs` (Decision §1). The single `WorkflowScheduler` tick is unchanged (it already fires any enabled schedule workflow, now including task-creating ones).

---

## Verification

- [ ] A workflow with a `task.create` action, run manually, creates a board task with the configured prompt/repo/project/priority and emits `task.created` (the board updates live); the node output carries the new task id.
- [ ] A schedule-triggered workflow with a `task.create` action fires on cadence (verified with a near-future cron), creating a task each firing; `lastFiredAt` advances and survives a gateway restart (no double-fire, catch-up-once for an elapsed slot — inherited from `WorkflowScheduler`).
- [ ] The schedule-trigger config offers presets (daily/weekdays/weekly/monthly + time + timezone) that compile to valid cron, keeps a raw-cron escape hatch, and shows a correct "next 3 runs" preview; a custom cron round-trips without being clobbered.
- [ ] The **Schedules** view lists exactly the schedule-triggered `task.create` workflows, with cadence, next/last run, enable toggle, and "Run now"; "New schedule" persists a standard workflow that also opens in the full builder.
- [ ] A schedule's run history is viewable and each run links to the task it created; the **Daily standup** preset creates a working weekday-09:00 schedule in one click.
- [ ] Disabling a schedule stops it firing; team scoping + RBAC match other workflows (a user only sees/manages their team's schedules).
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across the graph (executor unit test asserting it calls `createFromPrompt`; recurrence-compiler unit tests; web RTL for the Schedules view + preset picker).

---

## Decisions / open questions

1. **Workflow-backed, not a new entity** *(settled with requester).* A recurring task is a `[schedule]→[task.create]` workflow. Reuses scheduler/runs/run-history/scoping; the only net-new backend is the executor + node-type. Avoids a second scheduler and a parallel CRUD surface.
2. **Schedules filtering** *(recommend: client-filter now, optional server param).* `WorkflowSummary` already exposes `cron` + `steps`, so the facade can filter client-side with no schema change; add a `?triggerType=schedule` query to `GET /workflows` only if list size warrants server-side paging.
3. **Quick-create round-trips to a real workflow** *(recommend: yes).* The "New schedule" form builds and saves a normal 2-node workflow, so it stays editable in the canvas and reuses all workflow machinery — the facade is presentation, not a separate store.
4. **`task.create` params + expressions** *(recommend: prompt + repo + projectId + priority, expression-enabled prompt, no `dependsOn`).* A scheduled task starts ready; `{{…}}` in the prompt lets a standup say e.g. the date. Richer fields (images, dependencies) are out of scope for v1.
5. **Catch-up / missed-run policy** *(settled by reuse).* Inherits `WorkflowScheduler`'s `nextRun(since lastFiredAt)` — one fire for an elapsed slot after downtime, then resume; no flood of missed runs.
6. **Overlap guard (skip if the previous instance is still open)** *(out of scope, noted).* The workflow doesn't track the tasks it spawned, so "don't open today's standup if yesterday's is unfinished" isn't free. Deferred — a future `logic.branch` that queries open tasks could add it. v1 fires regardless.
7. **Standup preset delivery** *(recommend: a Phase 36 workflow template).* Ship "Daily standup" as a marketplace template surfaced via "New from preset" in Schedules, rather than hardcoding it — reuses the template machinery and stays editable.
