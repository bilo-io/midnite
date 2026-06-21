# Outstanding work — gaps vs. INITIAL_PLAN.md

Scoping for the parts of [`docs/INITIAL_PLAN.md`](../docs/INITIAL_PLAN.md) (Phases 1–5) that are **not yet built**, as of 2026-06-19. Everything below is forward-looking; what shipped is logged in [done.md](done.md). Effort is rough: **S** ≲1 day · **M** 1–3 days · **L** multi-day.

**None of these are started** — every box below is unchecked by design; tick them as they land.

> Note: the project has also grown a Phase-6 Workflows builder with its own named follow-ups (live WS streaming, logic nodes, credential vault, integration executors) — see [phase-6-workflows-mvp.md](phase-6-workflows-mvp.md). Phase 7 (hardening, reports, widgets) is scoped separately in [phase-7-hardening-reports-widgets.md](phase-7-hardening-reports-widgets.md). This doc only covers the original 1–5 plan.

| # | Gap | Phase | Effort | Prereqs |
|---|-----|-------|--------|---------|
| 1 | `task.*` WebSocket broadcast | 1 / 3 | M | — |
| 2 | Bulk / paste add | 4 | S–M | — |
| 3 | URL + GitHub-context inference | 4 | M | — |
| 4 | Make `repos` first-class | 4 / 5 | S–M | — |
| 5 | Repo guessing in inference | 4 | S | #4 |
| 6 | Inline answers for questions | 4 | M | — |
| 7 | Knowledge-dir watcher (chokidar) + MD injection | 4 | M | — |
| 8 | Per-repo concurrency caps | 5 | M | #4 |
| 9 | Per-repo branch naming + PR templates | 5 | S | #4 |
| 10 | `Spawner` interface + tmux/warp/iterm | 5 | L | — |
| 11 | Serve Next.js prod build from gateway (optional) | 3 | S | — |
| 12 | Suspend `waiting` sessions to free the slot (optional) | 5 | M | — |

---

## 1. `task.*` WebSocket broadcast (Phase 1/3)

- [ ] **Not started**

**Goal:** event-driven board updates (`task.created` / `task.updated` / `task.deleted` / `status.changed`) instead of the current polling + `invalidateData()` refetch.

**Where it plugs in:**
- `shared/src/events/task.ts` — new discriminated `TaskEvent` union (mirror the existing [`events/terminal.ts`](../packages/shared/src/events/terminal.ts) / [`events/workflow.ts`](../packages/shared/src/events/workflow.ts) shapes).
- Gateway: a `TasksGateway` (Nest WS, thin) modelled on [`workflows/workflows.gateway.ts`](../packages/gateway/src/workflows/workflows.gateway.ts). Publish from `TasksService` mutation paths ([`tasks/tasks.service.ts`](../packages/gateway/src/tasks/tasks.service.ts)) via an in-process emitter (Nest `EventEmitter2`) so the service stays decoupled from the WS layer.
- Web: a `use-task-events` subscription hook; on event, either call `invalidateData()` (cheap, minimal change) or patch the local cache.

**Decisions:** (a) full-object payloads vs. id-only + refetch; (b) one board channel vs. per-task topics; (c) keep polling as a fallback or remove it. Recommend full-object payloads on a single board channel, polling kept as a degraded fallback.

**Effort:** M. The WS plumbing pattern already exists twice — most of the work is the service→gateway publish wiring and the client hook.

---

## 2. Bulk / paste add (Phase 4)

