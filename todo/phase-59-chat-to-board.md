# Phase 59 — Chat to Board (natural-language command bar)

> midnite's board is powerful but the interaction is all clicks and forms — creating a good task
> means opening a composer, and "create + classify + prioritize + set repo" is several steps.
> Phase 59 adds a **natural-language command bar**: type *"add three tasks to refactor auth, high
> priority, on the api repo"* and it happens; ask *"what's blocking the payments work?"* and it
> answers from board state. Crucially, this is **cheap by design** — a deterministic parser handles
> the unambiguous commands with **zero inference**, and the fuzzy cases prefer a **local model**
> (the gateway already supports `openai-compatible` base URLs / `opencode`), so a user needn't spend
> API credits at all. It's an **intent layer** over plumbing that already exists (classify,
> breakdown, bulk-create) — not a new way to mutate the board.

> **Scope guardrails (CLAUDE.md).** No new mutation path — chat-to-board **composes existing
> services**: [`TasksService.createFromPrompt`/`createBulk`](../packages/gateway/src/tasks/tasks.service.ts),
> [`BreakdownService`](../packages/gateway/src/agent/breakdown.service.ts),
> [`LlmClassifier`](../packages/gateway/src/agent/classifier.service.ts), task update + `addDependency`
> (all their validation — RBAC, cycle-check — is inherited). Inference reuses the **provider
> abstraction** ([`llm.service.ts`](../packages/gateway/src/agent/llm/llm.service.ts) — anthropic /
> openai / google / **openai-compatible**); **no new provider code**, and the local path is a config
> flip, not a build. The intent grammar is a **zod discriminated union in
> [`shared`](../packages/shared/src/)** — the same contract whether an intent came from the
> deterministic parser or the LLM, so the executor is source-agnostic. Mutations are **team-scoped +
> RBAC-gated** and **audited** (Phase 50). Every LLM call is usage-tracked + budget-capped (Phases
> 7/50). Web stays **static export** — the UI folds into the existing Cmd-K palette
> ([`command-palette.tsx`](../packages/web/components/command-palette.tsx)) + the composer pattern;
> **no new floating widget**.

> Effort tags: **S** small · **M** medium · **L** large. **A** (intent contract + parser) is the
> spine; **B** (execute via existing services) + **C** (query answerer) are the two halves of "do vs.
> ask"; **D** (routing policy) makes it near-free; **E** (palette UI) surfaces it; **F** (confirm/undo/
> audit) makes an NL-mutates-the-board bar safe. A→B/C → D → E → F.

---

## Current state (what exists to build on)

- ✅ **Provider abstraction, local-capable** — [`llm.service.ts`](../packages/gateway/src/agent/llm/llm.service.ts)
  `buildAdapter()` supports `anthropic` / `openai` / `google` / **`openai-compatible`** (a user-supplied
  `baseUrl` → Ollama/LM Studio/vLLM = **zero API cost**); active provider in `llm_settings`, keys/baseUrl in
  `llm_providers`. `generateStructured()` is the structured-output entry the classifier/breakdown already use.
