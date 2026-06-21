# Phase 16 — Bulk / paste add

> Task creation today is strictly **one item at a time**: `POST /tasks` takes a single `prompt`, and [`tasks.service.ts`](../packages/gateway/src/tasks/tasks.service.ts) `createFromPrompt()` runs classify → triage on it before persisting and emitting `task.created`. Dropping a backlog of ten ideas means ten round-trips and ten dialog submissions. **Phase 16 makes intake plural:** paste a multi-line list (or pipe a file) and get one task per line, each classified, with a single clean board update. This is [Phase 15](phase-15-smart-intake.md)'s Theme A promoted to a focused, standalone phase — built end-to-end (API → CLI → web) with the parsing and partial-failure handling a real paste flow needs. *(Phase 15 keeps Theme A listed; whichever lands first satisfies it — see Decision §5.)*

> **Scope guardrails (CLAUDE.md).** Bulk is **pure composition over the existing single-task pipeline** — the batch path fans each line through `createFromPrompt()`; it does **not** fork a parallel create path or duplicate classify/triage logic. Business logic stays in `TasksService`; the controller stays thin (validate the batch body against a zod schema in [`@midnite/shared`](../packages/shared/src/), delegate); the CLI and web stay pure clients of the typed API. Line-parsing that both the CLI and web need lives as a **pure helper in `shared`** so the two front ends split identically.

> **Out of scope:** the smarter-intake siblings (URL/GitHub context, inline answers, knowledge files) — those are [Phase 15](phase-15-smart-intake.md) Themes B/C/D. Importing structured files (CSV/JSON with columns), de-duplicating against *existing* tasks, and undo/rollback of a batch are explicitly deferred (Decision §4).

> Effort tags: **S** small · **M** medium · **L** large. Themes are ordered A → C (the API is the prerequisite for the two clients). Every box starts unchecked.

---

## Current state (baseline to build on)

- **Create flow:** `POST /tasks` → [`tasks.controller.ts`](../packages/gateway/src/tasks/tasks.controller.ts) → `TasksService.createFromPrompt(input)` ([`tasks.service.ts:226`](../packages/gateway/src/tasks/tasks.service.ts)), which classifies, triages (ready → `todo`, else `backlog`), persists, and `emit('task.created', task)` on the `TaskEventBus`. `CreateTaskRequestSchema = { prompt, repo?, projectId?, priority? }` ([`task.ts`](../packages/shared/src/task.ts)).
- **WS broadcast:** every create emits one `task.created` event (Phase 7 A6) → `TasksGateway` (`/ws/tasks`) → the web `useTaskEvents` hook invalidates the board cache. **N creates today = N events = N cache invalidations.**
- **CLI:** commander app in [`cli/src/index.ts`](../packages/cli/src/index.ts) with `add` / `list` / `move` / `serve`; the typed client is [`cli/src/client.ts`](../packages/cli/src/client.ts). `add` takes a single positional prompt.
- **Web:** the add dialog is [`new-task-modal.tsx`](../packages/web/components/new-task-modal.tsx) — a single prompt textarea + repo/project/priority. No multi-line/paste mode.

---

## Theme A — Bulk create API — **M**

The substrate both clients call. One endpoint, one batch, one coalesced board update.

### A1. Pure line-parsing helper in `shared` — **S**
- [ ] A pure `parseBulkLines(raw: string): string[]` in [`@midnite/shared`](../packages/shared/src/) (e.g. `task.ts` or a small `bulk.ts`): split on newlines, **trim**, drop blanks and `#`-prefixed comment lines, strip leading markdown list markers (`- `, `* `, `1. `, `- [ ] `) so a pasted checklist becomes clean prompts. Deterministic + unit-tested (the CLI and web both use it, so the split is identical).
- [ ] `BulkCreateTaskRequestSchema` + `BulkCreateTaskResponseSchema` in `shared`: request carries the raw text **or** a `lines: string[]`, plus optional shared `repo` / `projectId` / `priority` applied to every line; response is a per-line result list (`{ line, taskId?, kind?, status?, error? }`) + counts.

### A2. `POST /tasks/bulk` — **M**
- [ ] Thin controller route in [`tasks.controller.ts`](../packages/gateway/src/tasks/tasks.controller.ts): validate the batch body, delegate to the service. Cap the batch size (reject absurd payloads → 400, Decision §3).
- [ ] `TasksService.createBulk(input)`: parse → for each line call the **existing** `createFromPrompt()` (so classify/triage/repo/project/priority all apply uniformly), collecting per-line success/failure. **Partial failure is first-class** — one bad line doesn't abort the batch; it comes back as an error row (Decision §2). Classification across lines runs with bounded concurrency (`Promise.all` over a small pool, not strictly sequential `await`s — CLAUDE.md async rule).
- [ ] **Coalesced broadcast:** emit a single board-refresh signal for the batch rather than N independent `task.created` events that each trigger a refetch. Options: a new `tasks.bulkCreated` event carrying the created ids, **or** emit the per-task events but let the client debounce. Recommend the explicit batch event (Decision §1); add it to the `TaskBoardEvent` union in [`events/task.ts`](../packages/shared/src/events/) with a fixture + identity test.
- [ ] Gateway tests (`:memory:` SQLite): a 3-line blob creates 3 tasks with correct kinds; a blank/comment line is skipped; a line that throws in classify comes back as an error row while the rest succeed; exactly one board event is emitted.

