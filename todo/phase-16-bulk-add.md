# Phase 16 — Bulk / paste add ✅

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

## Theme A — Bulk create API — **M** — ✅ DONE (PR #40, 2026-06-21)

The substrate both clients call. One endpoint, one batch, one coalesced board update.

### A1. Pure line-parsing helper in `shared` — **S** — ✅ DONE
- [x] A pure `parseBulkLines(raw: string): string[]` in [`@midnite/shared`](../packages/shared/src/bulk.ts) (`bulk.ts`): split on newlines, **trim**, drop blanks and `#`-prefixed comment lines, strip leading markdown list/checklist markers (`- `, `* `, `1. `, `- [ ] `). Deterministic + unit-tested.
- [x] `BulkCreateTaskRequestSchema` + `BulkCreateTaskResponseSchema` in `shared`: request carries the raw text **or** a `lines: string[]`, plus optional shared `repo` / `projectId` / `priority`; response is a per-line result list (`{ line, taskId?, kind?, status?, error? }`) + `{ created, skipped, failed }` counts. `MAX_BULK_LINES` exported.

### A2. `POST /tasks/bulk` — **M** — ✅ DONE
- [x] Thin controller route in [`tasks.controller.ts`](../packages/gateway/src/tasks/tasks.controller.ts): validates the batch body, delegates. Over-cap (`MAX_BULK_LINES` = 200) → 400 (Decision §3).
- [x] `TasksService.createBulk(input)`: parse → fan each line through the **existing** `createFromPrompt()` (per-task broadcast suppressed via an `emit` flag), collecting per-line success/failure. **Partial failure is first-class** (Decision §2). Bounded concurrency via a new `mapWithConcurrency` lib helper (pool of 5, Decision §6).
- [x] **Coalesced broadcast:** one `tasks.bulkCreated` event carrying the created ids added to the `TaskBoardEvent` union (+ fixture + identity test); the payload-agnostic web invalidation hook fires one refresh (Decision §1).
- [x] Gateway tests: 3-line blob → 3 tasks; blank/comment skipped (+ skipped count); a failing line → error row while the rest succeed; exactly one board event; batch-wide repo/priority; over-cap + empty-batch rejection. `:typecheck`/`:lint`/`:test` + `moon ci` green on PR #40.

