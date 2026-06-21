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

## Theme A — Bulk / paste add — **S–M**

Accept a freeform multi-line list in one shot, one task per line.

- [ ] **`POST /tasks/bulk`** in the tasks module: accept `{ lines: string[] }` (or a raw blob split server-side on newlines, trimming blanks); fan each line through the existing classify → triage pipeline in [`tasks.service.ts`](../packages/gateway/src/tasks/tasks.service.ts). Schema in [`shared/src/task.ts`](../packages/shared/src/task.ts) (`BulkCreateTaskRequestSchema` + a result summary). *(A real endpoint over a client-side loop so classification can batch and the WS broadcast emits once — Decision §1.)*
- [ ] Emit task-board WS events for the batch (one broadcast or a coalesced burst, not N independent refetches) so the board updates cleanly. Reuses the `TaskEventBus`/`TasksGateway` from Phase 7 A6.
- [ ] **CLI `add --bulk`** ([`cli/src/`](../packages/cli/src/)): read stdin or a `--file`, split lines, call the bulk client. Thin — parse → typed client call → render a per-line summary table.
- [ ] **Web "paste list" modal**: a textarea (one task per line) that calls the bulk endpoint and shows how many tasks were created + their inferred kind.

---

## Theme B — URL + GitHub-context inference — **M** — ✅ DONE (PR #67, 2026-06-21)

Links in a task's prompt are fetched and folded into the agent's seed prompt as a "Linked context" block. See [done.md](done.md).

- [x] Detect URLs in the prompt at agent-run start (pure `extractUrls` in `agent/lib/url-context.ts`); shared `parseGithubIssueOrPr` gives GitHub issue/PR links special handling, other URLs are fetched as generic pages.
- [x] **GitHub context** — `gh api repos/{repo}/issues/{n}` (user auth → private repos) for issue/PR title+body+state, with an anonymous `api.github.com` REST fallback when `gh` is absent. (Decision §2.)
- [x] **General URL context** — fetched through the **real** outbound SSRF guard (`isSafeHttpUrl` in [`projects/lib/opengraph.ts`](../packages/gateway/src/projects/lib/opengraph.ts), private/loopback blocked) — *not* `allowed-origin.ts` (that's the inbound CORS gate). Reduced to readable text/title; a second fetch path was avoided by reusing `readCapped`/`parseHtmlMetadata`.
- [x] **Inject, truncated** — appended at the agent-run seed-prompt point ([`pool/agent-runner.service.ts`](../packages/gateway/src/pool/agent-runner.service.ts) `start()` — sources aren't injected in `agent-pool.service.ts` as the doc assumed), byte-capped (5 URLs · 4k chars/source · 12k total). Fail-open per-URL and overall — never blocks a run.

---

## Theme C — Inline answers for question-type items — **M**

When classification yields `kind: question`, answer it directly instead of landing an actionable task.

- [ ] An **answer-generation step** in the agent module (plan model) invoked when the classifier returns `question`; produces a concise answer (with the URL/knowledge context from Themes B/D if present).
- [ ] **Surface in the task thread, not the board** (Decision §3): write the answer as a `task_events` entry and move the item to an **`answered`** resolution (a terminal state / status handling) so questions don't clog the active columns. Reuse the existing task-event timeline the thread modal renders.
- [ ] Web: the task thread shows the answer (markdown-rendered) with a clear "answered" affordance; the item is filterable/visible without occupying a working column.
- [ ] Fail-open: if answer generation fails or the LLM is disabled, fall back to landing the item as a normal task (never silently drop a question).

---

## Theme D — Knowledge-files watcher + MD injection — **M**

The original plan's "watched folder of MD files." Index a knowledge directory, let the plan model pick relevant files, inject their **content** into the execution prompt.

- [ ] **New `config.knowledge` block** in [`config.ts`](../packages/shared/src/config.ts): `{ dir?: string, maxBytes: number, enabled: boolean }` (defaulted; documented in the README). Read only via `loadConfig()`.
- [ ] A gateway **knowledge service** that watches `config.knowledge.dir` with **`chokidar`** (new gateway runtime dep), maintaining an in-memory **manifest** (filename + headings) that updates on add/change/unlink. No DB — the files on disk are the source of truth.
- [ ] **Plan-model file selection** — pass the manifest to the planner; it returns the filenames relevant to the task; the service reads those files and the prompt builder injects their **content**, capped to `maxBytes`.
- [ ] **Naming** (Decision §4): surface this as **"Knowledge files"** — distinct from the existing link-based **"Sources"** — in config docs and any UI copy, so the two knowledge bases aren't conflated.
- [ ] Defer embeddings/RAG entirely — keyword/heading manifest + model selection is the v1.

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

- [ ] Paste a 5-line list into the web modal (or `midnite add --bulk` from a file) → 5 tasks created, each classified, with a single coalesced board update; invalid/blank lines skipped.
- [ ] Create a task referencing a **public** GitHub issue URL → the agent's execution prompt contains the issue title/body (truncated); with `gh` authed, a **private** repo issue also resolves; a blocked/loopback URL is never fetched.
- [ ] Submit a `question`-kind item → a direct answer appears in the task **thread** and the item is marked **answered** (not sitting in a working column); LLM-disabled falls back to a normal task.
- [ ] Point `config.knowledge.dir` at a folder of MD, create a related task → the plan model selects relevant files and their content (≤ `maxBytes`) appears in the execution prompt; editing a file updates the manifest without a restart.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across the graph; `moon ci` green. (Run web tests from the **primary checkout**, not a `.git` worktree.)

---

## Decisions / open questions

1. **Bulk endpoint vs client loop** *(recommend: real endpoint).* `POST /tasks/bulk` so classification can batch and the WS broadcast emits once, rather than N client-side `POST /tasks` calls. *Settled.*
2. **GitHub/URL auth** *(settled in brainstorm: gh-first).* Shell out to `gh api` when present (existing auth, private repos); fall back to anonymous `api.github.com` REST for public; general URLs via the SSRF guard. Body **truncated** to a byte cap.
3. **Answered-question placement** *(recommend: thread, not board).* A `question` resolves into the task **thread** (a `task_events` entry) + an `answered` resolution, so it doesn't occupy a working column. Confirm whether `answered` is a new status or a `kind`-driven terminal view.
4. **Knowledge-base naming** *(recommend: "Knowledge files").* Name the file-watched KB **"Knowledge files"** to disambiguate from the existing link-based **"Sources."** Both can inject into the prompt; keep their copy/affordances distinct.
5. **Knowledge selection mechanism** *(recommend: manifest → model picks filenames).* Pass the plan model a manifest (filename + headings); it returns relevant filenames; inject their content capped to `maxBytes`. **No embeddings/RAG** this phase.
6. **Injected-context budget** *(open).* The single byte cap that covers sources + fetched URL context + knowledge files so the execution prompt can't blow the model's context window. Pick concrete numbers in the implementing PRs.