---

## Theme B — CLI `add --bulk` — **S**

- [ ] `add --bulk` in [`cli/src/index.ts`](../packages/cli/src/index.ts): read from a `--file <path>` or **stdin** (so `cat ideas.txt | midnite add --bulk` and heredocs work); pass the raw text to the bulk client. Honor existing `--repo`/`--priority`/project flags as the batch-wide defaults.
- [ ] A `createBulk` function on the typed client [`cli/src/client.ts`](../packages/cli/src/client.ts).
- [ ] Render a **result summary table** (cli-table3, per CLAUDE.md): line → title/kind → status (or error). Print a final `N created, M skipped, K failed` line; exit non-zero only if **every** line failed (a partial batch is a success).

---

## Theme C — Web paste-list modal — **M**

- [ ] A bulk/paste mode in (or alongside) [`new-task-modal.tsx`](../packages/web/components/new-task-modal.tsx): a large textarea (placeholder "one task per line"), a toggle between single and bulk add, and the shared repo/project/priority controls applied to the whole batch.
- [ ] **Live preview** using the shared `parseBulkLines` helper: show the count of detected tasks (and the cleaned lines) before submit, so the user sees "12 tasks" not a wall of text.
- [ ] On submit, call `POST /tasks/bulk`; show a **result summary** (created / skipped / failed with the failing lines surfaced so they can be fixed and re-submitted). The board updates once off the coalesced event.
- [ ] Component test (Storybook/RTL per Phase 10 conventions): paste N lines → preview shows N → submit calls the bulk client; an error row renders the failing line.

---

## Files this phase touches (map)

- **shared:** `parseBulkLines` helper + `BulkCreateTaskRequest`/`Response` schemas in [`task.ts`](../packages/shared/src/task.ts) (or a new `bulk.ts`); a `tasks.bulkCreated` member on the [`events/task.ts`](../packages/shared/src/events/) union (+ fixture/identity test); typed client `createBulk`. Barrels + tests.
- **gateway:** `POST /tasks/bulk` in [`tasks.controller.ts`](../packages/gateway/src/tasks/tasks.controller.ts); `createBulk()` in [`tasks.service.ts`](../packages/gateway/src/tasks/tasks.service.ts) (fans over `createFromPrompt`, coalesced emit); broadcast through the existing `TasksGateway`/`TaskEventBus`.
- **cli:** `add --bulk` (`--file`/stdin) + summary table in [`cli/src/index.ts`](../packages/cli/src/index.ts); `createBulk` in [`cli/src/client.ts`](../packages/cli/src/client.ts).
- **web:** bulk/paste mode + preview + result summary in [`new-task-modal.tsx`](../packages/web/components/new-task-modal.tsx); the `useTaskEvents` hook handles the `tasks.bulkCreated` event.
- **Docs:** README CLI/usage docs for `add --bulk`; append to [`done.md`](done.md) when it lands; tick [`outstanding.md`](outstanding.md) #2 and note it satisfies [Phase 15](phase-15-smart-intake.md) Theme A.

---

## Verification

- [ ] `printf 'fix login bug\n- add dark mode\n# a comment\n\nwrite docs\n' | midnite add --bulk` → **3** tasks created (comment + blank skipped, the `- ` stripped), each classified, summary table prints, exit 0.
- [ ] In the web modal, paste a 10-line list → the preview shows "10 tasks" → submit → 10 cards appear with **one** board update (not 10 refetches).
- [ ] A line that fails classification (or an over-cap batch) returns a clear per-line error while the rest succeed; the failing line is shown so it can be re-submitted; the batch as a whole still reports success.
- [ ] Batch-wide `--repo` / priority / project apply to every created task.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across the graph; `moon ci` green. (Run web tests from the **primary checkout**, not a `.git` worktree.)

---

## Decisions / open questions

1. **Coalesced board update** *(recommend: explicit `tasks.bulkCreated` event).* A single batch event carrying the new ids → one cache invalidation, rather than N `task.created` events the client must debounce. Cleaner and self-documenting; the union already has fixtures/tests to extend.
2. **Partial-failure semantics** *(recommend: best-effort, per-line results).* Never abort the whole batch on one bad line; return a per-line result list (`taskId` or `error`). Exit/UX treats a partial batch as success. Matches the planner's fail-open philosophy.
3. **Batch-size cap** *(open).* A sane upper bound (e.g. 100–200 lines) → 400 on exceed, so a pasted document can't spawn thousands of classify calls. Pick the concrete number in the A2 PR.
4. **Parsing ambition** *(recommend: keep v1 simple).* Strip blanks/comments/markdown list markers only. Inline per-line metadata (e.g. `!urgent`, `@repo`, `#tag` prefixes), structured CSV/JSON import, and dedup-against-existing-tasks are deferred — revisit if asked.
5. **Relationship to Phase 15 Theme A** *(settled in brainstorm).* Phase 15 keeps Theme A listed; Phase 16 is the standalone build-out. Whichever lands first ticks the box — the other references it as done (don't build twice).
6. **Per-line concurrency** *(recommend: bounded pool).* Classify lines with a small concurrency cap (not fully sequential, not unbounded) so a large paste doesn't serialize slowly or hammer the LLM. Tune the pool size in the A2 PR.