> **Phase 16 complete** — Theme A (API, PR #40), Theme C (web modal, PR #42), Theme B (CLI `add --bulk`, PR #47) all landed.

---

## Theme B — CLI `add --bulk` — **S** — ✅ DONE (PR #47, 2026-06-21)

- [x] `add --bulk` in [`cli/src/index.ts`](../packages/cli/src/index.ts): reads from `--file <path>` or **stdin** (so `cat ideas.txt | midnite add --bulk` and heredocs work); passes the raw text to the bulk client. `--repo`/`--priority`/`--project` apply as batch-wide defaults (and now also to a single `add`). `--file` implies bulk input.
- [x] A `createBulk` function on the typed client [`cli/src/client.ts`](../packages/cli/src/client.ts) (+ `TaskDefaults` threaded through `createTask`).
- [x] **Result summary table** (cli-table3, per CLAUDE.md): Line → Kind → Result (status, or `error: …`). Prints a final `N created, M skipped, K failed` line; exits non-zero **only** if every attempted line failed — a partial batch is a success (pure helpers in [`cli/src/bulk.ts`](../packages/cli/src/bulk.ts), unit-tested).

---

## Theme C — Web paste-list modal — **M** — ✅ DONE (PR #42, 2026-06-21)

- [x] A bulk/paste mode in [`new-task-modal.tsx`](../packages/web/components/new-task-modal.tsx): a `Single` / `Bulk paste` toggle, a large textarea, and the shared project/priority controls applied to the whole batch. (Status hidden in bulk — per-task triage decides it. **Repo deferred:** no repo picker exists in the UI yet — Phase 13; `repo` stays an optional API field.)
- [x] **Live preview** using the shared `parseBulkLines` helper: the detected-task count ("N tasks detected"), an over-limit warning past `MAX_BULK_LINES`, and the cleaned prompts listed (markers stripped) so the user sees what will be created.
- [x] On submit, call `POST /tasks/bulk` (sends **raw** text so the gateway re-parses with the same helper); show a **result summary** (created / skipped / failed with the failing lines surfaced for fix-and-re-submit). Board updates once off the coalesced `tasks.bulkCreated` event (payload-agnostic `useTaskEvents`).
- [x] Component test (RTL, `new-task-modal.test.tsx`, 3 cases): single is default; bulk preview counts parsed lines + strips markers + hides the status control; submit sends the raw blob and renders the result summary incl. a failing line.

---

## Files this phase touches (map)

- **shared:** `parseBulkLines` helper + `BulkCreateTaskRequest`/`Response` schemas in [`task.ts`](../packages/shared/src/task.ts) (or a new `bulk.ts`); a `tasks.bulkCreated` member on the [`events/task.ts`](../packages/shared/src/events/) union (+ fixture/identity test); typed client `createBulk`. Barrels + tests.
- **gateway:** `POST /tasks/bulk` in [`tasks.controller.ts`](../packages/gateway/src/tasks/tasks.controller.ts); `createBulk()` in [`tasks.service.ts`](../packages/gateway/src/tasks/tasks.service.ts) (fans over `createFromPrompt`, coalesced emit); broadcast through the existing `TasksGateway`/`TaskEventBus`.
- **cli:** `add --bulk` (`--file`/stdin) + summary table in [`cli/src/index.ts`](../packages/cli/src/index.ts); `createBulk` in [`cli/src/client.ts`](../packages/cli/src/client.ts).
- **web:** bulk/paste mode + preview + result summary in [`new-task-modal.tsx`](../packages/web/components/new-task-modal.tsx); the `useTaskEvents` hook handles the `tasks.bulkCreated` event.
- **Docs:** README CLI/usage docs for `add --bulk`; append to [`done.md`](done.md) when it lands; tick [`outstanding.md`](outstanding.md) #2 and note it satisfies [Phase 15](phase-15-smart-intake.md) Theme A.

---

## Verification

- [x] `printf 'fix login bug\n- add dark mode\n# a comment\n\nwrite docs\n' | midnite add --bulk` → **3** tasks created (comment + blank skipped, the `- ` stripped), each classified, summary table prints, exit 0. (PR #47)
- [x] In the web modal, paste a 10-line list → the preview shows "10 tasks" → submit → 10 cards appear with **one** board update (not 10 refetches). (PR #42)
- [x] A line that fails classification (or an over-cap batch) returns a clear per-line error while the rest succeed; the failing line is shown so it can be re-submitted; the batch as a whole still reports success. — covered by `tasks.service.spec` (`returns a per-line error for a failing line while the rest succeed`); over-cap + comment-only batches reject up front.
- [x] Batch-wide `--repo` / priority / project apply to every created task. — `createBulk` threads `repo`/`priority`/`projectId` to every line; asserted in `tasks.service.spec` (`applies batch-wide repo, priority, and project to every created task`).
- [x] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across the graph; `moon ci` green. (Run web tests from the **primary checkout**, not a `.git` worktree.)

---

## Decisions / open questions

1. **Coalesced board update** *(recommend: explicit `tasks.bulkCreated` event).* A single batch event carrying the new ids → one cache invalidation, rather than N `task.created` events the client must debounce. Cleaner and self-documenting; the union already has fixtures/tests to extend.
2. **Partial-failure semantics** *(recommend: best-effort, per-line results).* Never abort the whole batch on one bad line; return a per-line result list (`taskId` or `error`). Exit/UX treats a partial batch as success. Matches the planner's fail-open philosophy.
3. **Batch-size cap** *(open).* A sane upper bound (e.g. 100–200 lines) → 400 on exceed, so a pasted document can't spawn thousands of classify calls. Pick the concrete number in the A2 PR.
4. **Parsing ambition** *(recommend: keep v1 simple).* Strip blanks/comments/markdown list markers only. Inline per-line metadata (e.g. `!urgent`, `@repo`, `#tag` prefixes), structured CSV/JSON import, and dedup-against-existing-tasks are deferred — revisit if asked.
5. **Relationship to Phase 15 Theme A** *(settled in brainstorm).* Phase 15 keeps Theme A listed; Phase 16 is the standalone build-out. Whichever lands first ticks the box — the other references it as done (don't build twice).
6. **Per-line concurrency** *(recommend: bounded pool).* Classify lines with a small concurrency cap (not fully sequential, not unbounded) so a large paste doesn't serialize slowly or hammer the LLM. Tune the pool size in the A2 PR.
