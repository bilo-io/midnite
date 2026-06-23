# Phase 28 — Project planning & structured task breakdown

> midnite can already *draft a plan* — what it can't do is turn that plan into a **properly-sequenced board**. The machinery that exists: `project.plan` (+ `planUpdatedAt`) fields, `POST /projects/:id/draft-plan` which has the plan model emit GitHub-Flavored Markdown (## sections + `- [ ]` checkboxes) via [`PROJECT_PLAN_SYSTEM_PROMPT`](../packages/gateway/src/projects/projects.prompts.ts), and `POST /projects/:id/plan/create-tasks` → [`createTasksFromPlan(projectId, titles[])`](../packages/gateway/src/projects/projects.service.ts) which creates tasks from a flat list of **titles the client scrapes out of the checkboxes**. So today's flow produces **flat, unordered tasks** — no kinds, no priorities, and crucially **no dependencies**. [Phase 27](phase-27-task-dependencies.md) just added a task dependency graph; **Phase 28 makes the breakdown structured and dependency-aware** — the plan model emits typed tasks *with blocker edges*, so describing a goal yields a board that's already sequenced into "do this, then that," for projects **and** for standalone goals.

> **Scope guardrails (CLAUDE.md).** Build **on** the existing project-plan machinery — don't rebuild `draft-plan`. The structured-breakdown step is an LLM call via the existing [`LlmService.generateStructured`](../packages/gateway/src/agent/llm/llm.service.ts) (the planner pattern), living in the **projects module** for the project-scoped path and the **tasks module** for the standalone path; both orchestrate `TasksService` (already injected into `ProjectsService`) for creation + the Phase 27 dependency API. The breakdown wire shapes live in [`@midnite/shared`](../packages/shared/src/) with zod; `cli`/`web` stay pure clients. Tasks reference each other **by id** once created (Phase 27 edges); the model references siblings by a **local ref** resolved at creation. Fail-open like the planner — if the LLM is disabled/errors, fall back to the existing flat path, never break creation. `shared` is the contract.

> Effort tags: **S** small · **M** medium · **L** large. Themes ordered **A → B → C/D**. **Depends on [Phase 27](phase-27-task-dependencies.md)** (the dependency edges) and on the existing draft-plan. Every box starts unchecked.

---

## Current state (baseline to build on)

- **project plan (built):** `project.plan` / `planUpdatedAt` ([`project.ts`](../packages/shared/src/project.ts)); `POST /projects/:id/draft-plan` → `draftPlan()` produces markdown via `RECORD_PLAN_SCHEMA` + [`PROJECT_PLAN_SYSTEM_PROMPT`](../packages/gateway/src/projects/projects.prompts.ts); `PATCH /projects/:id/plan` edits it ([`projects.controller.ts`](../packages/gateway/src/projects/projects.controller.ts)).
- **plan → tasks (built, but flat):** `POST /projects/:id/plan/create-tasks` → [`createTasksFromPlan(projectId, titles: string[])`](../packages/gateway/src/projects/projects.service.ts) — the **client** extracts checkbox lines into `titles`; the service creates a flat task per title. **No kind/priority/repo/dependency** structure.
- **planner pattern:** [`PlannerService.triage`](../packages/gateway/src/agent/planner.service.ts) shows the `LlmService.generateStructured(..., schema, 'planner')` + fail-open shape to reuse.
- **bulk create (built):** `createBulk` / `createFromPrompt` ([`tasks.service.ts`](../packages/gateway/src/tasks/tasks.service.ts), Phase 16) — per-task classify/triage + coalesced events; reusable for the per-task creation step.
- **dependencies (Phase 27, incoming):** `task_dependencies` edges + cycle-safe add + ready-gated scheduling — the thing the breakdown now populates.

---

## Theme A — Structured breakdown model (shared + gateway) — **M**

The plan model emits a structured, ordered task list — not just prose.