- ◐ **API done** — `POST /tasks/bulk` (the bulk endpoint + coalesced event) landed in [Phase 16](phase-16-bulk-add.md) Theme A (PR #40, 2026-06-21). The CLI `add --bulk` (Theme B) and web paste modal (Theme C) clients remain.

**Goal:** accept a multi-line freeform list in one shot, one task per line.

**Where:** CLI `add --bulk` (read stdin / a file, split lines) in [`cli/src/index.ts`](../packages/cli/src/index.ts); a "paste list" modal in web; a gateway path that fans each line through the existing classify→plan pipeline ([`tasks/tasks.service.ts`](../packages/gateway/src/tasks/tasks.service.ts) already calls classifier + planner on create).

**Decisions:** new `POST /tasks/bulk` endpoint vs. client-side loop over `POST /tasks`. Recommend a real bulk endpoint so classification can batch and the WS broadcast (#1) emits once.

**Effort:** S–M. Pure composition over existing pieces.

---

## 3. URL + GitHub-context inference (Phase 4)

- [ ] **Not started**

**Goal:** detect URLs in a task line; for GitHub issue/PR links, fetch context and fold it into the generated execution prompt.

**Where:** in the classify/plan path ([`agent/classifier.service.ts`](../packages/gateway/src/agent/classifier.service.ts) / [`agent/planner.service.ts`](../packages/gateway/src/agent/planner.service.ts)). Reuse the SSRF-guarded fetch already written for OpenGraph ([`lib/opengraph.ts`](../packages/gateway/src/lib/opengraph.ts)) as the model for safe fetching; for GitHub, prefer `gh api` (shell) or the REST API with a token.

**Decisions:** require the `gh` CLI vs. a `GITHUB_TOKEN`; how much issue/PR body to inject (truncate). 

**Effort:** M.

---

## 4. Make `repos` first-class (Phase 4/5 prerequisite)

- ◐ **Registry done** — the DB-backed repo registry + REST + Settings UI + config-seed + registry-backed `resolveCwd` landed in [Phase 13](phase-13-repos-first-class.md) Theme A (PR #45, 2026-06-21). Still open (Theme B): a task-creation **picker**, write-time `task.repo` **validation** (no silent fall-through), and the cwd-precedence tests — plus the deferred follow-ons (#5 repo guessing, #8 caps, #9 branch/PR templates).

**Goal:** promote `repos` from a dormant config shape to a managed entity the workflow revolves around. Today it's half-wired: `RepoConfig` is `{ name, path }`, `config.repos` is empty in the sample, and `tasks.repo` is a **nullable free-text name**. The create endpoint accepts a `repo` field ([`tasks.controller.ts`](../packages/gateway/src/tasks/tasks.controller.ts), [`tasks.service.ts`](../packages/gateway/src/tasks/tasks.service.ts)), and there is exactly **one consumer** — [`terminal.service.ts`](../packages/gateway/src/terminal/terminal.service.ts) `resolveCwd()` maps `task.repo` (name) → `config.repos[].path` to pick the PTY cwd. But it's dormant: the list is empty, the web new-task modal has no repo picker, inference never sets it, and a missing/mismatched name silently falls through to a fallback dir.

**What "first-class" requires:**
- **Manageable** — a list users actually populate/CRUD (config or DB + settings UI), not an empty array.
- **Selectable & guessable** — a repo picker in the new-task modal; inference guesses it (#5).
- **A validated reference** — `task.repo` resolves to a *known* repo (error / explicit "unassigned" on miss), not a free string that no-ops on typo.
- **Consumed broadly** — already drives the agent cwd; extend to per-repo caps (#8), branch naming + PR templates (#9), and show repo on cards/threads.

**Effort:** S–M. Unblocks #5, #8, #9.

---

## 5. Repo guessing in inference (Phase 4)

- [ ] **Not started**

**Goal:** the plan model picks the target repo from `config.repos` for each task.

**Where:** extend the planner prompt to include the repo manifest and return a repo name; persist to `tasks.repo`.

**Effort:** S. **Depends on #4.**

---

## 6. Inline answers for question-type items (Phase 4)

- [ ] **Not started**

**Goal:** when classification yields `kind: question`, produce a direct answer instead of landing an actionable task.

**Where:** classifier already detects `question`; add an answer-generation step (plan model) and surface the answer in the task thread (a `task_events` entry, or a dedicated answered state).

**Decisions:** does an answered item occupy a board column, or resolve out of the board into the thread only? 

**Effort:** M.

---

## 7. Knowledge-dir watcher + MD injection (Phase 4)

- [ ] **Not started**

**Goal:** the plan's "watched folder of MD files" — index `config.knowledge.dir`, let the plan model pick relevant files, inject their **content** into the execution prompt. Today the only "knowledge base" is user-added **source URLs** (title+link), injected as a reference list by [`pool/lib/build-agent-prompt.ts`](../packages/gateway/src/pool/lib/build-agent-prompt.ts).

**Where:** a new gateway service watching `config.knowledge.dir` with `chokidar` (add to gateway runtime deps), maintaining an in-memory manifest (filename + headings); extend `build-agent-prompt.ts` to append selected file contents. CLAUDE.md already describes this watcher as a feature — implement to match.

**Decisions:** disambiguate the two "knowledge bases" (file-KB vs. source-link-KB) in naming/UI; cap injected bytes; how the plan model selects files (pass manifest → ask for filenames). Defer embeddings/RAG.

**Effort:** M.

---

## 8. Per-repo concurrency caps (Phase 5)

- [ ] **Not started**

**Goal:** don't run N agents against the same repo at once.

**Where:** the scheduler is a single global FIFO ([`pool/agent-pool-scheduler.service.ts`](../packages/gateway/src/pool/agent-pool-scheduler.service.ts)). Add a per-repo in-flight counter + a config cap; the tick picks the highest-priority `todo` whose repo is under cap.

**Effort:** M. **Depends on #4** (tasks must carry a repo).

---

## 9. Per-repo branch naming + PR-template injection (Phase 5)

- [ ] **Not started**

**Goal:** per-repo branch prefix/template and a PR-body template.

**Where:** extend `RepoConfigSchema` ([`shared/src/config.ts`](../packages/shared/src/config.ts)) with `branchPrefix`/template + `prTemplate`; consume in the agent prompt / `gh pr create` body.

**Effort:** S. **Depends on #4.**

---

## 10. `Spawner` interface + tmux/warp/iterm backends (Phase 5)

- [ ] **Not started**

**Goal:** the planned pluggable spawner selected by `terminal.mode` (the enum exists but is never read; only `pty` is wired).

**Where:** extract the node-pty lifecycle out of the ~880-line [`terminal/terminal.service.ts`](../packages/gateway/src/terminal/terminal.service.ts) into a `PtySpawner` behind a `Spawner` interface (`spawn → { pid, write, resize, onData, onExit, kill }`), then add `TmuxSpawner` / `WarpSpawner` / `ItermSpawner`.

**⚠️ Worth questioning before building:** the whole Phase-3 browser UX depends on the gateway-managed PTY stream (xterm.js). `warp`/`iterm` open *native* windows that bypass browser streaming, approvals, and the ring buffer — they don't compose with the live-terminal model the app is now built around. Recommend: do the `Spawner` refactor + `tmux` (scriptable, CI-testable) if there's demand; treat `warp`/`iterm` as low priority / possibly cut.

**Effort:** L (the refactor dominates; ring buffer, tokens, idle-reap, and approvals are entangled with PTY specifics).

---

## 11. Serve Next.js prod build from gateway (Phase 3, optional)

- [ ] **Not started**

**Goal:** the plan's optional "serve the web build from the gateway in prod mode". Today [`bootstrap.ts`](../packages/gateway/src/bootstrap.ts) serves `/uploads/` static only; the web app runs as a separate Next.js server.

**Where / verdict:** likely **superseded** — the Electron desktop app already wraps the web UI, and `midnite serve` + a separate Next server covers dev. Only worth doing if a single-port, no-desktop deployment is wanted. Low priority.

**Effort:** S.

---

## 12. Suspend `waiting` sessions to free the slot (Phase 5, optional)

- [ ] **Not started**

**Goal:** revisit [open-decision #1](open-decisions.md) — instead of holding the slot while a session is `waiting` on user input, suspend it so the slot can start another `todo`.

**Where / verdict:** the session's PTY is literally alive and blocked on stdin, so this means snapshotting/parking a live process — significantly harder, and the current `waitingHoldsSlot: true` default is the deliberate v1 choice. Only pursue under real slot pressure.

**Effort:** M (conceptually L if it implies true process suspension).
