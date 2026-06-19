# Phase 4 — Inference ⚠️ PARTIAL

> LLM classification of list items (plan/act split) + KB injection.

> **Status (2026-06-19): partial — the largest remaining gap in the original plan.** The plan/act model split and per-task classification exist, but URL/GitHub context fetching, repo guessing, inline question answering, bulk add, and the file-based knowledge watcher are all absent. Scoping for the rest lives in [outstanding.md](outstanding.md).

## Plan model pass

- [x] Plan/act model split — `config.agent.plan` (default `opus4.8`) vs `act` (default `haiku4.5`), exposed via `LlmService.getPlanModel()`/`getActModel()` ([`gateway/src/agent/llm/llm.service.ts`](../packages/gateway/src/agent/llm/llm.service.ts))
- [x] Classification of a task — _split across two services, not one `InferenceService`:_ `LlmClassifier` infers kind (bug/feature/question/chore) on the act model ([`agent/classifier.service.ts`](../packages/gateway/src/agent/classifier.service.ts)); `PlannerService` decides readiness → `todo` vs `backlog` on the plan model ([`agent/planner.service.ts`](../packages/gateway/src/agent/planner.service.ts))
- [ ] Input: raw freeform **list** (multi-line `midnite add --bulk`, or a web "paste list" modal) — **NOT IMPLEMENTED;** single task per `add` / `POST /tasks`
- [ ] Detect URLs and fetch GitHub issue/PR context via `gh api` — **NOT IMPLEMENTED**
- [ ] Guess target repo from `config.repos` — **NOT IMPLEMENTED** (`repos` is empty in the sample config and unused for inference)
- [x] Output `todo` with a generated execution prompt
- [x] Output `backlog` (ambiguous), with a reason
- [ ] Output a direct answer for question-type items — **NOT IMPLEMENTED** (kind is classified as `question`, but no inline answer is produced)

## Knowledge base injection

- [ ] Chokidar watcher over `config.knowledge.dir`, indexing filenames + headings — **NOT IMPLEMENTED.** `knowledge.dir` is defined in config but nothing reads it at runtime; `chokidar` is not used in the gateway.
- [ ] Plan model picks relevant MD files; their **content** is concatenated into the generated prompt — **NOT IMPLEMENTED.** The "knowledge base" that exists is a set of user-added **source URLs** (title + link), injected as a reference list — _not_ watched MD-file content. See [`pool/lib/build-agent-prompt.ts`](../packages/gateway/src/pool/lib/build-agent-prompt.ts) and [`knowledge/knowledge.service.ts`](../packages/gateway/src/knowledge/knowledge.service.ts).
- [ ] Note for later: swap to embeddings/RAG if the KB grows past N files

## Done criteria

- [ ] Paste a 10-line mixed list → gateway returns a classified set, 7 land as `todo` with prompts, 2 in `backlog`, 1 answered inline — **not met** (no bulk/paste path; no inline answers)
