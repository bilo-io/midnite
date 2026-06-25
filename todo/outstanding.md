# Outstanding work — gaps vs. INITIAL_PLAN.md

Scoping for the parts of [`docs/INITIAL_PLAN.md`](../docs/INITIAL_PLAN.md) (Phases 1–5) that are **not yet built**, as of 2026-06-19. Everything below is forward-looking; what shipped is logged in [done.md](done.md). Effort is rough: **S** ≲1 day · **M** 1–3 days · **L** multi-day.

This list was unchecked by design at authoring (2026-06-19); tick items as they land. **Most have since shipped** — all of Phase 4 (#2 bulk, #3 URL/GitHub context, #5 repo guessing, #6 inline answers, #7 knowledge watcher), plus #1 (task WS), #4 (repo registry), #9 (branch/PR templates), and #10 (Spawner + tmux). Only the optional/low-priority items remain (#8 per-repo caps, #11 serve prod build, #12 suspend `waiting`). See the rows and [done.md](done.md).

> Note: the project has also grown a Phase-6 Workflows builder with its own named follow-ups (live WS streaming, logic nodes, credential vault, integration executors) — see [phase-6-workflows-mvp.md](phase-6-workflows-mvp.md). Phase 7 (hardening, reports, widgets) is scoped separately in [phase-7-hardening-reports-widgets.md](phase-7-hardening-reports-widgets.md). This doc only covers the original 1–5 plan.

| # | Gap | Phase | Effort | Prereqs |
|---|-----|-------|--------|---------|
| 1 | ✅ `task.*` WebSocket broadcast — Phase 7 A6 | 1 / 3 | M | — |
| 2 | ✅ Bulk / paste add — Phase 16 | 4 | S–M | — |
| 3 | ✅ URL + GitHub-context inference — Phase 15 B | 4 | M | — |
| 4 | Make `repos` first-class | 4 / 5 | S–M | — |
| 5 | ✅ Repo guessing in inference — PR #88 | 4 | S | #4 |
| 6 | ✅ Inline answers for questions — PR #55 | 4 | M | — |
| 7 | ✅ Knowledge-dir watcher (chokidar) + MD injection — Phase 15 D | 4 | M | — |
| 8 | ✅ Per-repo concurrency caps — `config.agent.maxPerRepo` + scheduler `repoHasCapacity` | 5 | M | #4 |
| 9 | Per-repo branch naming + PR templates ✅ | 5 | S | #4 |
| 10 | ✅ `Spawner` interface + tmux (warp/iterm dropped) — Phase 17 A–D | 5 | L | — |
| 11 | Serve Next.js prod build from gateway (optional) | 3 | S | — |
| 12 | Suspend `waiting` sessions to free the slot (optional) | 5 | M | — |

---

## 1. `task.*` WebSocket broadcast (Phase 1/3)

- ✅ **DONE — [Phase 7](phase-7-hardening-reports-widgets.md) A6 (`e2b9b73`).** Event-driven board updates replaced the poll-only refresh.

**What shipped (matches the recommendation below):**
- `shared/src/events/task.ts` — a discriminated `TaskBoardEvent` union (`task.created` / `task.updated` / `task.deleted` + `tasks.bulkCreated`), `TaskSubscribeMessage`, and `TASKS_WS_PATH = '/ws/tasks'`. Mirrors `events/terminal.ts` / `events/workflow.ts`.
- Gateway: a thin [`TasksGateway`](../packages/gateway/src/tasks/tasks.gateway.ts) on `/ws/tasks` (origin-guarded; `subscribe` → fan-out). The service stays decoupled via an in-process [`TaskEventBus`](../packages/gateway/src/tasks/task-event-bus.ts) (the workflow-gateway pattern, not `EventEmitter2`) that [`TasksService`](../packages/gateway/src/tasks/tasks.service.ts) emits on every mutation path.
- Web: [`useTaskEvents`](../packages/web/hooks/use-task-events.ts) (capped-backoff reconnect) → `invalidateData()` + a client fan-out, mounted app-wide via [`LiveData`](../packages/web/components/live-data.tsx).

**Decisions as settled:** (a) **full-object payloads** on create/update (id-only on delete); (b) **one board channel** (no per-task topics); (c) **polling kept** as a degraded fallback. Phase-7 D layered desktop notifications on the same stream (`7384897`).

---

## 2. Bulk / paste add (Phase 4)

- ✅ **DONE — [Phase 16](phase-16-bulk-add.md).** `POST /tasks/bulk` + coalesced event (Theme A, PR #40), CLI `add --bulk` (Theme B, PR #47), and the web paste-list modal (Theme C, PR #42) all shipped.

**Goal:** accept a multi-line freeform list in one shot, one task per line.

**Where:** CLI `add --bulk` (read stdin / a file, split lines) in [`cli/src/index.ts`](../packages/cli/src/index.ts); a "paste list" modal in web; a gateway path that fans each line through the existing classify→plan pipeline ([`tasks/tasks.service.ts`](../packages/gateway/src/tasks/tasks.service.ts) already calls classifier + planner on create).

**Decisions:** new `POST /tasks/bulk` endpoint vs. client-side loop over `POST /tasks`. Recommend a real bulk endpoint so classification can batch and the WS broadcast (#1) emits once.

**Effort:** S–M. Pure composition over existing pieces.

---

## 3. URL + GitHub-context inference (Phase 4)

- ✅ **DONE — [Phase 15](phase-15-smart-intake.md) Theme B.** [`UrlContextService`](../packages/gateway/src/agent/url-context.service.ts) detects URLs at agent-run start, resolves GitHub issue/PR links via `gh` (anonymous `api.github.com` REST fallback) and other links through the SSRF guard, reduces them to text, and injects a truncated "Linked context" block — wired in [`agent-runner.service.ts`](../packages/gateway/src/pool/agent-runner.service.ts) `start()` (fail-open, byte-capped: 5 URLs · 4k chars/source · 12k total).

**Decisions as settled:** `gh`-first (existing auth → private repos) with anonymous REST fallback; injected at the seed-prompt point, truncated.

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

- ✅ **DONE — PR #88.** `PlannerService.guessRepo` picks the target repo from the DB-backed registry (Phase 13) on the plan model when a task is created without an explicit one; persisted to `task.repo`.

**As built:** the planner is handed the registry manifest (name + path) and returns a name validated against it (an enum + post-check, so the model can't introduce a dangling reference). Fail-soft like triage/answer (AI-off / error / no clear match → unassigned); a single registered repo is chosen without an LLM call; an explicit caller repo still wins and short-circuits the guess. `repoInferred` is recorded on the `task.created` event for audit.

**Effort:** S. **Was blocked on #4** (repo registry), now done.

---

## 6. Inline answers for question-type items (Phase 4)

- ✅ **DONE — PR #55.** A `question`-kind task is answered by the plan model at intake ([`PlannerService.answer`](../packages/gateway/src/agent/planner.service.ts)) and resolved to `done` with the answer recorded on its thread (an answer `task_events` entry); fail-soft → falls back to the normal queue when AI is off.

**Decision as settled:** the answered item resolves out of the working columns (→ `done`) with its answer on the thread, rather than occupying a board column.

---

## 7. Knowledge-dir watcher + MD injection (Phase 4)

- ✅ **DONE — [Phase 15](phase-15-smart-intake.md) Theme D (PR #95).** [`knowledge-watcher.service.ts`](../packages/gateway/src/agent/knowledge-watcher.service.ts) watches `config.knowledge.dir` with `chokidar` (now a gateway dep), maintaining an in-memory filename+headings manifest; the planner selects relevant files and their **content** is injected (byte-capped) into the execution prompt.

**Decisions as settled:** surfaced as **"Knowledge files"** (distinct from the link-based **"Sources"**); injected bytes capped; the plan model picks filenames from the manifest; embeddings/RAG deferred.

---

## 8. Per-repo concurrency caps (Phase 5)

- ✅ **DONE.** `config.agent.maxPerRepo` (zod schema, default 0 = unlimited) + `repoHasCapacity()` in `AgentPoolScheduler.tick()` — filters out a task whose repo is already at the cap before assigning a slot. Shipped alongside `perUserMaxSlots` in Phase 33.

**Goal:** don't run N agents against the same repo at once.

**Where:** the scheduler is a single global FIFO ([`pool/agent-pool-scheduler.service.ts`](../packages/gateway/src/pool/agent-pool-scheduler.service.ts)). Add a per-repo in-flight counter + a config cap; the tick picks the highest-priority `todo` whose repo is under cap.

**Effort:** M. **Depends on #4** (tasks must carry a repo).

---

## 9. Per-repo branch naming + PR-template injection (Phase 5)

- ✅ **DONE** — Phase 13 follow-on E (PR #74, 2026-06-22): `branchPrefix`/`prTemplate` on the repo entity + config seed (migration `0031`); a pure `appendRepoConventions` helper folds a `## Repository conventions` section into the agent seed prompt; settable in Settings → Repos.

**Goal:** per-repo branch prefix/template and a PR-body template.

**Where:** extend `RepoConfigSchema` ([`shared/src/config.ts`](../packages/shared/src/config.ts)) with `branchPrefix`/template + `prTemplate`; consume in the agent prompt / `gh pr create` body.

**Effort:** S. **Depends on #4.**

---

## 10. `Spawner` interface + tmux/warp/iterm backends (Phase 5 → Phase 17)

- [x] **Done — [Phase 17](phase-17-spawner-tmux.md) A–D.** `Spawner` seam extracted (A, PR #56); durable `TmuxSpawner` + backend selection + survive-restart reattach + contract tests (B/C/D, PR #77). `warp`/`iterm` **dropped** from the enum (native windows don't compose with the gateway-owned browser stream — exactly the concern flagged below).

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
