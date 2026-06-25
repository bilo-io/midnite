# Phase 15 — Smart intake & inference

> Phase 4 ([phase-4-inference.md](phase-4-inference.md)) shipped the **plan/act model split** and per-task classification, but it's the **largest remaining gap vs. the original plan** (~33%). Task creation today is **one item at a time**, the planner only decides *ready vs. backlog* ([`planner.service.ts`](../packages/gateway/src/agent/planner.service.ts) `triage → { ready }`), URLs on a task are stored as reference links but **never fetched**, `kind: question` items still land as actionable cards, and the file-based knowledge watcher the original plan describes **doesn't exist** (there's no `config.knowledge` block). **Phase 15 makes intake smart:** paste a list and get many tasks, drop a GitHub link and the agent gets its context, ask a question and get an answer, and point midnite at a folder of notes it weaves into execution prompts. Closes [`outstanding.md`](outstanding.md) **#2, #3, #6, #7**.

> **Scope guardrails (CLAUDE.md).** Business logic stays in gateway **services**, not controllers or the CLI. New wire shapes (bulk request/response, answer payloads, knowledge config) live in [`@midnite/shared`](../packages/shared/src/) with zod schemas; `cli` and `web` stay pure HTTP clients. Safe outbound fetching **reuses the existing SSRF guard** [`lib/allowed-origin.ts`](../packages/gateway/src/lib/allowed-origin.ts) — do **not** add a second fetch path. URL-kind detection **reuses** [`shared/src/source.ts`](../packages/shared/src/source.ts) (already knows GitHub/Figma/Notion/…); we add *fetching*, not new detection. Reading config goes through `loadConfig()` only.

> **Out of scope (named, not started here):** embeddings / vector RAG (the knowledge watcher is manifest + content-injection, keyword-selected by the plan model — no vector store); non-GitHub context providers (Jira/Linear/etc.); auto-attaching images/screenshots scraped from URLs.

> Effort tags: **S** small · **M** medium · **L** large. Themes are independent slices — pick one (see "Recommended slice"), don't do all at once. Every box starts unchecked.

---

## Current state (baseline to build on)

- **Classifier** ([`classifier.service.ts`](../packages/gateway/src/agent/classifier.service.ts)) returns `{ title, kind }`; `TaskKind ∈ bug | feature | question | chore | unknown` ([`task.ts`](../packages/shared/src/task.ts)). `question` is **detected but produces a normal task** — no answer.
- **Planner** ([`planner.service.ts`](../packages/gateway/src/agent/planner.service.ts)) is only `triage(prompt) → { ready }` (todo vs backlog), and **defaults to ready** on any LLM error so creation never breaks. It never sees URLs, repos, or knowledge files.
- **Sources** ([`source.ts`](../packages/shared/src/source.ts)) detects URL kind (github/figma/notion/youtube/…) and sources are injected into the agent prompt as **reference links** (via [`pool/agent-pool.service.ts`](../packages/gateway/src/pool/agent-pool.service.ts)) — **content is never fetched**.
- **SSRF-guarded fetch** exists as [`lib/allowed-origin.ts`](../packages/gateway/src/lib/allowed-origin.ts) (blocks private/loopback ranges) — the model for any new outbound fetch.
- **Task creation** ([`tasks.service.ts`](../packages/gateway/src/tasks/tasks.service.ts)) runs classify → triage on a **single** `prompt`; `CreateTaskRequestSchema` takes one prompt. **No bulk path.**
- **No `config.knowledge`** in [`config.ts`](../packages/shared/src/config.ts); `chokidar` is not a gateway dep. The only "knowledge base" today is the source-link list.

---

## Theme A — Bulk / paste add — **S–M** — ✅ DONE (satisfied by Phase 16, PR #40)

Accept a freeform multi-line list in one shot, one task per line.

> Promoted to its own focused phase and shipped end-to-end as **[Phase 16 — Bulk / paste add](phase-16-bulk-add.md)** (✅ PR #40). Per Phase 16 Decision §5, "whichever lands first satisfies it" — so this theme is complete. The boxes below map to the shipped surfaces.

- [x] **`POST /tasks/bulk`** — `createBulk` in [`tasks.controller.ts`](../packages/gateway/src/tasks/tasks.controller.ts) → `TasksService.createBulk`, fanning each line through the existing classify → triage pipeline. `BulkCreateTaskRequestSchema`/`BulkCreateTaskResponseSchema` + the pure `parseBulkLines` helper live in [`shared`](../packages/shared/src/bulk.ts) (Decision §1).
- [x] Coalesced board WS signal — one `tasks.bulkCreated` event (carries the new ids) in [`shared/src/events/task.ts`](../packages/shared/src/events/task.ts), reduced by `task-board-reducer.ts`; the board updates once, not N times.
- [x] **CLI `add --bulk`** — [`cli/src/bulk.ts`](../packages/cli/src/bulk.ts) (stdin/`--file`, per-line summary), unit-tested in `bulk.test.ts`.
- [x] **Web "paste list" modal** — bulk mode in [`new-task-modal.tsx`](../packages/web/components/new-task-modal.tsx) (`onBulkCreated` → coalesced refresh in `tasks-view.tsx`).

---

## Theme B — URL + GitHub-context inference — **M** — ✅ DONE (PR #67, 2026-06-21)

Links in a task's prompt are fetched and folded into the agent's seed prompt as a "Linked context" block. See [done.md](done.md).

- [x] Detect URLs in the prompt at agent-run start (pure `extractUrls` in `agent/lib/url-context.ts`); shared `parseGithubIssueOrPr` gives GitHub issue/PR links special handling, other URLs are fetched as generic pages.
- [x] **GitHub context** — `gh api repos/{repo}/issues/{n}` (user auth → private repos) for issue/PR title+body+state, with an anonymous `api.github.com` REST fallback when `gh` is absent. (Decision §2.)
- [x] **General URL context** — fetched through the **real** outbound SSRF guard (`isSafeHttpUrl` in [`projects/lib/opengraph.ts`](../packages/gateway/src/projects/lib/opengraph.ts), private/loopback blocked) — *not* `allowed-origin.ts` (that's the inbound CORS gate). Reduced to readable text/title; a second fetch path was avoided by reusing `readCapped`/`parseHtmlMetadata`.
- [x] **Inject, truncated** — appended at the agent-run seed-prompt point ([`pool/agent-runner.service.ts`](../packages/gateway/src/pool/agent-runner.service.ts) `start()` — sources aren't injected in `agent-pool.service.ts` as the doc assumed), byte-capped (5 URLs · 4k chars/source · 12k total). Fail-open per-URL and overall — never blocks a run.

---

## Theme C — Inline answers for question-type items — **M** — ✅ DONE (PRs #55 + #83, 2026-06-22 — see [done.md](done.md))

When classification yields `kind: question`, answer it directly instead of landing an actionable task.

- [x] An **answer-generation step** in the agent module (plan model) invoked when the classifier returns `question`; produces a concise answer. *(PR #55: `PlannerService.answer`, called from `tasks.service` for question-kind tasks.)*
- [x] **Surface in the task thread, not the board** (Decision §3 — resolved as **`done` + an `answer` event**, not a new status): the answer is written as an `answer` `task_events` entry and the task resolves to `done`, so questions don't clog the working columns. *(PR #55.)*
- [x] Web: the task thread renders the answer (markdown) *(PR #55)*; a clear **"Answered" affordance** (badge on the card + thread header, single-sourced via `isAnsweredQuestion`/`ANSWER_EVENT_KIND` in `shared`) plus an **"Answered" filter toggle** so the item is findable apart from ordinary completed work *(PR #83)*.
- [x] Fail-open: if answer generation fails or the LLM is disabled, the item lands as a normal task (never silently dropped). *(PR #55.)*

---

## Theme D — Knowledge-files watcher + MD injection — **M** — ✅ DONE (PR #95, 2026-06-22 — see [done.md](done.md))

The original plan's "watched folder of MD files." Index a knowledge directory, let the plan model pick relevant files, inject their **content** into the execution prompt.

- [x] **New `config.knowledge` block** in [`config.ts`](../packages/shared/src/config.ts): `{ enabled, dir?, maxBytes }` (defaulted; documented in the README). Read only via `loadConfig()`.
- [x] A gateway **knowledge service** (`KnowledgeWatcherService`) that watches `config.knowledge.dir` with **`chokidar`** v3 (CJS — matches the gateway build), maintaining an in-memory **manifest** (filename + headings) that updates on add/change/unlink. No DB — the files on disk are the source of truth.
- [x] **Plan-model file selection** — `KnowledgeService` passes the manifest to the plan model; it returns relevant filenames (validated against the manifest, path-guarded); the content is injected into the seed prompt (capped to `maxBytes`), between URL context and repo conventions. Best-effort + fail-open.
- [x] **Naming** (Decision §4): surfaced as **"Knowledge files"** — distinct from the link-based **"Sources"** — in the README.
- [x] Embeddings/RAG deferred entirely — keyword/heading manifest + model selection is the v1.

**This closes Phase 15 (all themes A–D shipped).**

---

## Recommended slice

1. **A** (bulk add) — cheapest, pure composition over the existing classify→triage path; immediate daily-use win.
2. **B** (URL/GitHub context) — highest enrichment value; reuses the SSRF guard + source detection.
3. **C** (inline answers) — small surface, depends on the thread/event plumbing already in place.
4. **D** (knowledge watcher) — most net-new infra (config + chokidar + manifest); do last.

Each is independently shippable; B and D both feed the execution prompt, so coordinate the injection point in [`pool/agent-pool.service.ts`](../packages/gateway/src/pool/agent-pool.service.ts).

---

## Files this phase touches (map)

- **shared:** [`task.ts`](../packages/shared/src/task.ts) (`BulkCreateTaskRequestSchema` + bulk result; an `answered` resolution if modelled as state); new `knowledge.ts` config + a knowledge-file/manifest schema; reuse [`source.ts`](../packages/shared/src/source.ts); typed client functions for bulk + (if any) knowledge endpoints. Barrels + tests.
- **gateway:** `POST /tasks/bulk` in [`tasks.controller.ts`](../packages/gateway/src/tasks/tasks.controller.ts)/[`tasks.service.ts`](../packages/gateway/src/tasks/tasks.service.ts); URL/GitHub context fetching in/around [`classifier.service.ts`](../packages/gateway/src/agent/classifier.service.ts) / [`planner.service.ts`](../packages/gateway/src/agent/planner.service.ts) reusing [`lib/allowed-origin.ts`](../packages/gateway/src/lib/allowed-origin.ts); an answer-generation path in the agent module; a new knowledge service (chokidar) + prompt injection in [`pool/agent-pool.service.ts`](../packages/gateway/src/pool/agent-pool.service.ts); `chokidar` added to gateway deps.
- **cli:** `add --bulk` (stdin/`--file`) in [`cli/src/`](../packages/cli/src/).
- **web:** a "paste list" bulk-add modal; the task thread renders inline answers + an answered affordance.
- **Docs:** update [`CLAUDE.md`](../CLAUDE.md) (intake pipeline, knowledge files vs sources) + README config docs (`config.knowledge`); append to [`done.md`](done.md) as slices land; tick the matching rows in [`outstanding.md`](outstanding.md).

---

## Verification

- [x] Paste a 5-line list into the web modal (or `midnite add --bulk` from a file) → 5 tasks created, each classified, with a single coalesced board update; invalid/blank lines skipped. *(Theme A / Phase 16 PR #40 — `POST /tasks/bulk`, `tasks.bulkCreated` WS event, web paste modal, CLI `add --bulk`.)*
- [x] Create a task referencing a **public** GitHub issue URL → the agent's execution prompt contains the issue title/body (truncated); with `gh` authed, a **private** repo issue also resolves; a blocked/loopback URL is never fetched. *(Theme B PR #67 — `url-context.service.ts`, `api.github.com` REST fallback, SSRF guard via `isSafeHttpUrl`.)*
- [x] Submit a `question`-kind item → a direct answer appears in the task **thread** and the item is marked **answered** (not sitting in a working column); LLM-disabled falls back to a normal task. *(Theme C PRs #55+#83 — `PlannerService.answer()`, answer event on thread, `done` status, Answered filter badge.)*
- [x] Point `config.knowledge.dir` at a folder of MD, create a related task → the plan model selects relevant files and their content (≤ `maxBytes`) appears in the execution prompt; editing a file updates the manifest without a restart. *(Theme D PR #95 — `KnowledgeWatcherService`, chokidar v3, plan-model file selection, prompt injection.)*
- [x] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across the graph; `moon ci` green. *(Confirmed 2026-06-25: 510 web + 1006 gateway tests pass; web:build passes after fixing 3 stale unused-import lint errors.)*

---

## Decisions / open questions

1. **Bulk endpoint vs client loop** *(recommend: real endpoint).* `POST /tasks/bulk` so classification can batch and the WS broadcast emits once, rather than N client-side `POST /tasks` calls. *Settled.*
2. **GitHub/URL auth** *(settled in brainstorm: gh-first).* Shell out to `gh api` when present (existing auth, private repos); fall back to anonymous `api.github.com` REST for public; general URLs via the SSRF guard. Body **truncated** to a byte cap.
3. **Answered-question placement** *(recommend: thread, not board).* A `question` resolves into the task **thread** (a `task_events` entry) + an `answered` resolution, so it doesn't occupy a working column. Confirm whether `answered` is a new status or a `kind`-driven terminal view.
4. **Knowledge-base naming** *(recommend: "Knowledge files").* Name the file-watched KB **"Knowledge files"** to disambiguate from the existing link-based **"Sources."** Both can inject into the prompt; keep their copy/affordances distinct.
5. **Knowledge selection mechanism** *(recommend: manifest → model picks filenames).* Pass the plan model a manifest (filename + headings); it returns relevant filenames; inject their content capped to `maxBytes`. **No embeddings/RAG** this phase.
6. **Injected-context budget** *(open).* The single byte cap that covers sources + fetched URL context + knowledge files so the execution prompt can't blow the model's context window. Pick concrete numbers in the implementing PRs.
