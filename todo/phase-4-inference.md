# Phase 4 — Inference ✅

> LLM classification of list items (plan/act split) + KB injection.

> **Status (2026-06-22): complete.** The plan/act split + per-task classification were always here; the rest landed since, several under later phases: **bulk add** (Phase 16), **inline answers** (PR #55), **repo guessing** (PR #88), **URL/GitHub-context inference** (Phase 15 Theme B), and the **file-based knowledge watcher** (Phase 15 Theme D, PR #95). This doc was the original scoping; the gap tracker is [outstanding.md](outstanding.md).

## Plan model pass

- [x] Plan/act model split — `config.agent.plan` (default `opus4.8`) vs `act` (default `haiku4.5`), exposed via `LlmService.getPlanModel()`/`getActModel()` ([`gateway/src/agent/llm/llm.service.ts`](../packages/gateway/src/agent/llm/llm.service.ts))
- [x] Classification of a task — _split across two services, not one `InferenceService`:_ `LlmClassifier` infers kind (bug/feature/question/chore) on the act model ([`agent/classifier.service.ts`](../packages/gateway/src/agent/classifier.service.ts)); `PlannerService` decides readiness → `todo` vs `backlog` on the plan model ([`agent/planner.service.ts`](../packages/gateway/src/agent/planner.service.ts))
- [x] Input: raw freeform **list** (multi-line `midnite add --bulk`, or a web "paste list" modal) — **DONE via Phase 16** (`POST /tasks/bulk`, web paste modal, CLI `add --bulk`; PRs #40/#42/#47)
- [x] Detect URLs and fetch GitHub issue/PR context via `gh api` — **DONE via [Phase 15](phase-15-smart-intake.md) Theme B.** [`UrlContextService`](../packages/gateway/src/agent/url-context.service.ts) extracts URLs at agent-run start, resolves GitHub issue/PR links via `gh` (anonymous REST fallback) and other links through the SSRF guard, and injects a truncated "Linked context" block — wired in [`agent-runner.service.ts`](../packages/gateway/src/pool/agent-runner.service.ts) `start()`.
- [x] Guess target repo from the registry — **DONE (PR #88).** When a task is created with no explicit repo, `PlannerService.guessRepo` picks one from the DB-backed registry ([Phase 13](phase-13-repos-first-class.md)) on the plan model and persists it to `task.repo`. Fail-soft (AI-off/error/no-match → unassigned); a single repo is chosen without an LLM call; the pick is validated against the registry (no dangling reference); `repoInferred` is recorded on the `task.created` event.
- [x] Output `todo` with a generated execution prompt
- [x] Output `backlog` (ambiguous), with a reason
- [x] Output a direct answer for question-type items — `question`-kind tasks are answered by the plan model at intake and resolved to `done` with the answer on the task thread; falls back to the queue when AI is off. (PR #55)

## Knowledge base injection

- [x] Chokidar watcher over `config.knowledge.dir`, indexing filenames + headings — **DONE via [Phase 15](phase-15-smart-intake.md) Theme D (PR #95).** [`knowledge-watcher.service.ts`](../packages/gateway/src/agent/knowledge-watcher.service.ts) watches the dir with `chokidar` (now a gateway dep) and maintains an in-memory filename+headings manifest.
- [x] Plan model picks relevant MD files; their **content** is concatenated into the generated prompt — **DONE via Phase 15 Theme D.** Surfaced as **"Knowledge files"** (distinct from the link-based **"Sources"**); the planner selects files from the manifest and their content is injected (byte-capped). _(This is separate from the source-URL reference list in [`pool/lib/build-agent-prompt.ts`](../packages/gateway/src/pool/lib/build-agent-prompt.ts).)_
- [ ] Note for later: swap to embeddings/RAG if the KB grows past N files — ⏳ **deferred** (keyword/heading manifest + model selection is the v1; Phase 15 §5).

## Done criteria

- [x] Paste a 10-line mixed list → gateway returns a classified set, 7 land as `todo` with prompts, 2 in `backlog`, 1 answered inline — **met**: bulk/paste path (Phase 16), inline answers (PR #55), repo-guessing (PR #88), and URL/GitHub context (Phase 15 B) all landed.
