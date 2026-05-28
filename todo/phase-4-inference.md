# Phase 4 — Inference

> LLM classification of list items (plan/act split) + KB injection.

## Plan model pass

- [ ] `InferenceService` calling `config.agent.plan` (default `opus4.7`) via Anthropic SDK
- [ ] Input: raw freeform list (multi-line paste accepted via `midnite add --bulk`, or the web "paste list" modal)
- [ ] Per-line classification: detect URLs (fetch GitHub issue/PR via `gh api` for context), classify intent, guess target repo from `config.repos`
- [ ] Output: one of
  - `todo` with a generated execution prompt
  - direct answer (question)
  - `backlog` (ambiguous), with a reason

## Knowledge base injection

- [ ] Chokidar watcher over `config.knowledge.dir`, indexes filenames + headings
- [ ] Plan model gets a manifest of available MD files and picks relevant ones; their content is concatenated into the generated execution prompt
- [ ] Note for later: swap to embeddings/RAG if KB grows past N files

## Done criteria

- [ ] Paste a 10-line mixed list → gateway returns a classified set, 7 land as `todo` with prompts, 2 in `backlog`, 1 answered inline