- [x] ✅ (PR #128) **Breakdown schema** in [`@midnite/shared`](../packages/shared/src/) (`breakdown.ts`): `BreakdownTask = { ref: string, title, kind?, priority?, dependsOn: string[] /* local refs */ }` + a `Breakdown = { tasks: BreakdownTask[] }`. `ref`/`dependsOn` use **local keys** (resolved to real task ids on creation, Theme B), so the model can express edges before ids exist. Also adds `BreakdownGoalRequestSchema` + `BreakdownPreviewResponseSchema`. zod + tests (10).
- [ ] **Breakdown LLM step** — a service method (reuse [`LlmService.generateStructured`](../packages/gateway/src/agent/llm/llm.service.ts) + a `record_breakdown` tool schema) that, given a project (name/description/sources/**existing markdown plan**) or a raw goal, returns a `Breakdown`. A new prompt **complements** `PROJECT_PLAN_SYSTEM_PROMPT` (Decision §1 — the markdown plan stays; this is the structured sibling).
- [ ] **Conservative dependency inference** (Decision §3) — the prompt instructs the model to add a `dependsOn` edge **only for clear blockers** (e.g. "build the API" before "build the client") and leave independent work unordered/parallel; over-serialization is explicitly discouraged. Validate the returned graph is acyclic (reuse Phase 27's cycle check) and prune any bad refs.

---

## Theme B — Create-with-dependencies (gateway) — **M**

Turn a `Breakdown` into a real, edge-wired board.

- [ ] **`createTasksFromBreakdown`** (projects service for the project path; tasks service for standalone) — create each `BreakdownTask` (reusing `createFromPrompt`/`createBulk` so classify/triage + coalesced events still apply, with the breakdown's `kind`/`priority`/`projectId` applied), **then wire the Phase 27 dependency edges** by resolving local `ref`s → created task ids, added in topological order. One coalesced board event for the batch.
- [ ] **Keep the flat path** — today's `createTasksFromPlan(titles[])` stays for the markdown-checkbox flow / as the LLM-disabled fallback (Decision §1 + fail-open); the structured path is additive.
- [ ] Gateway tests (`:memory:`): a breakdown with a chain creates tasks **and** the right edges (no cycles); priorities/kinds applied; a bad/cyclic ref is dropped not fatal; LLM-disabled falls back to flat tasks.

---

## Theme C — Goal → planned board flow (web) — **M**

Preview the structure before committing — conservative inference is only safe if it's editable (Decision §3).

- [ ] **Breakdown preview** — extend the project plan UI (the existing draft-plan affordance): after generating, show the **structured, dependency-ordered** tasks (title · kind · priority · "blocked by …") in a reviewable list/graph, not raw checkboxes.
- [ ] **Editable** — let the user prune tasks, fix titles/priorities, and add/remove dependency edges **before** creating; then confirm → `createTasksFromBreakdown`. The board appears already sequenced (Phase 27 chips reflect the blockers).
- [ ] Keep the **markdown plan** viewable alongside (it remains the readable artifact); the structured breakdown is the actionable one.
- [ ] Client calls in [`lib/api.ts`](../packages/web/lib/api.ts); component tests (preview renders the graph; edit removes an edge; confirm calls the breakdown create).

---

## Theme D — Standalone breakdown + CLI (gateway + cli) — **S–M**

Goal → tasks without needing a project first (Decision §2).

- [ ] **`POST /tasks/breakdown`** in the tasks module — accept a freeform goal (+ optional `projectId`/`repo`), run the breakdown step, return the proposed `Breakdown` (preview) or create directly (a `?create` / two-call flow — mirror the web preview-then-confirm). No project required.
- [ ] **`midnite plan "<goal>"`** in the CLI ([`cli/src/`](../packages/cli/src/)) — thin: call the breakdown client, render the proposed tasks + their dependencies as a table, and create on confirm (`--yes` to skip). Honors `--repo`/project flags as batch defaults.
- [ ] Tests: standalone breakdown → tasks + edges; CLI renders the dependency-ordered table; LLM-disabled returns a clear "planning unavailable" rather than a broken create.

---

## Out of scope (named, not built here)

- **Retiring the markdown plan** — `draft-plan` + the readable markdown plan stay (Decision §1); the structured breakdown is additive, not a replacement.
- **Auto-running the planned board** — Phase 28 *creates* a sequenced board; whether/when the pool runs it is the scheduler's job (Phase 27 ready-gating). No "plan and execute unattended" in one click here.
- **Non-LLM heuristic breakdown** — the breakdown is a plan-model call (fail-open to the flat path); a rules-based splitter is not built.
- **Aggressive auto-sequencing** — dependency inference stays conservative + user-editable (Decision §3); the model won't force everything into a chain.
- **Re-planning / diffing an existing board** — regenerating a breakdown and reconciling it against already-created tasks (add/remove/merge) is a future enhancement; this phase creates fresh.

---

## Files this phase touches (map)

- **shared:** new [`breakdown.ts`](../packages/shared/src/) (`BreakdownTask` / `Breakdown` + request/response) + barrel + tests; typed clients (`draftBreakdown`/`createFromBreakdown`, standalone `breakdownGoal`).
- **gateway:** breakdown LLM step + prompt complementing [`projects.prompts.ts`](../packages/gateway/src/projects/projects.prompts.ts); `createTasksFromBreakdown` in [`projects.service.ts`](../packages/gateway/src/projects/projects.service.ts) (project path) and a standalone path + `POST /tasks/breakdown` in [`tasks.service.ts`](../packages/gateway/src/tasks/tasks.service.ts)/[`tasks.controller.ts`](../packages/gateway/src/tasks/tasks.controller.ts); both wire Phase 27 dependency edges via `TasksService`; reuse [`LlmService`](../packages/gateway/src/agent/llm/llm.service.ts) + `createBulk`.
- **web:** structured breakdown **preview + edit** in the project plan UI; a goal-first breakdown entry; client calls in [`lib/api.ts`](../packages/web/lib/api.ts).
- **cli:** `midnite plan "<goal>"` in [`cli/src/`](../packages/cli/src/).
- **Docs:** update [`CLAUDE.md`](../CLAUDE.md) (planning/breakdown + structured-vs-markdown) + README; append to [`done.md`](done.md) as slices land.

---

## Verification

- [ ] From a project description, generate a breakdown → a **preview** shows typed, dependency-ordered tasks ("build client" blocked by "build API"); editing removes/adds an edge; confirm creates the board with the **Phase 27 edges** wired and the blocked chips showing.
- [ ] The created board runs in dependency order under the pool (Phase 27 ready-gating) — downstream tasks don't start until their blockers are `done`.
- [ ] The **markdown plan** still drafts and renders (no regression); the structured breakdown is a separate, additive artifact.
- [ ] `POST /tasks/breakdown` turns a **standalone goal** (no project) into tasks + edges; `midnite plan "<goal>"` previews the dependency-ordered tasks and creates on confirm.
- [ ] Dependency inference is **conservative** (independent tasks left parallel, not force-chained); a cyclic/bad ref from the model is pruned, not fatal.
- [ ] LLM disabled → breakdown falls back to the existing flat task creation (or a clear "planning unavailable"), never breaking creation.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across the graph; `moon ci` green. (Run web tests from the **primary checkout**, not a `.git` worktree.)

---

## Decisions / open questions

1. **Markdown plan vs structured breakdown** *(settled in brainstorm).* **Keep both** — the markdown plan stays the human-readable artifact; a new structured-breakdown step produces the typed, dependency-linked tasks that drive creation.
2. **Scope** *(settled in brainstorm).* **Project-scoped + standalone goal breakdown + CLI** — the goal→tasks flow works with or without a project (`POST /tasks/breakdown` + `midnite plan`).
3. **Dependency inference** *(settled in brainstorm).* **Conservative + editable preview** — infer only clear blockers, leave the rest parallel, and let the user edit the graph before creating. No aggressive auto-chaining.
4. **Local-ref scheme** *(open).* How the model references sibling tasks before ids exist — array index vs a string key per task — resolved to real ids on creation. Recommend stable string `ref`s; confirm in the A PR.
5. **Standalone breakdown home** *(recommend: tasks module).* `POST /tasks/breakdown` lives in the tasks module (it creates tasks); the projects path stays in the projects module. Both share the breakdown LLM step (a small shared service to avoid duplication).
6. **LLM-disabled fallback** *(recommend: flat path).* No LLM → fall back to the existing flat `createTasksFromPlan`/bulk path (project) or a clear "planning unavailable" (standalone). Never break task creation (planner's fail-open philosophy).
7. **Preview-then-confirm vs one-shot** *(recommend: preview).* Both web and CLI propose the breakdown first and create on confirm (CLI `--yes` to skip), so conservative inference stays transparent and correctable.
