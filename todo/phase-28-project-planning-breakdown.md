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
- [x] ✅ (PR #155) **Breakdown LLM step** — `BreakdownService` in `AgentModule`: `generate(input)` calls `LlmService.generateStructured` with `BREAKDOWN_SYSTEM_PROMPT` / `STANDALONE_BREAKDOWN_SYSTEM_PROMPT` and a `record_breakdown` tool schema, parses and prunes the result, fails open to a flat task when LLM is disabled. `POST /projects/:id/plan/draft-breakdown` exposes the project path.
- [x] ✅ (PR #155) **Conservative dependency inference** (Decision §3) — both prompts instruct the model to add `dependsOn` only for clear sequential blockers, leave independent work parallel. `pruneBreakdown` strips self-refs, unknown refs, and cycle-creating edges (DFS); 6 unit tests.

---

## Theme B — Create-with-dependencies (gateway) — **M** — ✅ DONE (PR #135)

✅ **Landed 2026-06-23 (PR #135)** — see [`done.md`](done.md). `TasksService.createTasksFromBreakdown(breakdown, { projectId?, repo? })` creates a task per local `ref` with its **explicit** title/kind/priority (deterministic, no AI re-classify — the breakdown already carries them), then resolves refs → ids and wires the Phase 27 edges, **pruning** self/unknown/cycle (via `wouldCreateCycle`), one coalesced `tasks.bulkCreated`. `ProjectsService` delegates; exposed via `POST /projects/:id/plan/create-from-breakdown`; the flat `createTasksFromPlan` path is untouched. **Notes for follow-ups:** the create step is intentionally LLM-free (the doc's "reuse createFromPrompt classify/triage" was dropped since the breakdown is already typed; the "LLM-disabled → flat" fallback belongs to Theme A's generation step, not this create mechanism). The core lives in `TasksService` so the standalone path (Theme D `POST /tasks/breakdown`) can reuse it.

---

## Theme C — Goal → planned board flow (web) — **M** — ✅ DONE (PR #160)

Preview the structure before committing — conservative inference is only safe if it's editable (Decision §3).

- [x] ✅ (PR #160) **Breakdown preview** — `PlanPanel` gained a **Checklist | Breakdown** tab toggle; the Breakdown tab generates a structured, dependency-ordered preview (`POST /plan/draft-breakdown`) rendered as an editable list (title · kind · priority · "blocked by …" chips), not raw checkboxes.
- [x] ✅ (PR #160) **Editable** — new `BreakdownEditor`: inline title/kind/priority edits, removable blocker chips + add-blocker picker, prune (strips the task from siblings' `dependsOn`); confirm → `createTasksFromBreakdown` so the board appears already sequenced (Phase 27 chips). Cycles/self/unknown pruned by the gateway on create.
- [x] ✅ (PR #160) **Markdown plan** stays viewable alongside under the Checklist tab (unchanged); LLM-disabled fallback shows a notice and still allows edit/create.
- [x] ✅ (PR #160) Client calls `draftProjectBreakdown` / `createTasksFromBreakdown` in [`lib/api.ts`](../packages/web/lib/api.ts); unit tests (editor edit/prune/edge-removal, panel generate→confirm + fallback) + a live-gateway Playwright e2e.

---

## Theme D — Standalone breakdown + CLI (gateway + cli) — **S–M** — ✅ DONE (PR #155)

- [x] ✅ **`POST /tasks/breakdown`** — accepts `BreakdownGoalRequest`, calls `BreakdownService.generate`, returns `BreakdownPreviewResponse`.
- [x] ✅ **`POST /tasks/breakdown/create`** — accepts `CreateFromBreakdownRequest`, calls `TasksService.createTasksFromBreakdown`, returns the dependency-wired tasks.
- [x] ✅ **`midnite plan "<goal>"`** — calls `/tasks/breakdown`, renders the proposed tasks as a table, prompts for confirmation (`--yes` to skip), creates on confirm with optional `--repo` batch default.
- [x] ✅ `draftBreakdown` / `createFromBreakdown` added to `GatewayClient` + `createClient` in CLI.

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

- [x] From a project description, generate a breakdown → a **preview** shows typed, dependency-ordered tasks ("build client" blocked by "build API"); editing removes/adds an edge; confirm creates the board with the **Phase 27 edges** wired and the blocked chips showing. *(covered by `PlanPanel` + `BreakdownEditor` unit tests + Playwright e2e, PR #160)*
- [x] The created board runs in dependency order under the pool (Phase 27 ready-gating) — downstream tasks don't start until their blockers are `done`. *(Phase 27 integration specs + ready-gated scheduler, PR #109)*
- [x] The **markdown plan** still drafts and renders (no regression); the structured breakdown is a separate, additive artifact. *(existing plan tests unchanged; breakdown is additive path, PR #155 #160)*
- [x] `POST /tasks/breakdown` turns a **standalone goal** (no project) into tasks + edges; `midnite plan "<goal>"` previews the dependency-ordered tasks and creates on confirm. *(gateway + CLI covered by specs, PR #155)*
- [x] Dependency inference is **conservative** (independent tasks left parallel, not force-chained); a cyclic/bad ref from the model is pruned, not fatal. *(`pruneBreakdown` DFS prune + 6 unit tests, PR #155)*
- [x] LLM disabled → breakdown falls back to the existing flat task creation (or a clear "planning unavailable"), never breaking creation. *(fail-open path in `BreakdownService.generate`, PR #155; UI notice in `PlanPanel`, PR #160)*
- [x] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across the graph. *(verified 2026-06-24: 906 gateway + 505 web tests pass; typecheck clean across shared/gateway/cli/web)*

---

## Decisions / open questions

1. **Markdown plan vs structured breakdown** *(settled in brainstorm).* **Keep both** — the markdown plan stays the human-readable artifact; a new structured-breakdown step produces the typed, dependency-linked tasks that drive creation.
2. **Scope** *(settled in brainstorm).* **Project-scoped + standalone goal breakdown + CLI** — the goal→tasks flow works with or without a project (`POST /tasks/breakdown` + `midnite plan`).
3. **Dependency inference** *(settled in brainstorm).* **Conservative + editable preview** — infer only clear blockers, leave the rest parallel, and let the user edit the graph before creating. No aggressive auto-chaining.
4. **Local-ref scheme** *(open).* How the model references sibling tasks before ids exist — array index vs a string key per task — resolved to real ids on creation. Recommend stable string `ref`s; confirm in the A PR.
5. **Standalone breakdown home** *(recommend: tasks module).* `POST /tasks/breakdown` lives in the tasks module (it creates tasks); the projects path stays in the projects module. Both share the breakdown LLM step (a small shared service to avoid duplication).
6. **LLM-disabled fallback** *(recommend: flat path).* No LLM → fall back to the existing flat `createTasksFromPlan`/bulk path (project) or a clear "planning unavailable" (standalone). Never break task creation (planner's fail-open philosophy).
7. **Preview-then-confirm vs one-shot** *(recommend: preview).* Both web and CLI propose the breakdown first and create on confirm (CLI `--yes` to skip), so conservative inference stays transparent and correctable.