- ✅ **Agent CLIs incl. local** — `AGENT_CLIS = ['claude','gemini','codex','opencode','aider']`
  ([`shared/src/agents.ts`](../packages/shared/src/agents.ts)); `opencode`→`openai-compatible`, `aider` CLI-only.
  (Gateway doesn't *delegate* chat requests to a spawned CLI today — out of scope, Decision §5.)
- ✅ **NL→tasks plumbing (reuse targets):** `createFromPrompt` (classify + triage + repo-guess + inline-answer),
  `createBulk` (`POST /tasks/bulk`), [`BreakdownService`](../packages/gateway/src/agent/breakdown.service.ts)
  (goal → dependency-wired tasks, `POST /tasks/breakdown`), [`LlmClassifier`](../packages/gateway/src/agent/classifier.service.ts)
  (prompt → `{title, kind}`). All fail-soft when the LLM is off.
- ✅ **Command palette** — [`command-palette.tsx`](../packages/web/components/command-palette.tsx) (Cmd-K modal:
  nav, FTS5 search, extensible via `useRegisterPaletteCommands`) + the **composer-fullscreen** morphing-card input
  pattern ([`composer-fullscreen.tsx`](../packages/web/components/composer-fullscreen.tsx)). ❌ **No FAB** in the app.
- ✅ **Usage + budgets + audit** — `llm_usage` tracking (Phase 7), Phase 50 spend caps + audit log — chat-to-board
  rides these, no new metering.
- ❌ **Net-new:** an **intent router** (NL → which board op) and a **status-query answerer** (read board → summarize)
  — everything downstream already exists.

---

## Theme A — Intent contract + deterministic parser + LLM fallback — **M** — ✅ DONE (PR #321, 2026-07-06)

Turn a sentence into a typed intent — cheaply.

- [x] **shared:** a `ChatIntentSchema` **discriminated union** — `createTask`, `bulkCreate`, `breakdown`,
      `setPriority`, `setStatus`/`move`, `assign` (repo/project/milestone), `addDependency`, `query` + a first-class
      `unknown` variant — each with its typed args; a `{ intent, source, confidence }` parse envelope; plus a
      `ChatCommandResult` (summary, affected ids, undo token, inference path). Zod, re-exported.
- [x] **gateway (deterministic first):** a mini-grammar parser for unambiguous commands — verbs + a quoted title +
      flags (`p0..p3`, `repo:`, `project:`, `status:`, `@milestone`, `kind:`) in any order → a `ChatIntent` with
      **no LLM call**. Covers add / bulk-add / move / set-priority / assign / depend / breakdown / show-filter.
- [x] **gateway (LLM fallback):** when the grammar can't fully parse, `ChatIntentService` calls
      `LlmService.generateStructured()` against the same contract (flat superset schema → cleanNulls → union),
      source-agnostic; degrades to a low-confidence `unknown` when the provider is off/invalid/failing. Tagged with
      a distinct `chat` `llm_usage` feature for cost visibility.

---

## Theme B — Execute intents by composing existing services — **M** — ✅ DONE (PR #323, 2026-07-06)

Do the thing — through the paths that already validate.

- [x] A `ChatCommandService` maps each `ChatIntent` → an existing service call: `createTask`→`createFromPrompt`;
      `bulkCreate`→`createBulk`; `breakdown`→`BreakdownService.generate` + `createTasksFromBreakdown`;
      `setPriority`/`setStatus`→task update; `assign`→`setProject`/new `setRepo` (milestone deferred to 58 D
      integration); `addDependency`→`TasksService.addDependency` (inherits the cycle-check). **No new mutation path.**
      Task refs resolve id-exact → unique title match; domain errors degrade to a spoken failure result, never a 500.
- [x] Team scope + RBAC are inherited from those services; the command runs as the requesting user (`createdBy`).
      `POST /chat/command` (`member`) + `POST /chat/preview` (read-only, `viewer`).
- [x] Returns a `ChatCommandResult` — a human-readable summary + affected task ids + `inferencePath`
      (grammar→deterministic, llm→local/provider). The **undo token** is wired in Theme F; `query` answering is
      Theme C (a query intent politely defers).

---

## Theme C — Status-query answerer (read-only) — **M**

Ask the board questions.

- [ ] `query` intents that read board state: deterministic for simple filters ("show blocked", "todo count",
      "what's in wip") — reuse [`listReadyTodoTasks`](../packages/gateway/src/tasks/tasks.service.ts), the deps
      helpers, and FTS search; return a structured answer (a task list / count).
- [ ] Open-ended questions ("what should I focus on?", "what's blocking payments?") get a **cheap LLM summary**
      over the relevant slice (blocked set + priorities) — read-only, no mutation, small prompt.
- [ ] Answers link into the board (task deep-links) so a query flows into action.

---

## Theme D — Inference routing: deterministic-first, local-preferred — **S-M**

Near-zero cost by default; never a surprise bill.

- [ ] The routing policy: **(1)** try the grammar (no LLM); **(2)** if fuzzy, prefer a **configured local provider**
      (`openai-compatible` / opencode); **(3)** else the active paid provider; **(4)** else **refuse with guidance**
      ("configure a local model or an API key to use free-form chat"). Reuses `LlmService` provider selection — **no
      new provider code**.
- [ ] A config knob for the preference (`chat.preferLocal`, default true) + a distinct `feature` tag on the
      `llm_usage` record so chat spend is visible; respect Phase 50 budget caps (a capped chat call fails soft with a
      clear message).
- [ ] Surface the path used in the result ("parsed locally — no AI used" / "via local model" / "via <provider>") so
      cost is transparent.

---

## Theme E — Palette command-bar UI — **M-L**

Type what you want, where you already type.

- [ ] Fold chat-to-board into the **command palette** via `useRegisterPaletteCommands` — a "Chat with board" mode
      (or a leading `>`/natural-language line) using the **composer** input pattern; **no new FAB**. A small **chat
      icon in the nav** opens the same, for discoverability.
- [ ] **One-shot** interaction with a **light last-result context** — a follow-up like "now make those high
      priority" resolves against the previous command's affected ids (not a full conversation history).
- [ ] Render the parsed intent + result inline (created/updated tasks link into the board); live board refresh via
      the existing WS (ties to Phase 56). Static-export friendly (client-only).

---

## Theme F — Safety: preview, confirm, undo, audit — **S-M**

An NL bar that mutates the board needs a seatbelt.

- [ ] **Preview + confirm** for mutating intents: show the parsed intent ("create 3 tasks on `api`, p1") and require
      a confirm before writing — **never silently** bulk-create/delete. Read-only queries run immediately.
- [ ] **Undo** the last command (reuse task delete / status-revert via the `undo token` in `ChatCommandResult`),
      surfaced right after execution.
- [ ] **Audit** the command + its effect via the Phase 50 `AuditService` (who ran what NL command, what it changed);
      destructive intents (bulk delete) get an extra confirm. Ambiguous/low-confidence parses ask to clarify rather
      than guess.

---

## Files this phase touches (map)

- **New/edit (shared):** `ChatIntent` (discriminated union) + `ChatCommandResult` + `chat.preferLocal` config in
  [`shared/src/`](../packages/shared/src/); client method(s) in [`web/lib/api.ts`](../packages/web/lib/api.ts)
- **New (gateway):** a `chat/` module — `chat.controller.ts` (`POST /chat/command` + `POST /chat/preview`),
  `chat-command.service.ts` (route + execute), `lib/intent-grammar.ts` (deterministic parser), `chat-query.service.ts`
  (status answerer)
- **Edit (gateway):** register the module in [`app.module.ts`](../packages/gateway/src/app.module.ts); reuse
  `LlmService`, `TasksService`, `BreakdownService`, `LlmClassifier`, `AuditService` — **no changes to their contracts**
- **New (web):** a chat command-bar mode in [`command-palette.tsx`](../packages/web/components/command-palette.tsx)
  (+ `useRegisterPaletteCommands` registration) reusing the composer input; a nav chat icon
- **Reuse:** the provider abstraction (local via `openai-compatible`), `createFromPrompt`/`createBulk`/breakdown,
  `listReadyTodoTasks` + deps helpers + FTS search, usage tracking + budget caps + audit, the WS refresh (Phase 56).

---

## Verification

- [ ] **Deterministic path (no AI):** `add "fix login bug" p1 repo:api`, `move <task> to wip`, `show blocked`,
      `todo count` all execute correctly with **zero LLM calls** (the result reports "parsed locally — no AI used").
- [ ] **Fuzzy path, local-preferred:** with an `openai-compatible` local provider configured, a free-form command
      ("spin up a couple of tasks to clean up the auth module, high priority") parses via the **local model at zero
      API cost**; with only a paid provider, it routes there (tracked + capped); with neither, it **refuses with
      guidance**.
- [ ] **Compose, don't reinvent:** created/bulk/breakdown tasks go through `createFromPrompt`/`createBulk`/
      `BreakdownService` (same classification, triage, cycle-check); priority/status/assignment/dependency intents
      hit the existing update paths; RBAC + team scope are enforced.
- [ ] **Query answerer:** "what's blocking payments?" / "what should I focus on?" return correct, board-derived
      answers (deterministic filters exact; LLM summary read-only) with task deep-links.
- [ ] **UI:** the command bar lives in the **Cmd-K palette** (+ a nav chat icon) using the composer input — **no new
      FAB**; a follow-up ("make those p1") resolves against the last result; the board updates live.
- [ ] **Safety:** mutating commands **preview + confirm** before writing (no silent bulk create/delete); **undo**
      reverts the last command; every command + effect is **audited**; a low-confidence parse asks to clarify.
- [ ] **Cost transparency + defaults:** the result states the inference path used; chat spend is a distinct
      `llm_usage` feature; with nothing configured beyond deterministic parsing, the feature works for the common
      commands at **zero cost**.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green (shared intent-schema units; gateway grammar
      parser + intent-routing + execute-via-fakes + query-answerer + local-preferred routing tests; web RTL for the
      palette command bar + confirm/undo; **web tests from the primary checkout, not a `.git` worktree**).

---

## Decisions / open questions

1. **Deterministic-first, local-preferred, paid-fallback** *(settled).* The grammar handles common commands with no
   inference; fuzzy intent prefers a configured local model (`openai-compatible`/opencode → zero cost), then the
   active paid provider, then refuses with guidance. The feature is usable **free** for the common cases.
2. **Palette command bar, not a FAB** *(settled).* Folds into the existing Cmd-K palette + the composer input; a nav
   chat icon covers discoverability. No new floating widget (the app has no FAB pattern, and it'd duplicate the
   palette). One-shot with a **light last-result context**, not full conversation memory.
3. **Compose existing services — no new mutation path** *(settled).* Chat-to-board is an intent layer over
   `createFromPrompt`/`createBulk`/`BreakdownService`/task-update/`addDependency`; it inherits their validation, RBAC,
   and cycle-check.
4. **One intent contract for both sources** *(recommend).* A shared zod discriminated union is the output of *both*
   the deterministic parser and the LLM, so the executor doesn't care where an intent came from.
5. **CLI delegation is out of scope** *(settled).* The `openai-compatible` provider already gives the local/free path;
   spawning an opencode/aider CLI to parse a command is net-new plumbing for marginal gain — deferred.
6. **Confirm + undo on writes** *(recommend).* Mutating commands preview the parsed intent and require confirmation;
   an undo token reverts the last command. Read-only queries run immediately. Destructive intents get an extra guard.
7. **Cost transparency** *(recommend).* Every result reports the path used ("no AI" / "local model" / "via provider")
   and chat spend is a distinct usage feature — the user always knows what a command cost.
8. **Out of scope** *(settled).* Multi-turn conversational memory (one-shot + last-result only), voice input,
   agent-CLI delegation for parsing, and commands over non-task entities (workflows/ideas) in v1 — all deferred.
