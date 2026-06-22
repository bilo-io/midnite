# Phase 4 — Inference ⚠️ PARTIAL

> LLM classification of list items (plan/act split) + KB injection.

> **Status (2026-06-19): partial — the largest remaining gap in the original plan.** The plan/act model split and per-task classification exist, but URL/GitHub context fetching, repo guessing, inline question answering, bulk add, and the file-based knowledge watcher are all absent. Scoping for the rest lives in [outstanding.md](outstanding.md).

## Plan model pass

- [x] Plan/act model split — `config.agent.plan` (default `opus4.8`) vs `act` (default `haiku4.5`), exposed via `LlmService.getPlanModel()`/`getActModel()` ([`gateway/src/agent/llm/llm.service.ts`](../packages/gateway/src/agent/llm/llm.service.ts))
- [x] Classification of a task — _split across two services, not one `InferenceService`:_ `LlmClassifier` infers kind (bug/feature/question/chore) on the act model ([`agent/classifier.service.ts`](../packages/gateway/src/agent/classifier.service.ts)); `PlannerService` decides readiness → `todo` vs `backlog` on the plan model ([`agent/planner.service.ts`](../packages/gateway/src/agent/planner.service.ts))
- [x] Input: raw freeform **list** (multi-line `midnite add --bulk`, or a web "paste list" modal) — **DONE via Phase 16** (`POST /tasks/bulk`, web paste modal, CLI `add --bulk`; PRs #40/#42/#47)
- [ ] Detect URLs and fetch GitHub issue/PR context via `gh api` — **NOT IMPLEMENTED** (→ [Phase 15](phase-15-smart-intake.md) Theme B)
- [x] Guess target repo from the registry — **DONE (PR #88).** When a task is created with no explicit repo, `PlannerService.guessRepo` picks one from the DB-backed registry ([Phase 13](phase-13-repos-first-class.md)) on the plan model and persists it to `task.repo`. Fail-soft (AI-off/error/no-match → unassigned); a single repo is chosen without an LLM call; the pick is validated against the registry (no dangling reference); `repoInferred` is recorded on the `task.created` event.
- [x] Output `todo` with a generated execution prompt
- [x] Output `backlog` (ambiguous), with a reason
- [x] Output a direct answer for question-type items — `question`-kind tasks are answered by the plan model at intake and resolved to `done` with the answer on the task thread; falls back to the queue when AI is off. (PR #55)

## Knowledge base injection

- [ ] Chokidar watcher over `config.knowledge.dir`, indexing filenames + headings — **NOT IMPLEMENTED.** `knowledge.dir` is defined in config but nothing reads it at runtime; `chokidar` is not used in the gateway.
- [ ] Plan model picks relevant MD files; their **content** is concatenated into the generated prompt — **NOT IMPLEMENTED.** The "knowledge base" that exists is a set of user-added **source URLs** (title + link), injected as a reference list — _not_ watched MD-file content. See [`pool/lib/build-agent-prompt.ts`](../packages/gateway/src/pool/lib/build-agent-prompt.ts) and [`knowledge/knowledge.service.ts`](../packages/gateway/src/knowledge/knowledge.service.ts).
- [ ] Note for later: swap to embeddings/RAG if the KB grows past N files

## Done criteria

- [◐] Paste a 10-line mixed list → gateway returns a classified set, 7 land as `todo` with prompts, 2 in `backlog`, 1 answered inline — **bulk/paste path (Phase 16), inline answers (PR #55), and repo-guessing (PR #88) now met**; only URL/GitHub context (→ Phase 15 B) remains.
