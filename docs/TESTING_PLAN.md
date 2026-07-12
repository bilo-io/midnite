# midnite — Testing Plan & Phase Walkthrough

> A single place to (a) understand **what shipped in every phase**, and (b) **drive each feature by hand** to confirm it works. Pair this with [`INITIAL_PLAN.md`](INITIAL_PLAN.md) (the design source of truth) and [`../todo/`](../todo/) (phase checklists + `done.md`).
>
> Each phase below has the same four parts:
> - **Shipped** — what exists today.
> - **Walk through it** — concrete steps to exercise it manually.
> - **Automated coverage** — what the test suite already proves.
> - **Gaps** — what is *not* built (so a "missing" feature isn't read as a bug).
>
> Status legend: ✅ complete · ◐ partial · ⚠️ largest gaps.

---

## 0. Setup — run the whole thing once

```bash
proto install            # pinned node 22.11.0 + pnpm 9.15.0
pnpm install             # link the workspace

# Encryption key for provider API keys at rest (Phase 7 A1). 32 bytes,
# hex (64 chars) or base64. Without it, encrypted providers are disabled
# (fail-closed) — fine for a first boot with no saved keys.
export MIDNITE_SECRET_KEY="$(openssl rand -hex 32)"
```

Three terminals for a full manual session:

```bash
# 1) gateway — REST + WS on http://localhost:7777
moon run gateway:dev
curl -s localhost:7777/health        # → {"ok":true}

# 2) web — Next.js kanban on http://localhost:3000
moon run web:dev

# 3) cli — talks to the gateway from config (midnite.json → gateway.port 7777)
moon run cli:dev -- list
```

Config lives in [`midnite.json`](../midnite.json) at the repo root (validated by `@midnite/shared`). Key fields: `agent.pool` (slots), `agent.plan`/`agent.act` (model split), `gateway.port`, `repos`, `knowledge.dir`, `workflows`.

### Automated suite — one command

```bash
moon run :typecheck :test :lint     # everything, graph-aware + cached
moon ci                             # what CI runs
```

**Current status (2026-06-19):**

| Package | Tests | Notes |
|---|---|---|
| `gateway` | **335** across 55 files | services, controllers, scheduler, crypto, usage, backup, tasks-WS, workflow engine |
| `shared` | 12 test files | zod schemas, state machine, event/report shapes |
| `web` | **15** across 4 files | `use-local-storage`, `dashboard-widgets`, `task-events`, **`command-palette`** |
| `cli` | 1 test file | client/render |

> **Known flake (not a code bug):** running the *full* graph (`moon run :typecheck :test`) can surface `PageNotFoundError: Cannot find module for page: /media` (or `/councils/view`, `/memory`) during `web:build`. `web:build` is pulled in by `desktop:typecheck`'s `^:build`; under heavy CPU contention Next 15's page-data workers occasionally fail to resolve a route. **Run `moon run web:build` on its own and it passes 19/19.** If CI flakes here, re-run the `web:build` task.

---

## Phase 0 — Scaffold ✅

**Shipped.** moon + proto + pnpm monorepo; six packages (`shared`, `gateway`, `cli`, `web`, plus `desktop` Electron wrapper and `site` marketing). ESLint/Prettier at the root; CI via `moon ci`.

**Walk through it.**
- `moon run :build` — all packages build.
- `moon run shared:build` → `packages/shared/dist/` exists; `moon run gateway:build` → `packages/gateway/dist/`.
- `curl localhost:7777/health` → `{"ok":true}` while `gateway:dev` runs.

**Automated coverage.** `moon ci` (typecheck + lint + test + build across the graph).

**Gaps.** None. (Package count grew 4 → 6 since the plan.)

---

## Phase 1 — Board you drive by hand ✅ (one historical deviation, now closed)

**Shipped.** Drizzle SQLite store (`tasks`, `task_events`, `task_attachments`, `task_links`); `TasksModule` (controller → service → repository); config loader; the CLI making real REST calls. The original `task.*` WebSocket broadcast was the one Phase-1 deviation — **it shipped in Phase 7 (A6)**, so the board is now event-driven.

**Walk through it.**
```bash
moon run cli:dev -- add "buy milk"           # POST /tasks
moon run cli:dev -- list                     # GET /tasks  → the task appears
moon run cli:dev -- list --status todo       # GET /tasks?status=todo
moon run cli:dev -- move <id> wip            # PATCH /tasks/:id/status
```
REST surface (under `@Controller('tasks')`): `POST /tasks` (multipart: prompt, status, priority, projectId, images), `GET /tasks?status=&projectId=`, `PATCH /tasks/:id/status`, `PATCH /tasks/:id/project`, `PATCH /tasks/:id/tags`, `DELETE /tasks/:id` (archive-gated).

**Automated coverage.** gateway: tasks service + controller + repository, state-machine transitions; shared: task zod schema.

**Gaps.** `DELETE` is archive-then-delete (not a raw delete) — by design.

---

## Phase 2 — Agents ✅

**Shipped.** `AgentPoolService` (N slots = `agent.pool`), a tick scheduler (gated on `agent.poolEnabled`, default **off**), `node-pty` spawning inside `terminal.service.ts`, per-session ring buffer, and Claude Code lifecycle hooks → status callbacks. A manual `POST /tasks/:id/start` kicks a task off regardless of the flag.

**Walk through it.**
- **Manual start:** drag a `todo`/`backlog` card into **In progress** in the web board (or `POST /tasks/:id/start`) → an agent session spawns in the configured repo cwd and streams to the terminal.
- **Lifecycle hooks** (authenticated by `x-midnite-hook-secret`, per session):
  - `POST /hooks/sessions/:sessionId/notification` → task flips to **waiting**.
  - `POST /hooks/sessions/:sessionId/stop` → **done** (captures a PR URL from output; else **waiting**).
- **Crash path:** kill the PTY without a Stop hook → retry up to `agent.maxRetries` (default 3), then **abandoned**.
- **Autonomous mode:** set `agent.poolEnabled: true` in `midnite.json`, add several `todo`s, watch the scheduler assign idle slots highest-priority-first.

**Automated coverage.** gateway: pool service, scheduler tick, lifecycle-hook controller (secret auth + transitions), retry/abandon logic.

**Gaps.** No standalone pluggable `Spawner` interface yet — only `pty` (see Phase 5).

---

## Phase 3 — Browser ✅ (state-sync deviation, partly closed)

**Shipped.** Next.js App Router kanban: `@dnd-kit` board with optimistic move + rollback; task cards (title, repo, status, priority/project badges, PR link, **tags**); embedded `xterm.js` terminals with a 2-way WS stream to the gateway PTY; new-task modal. Server state syncs via custom `usePolling`/`invalidateData()` hooks **plus** the new `/ws/tasks` event stream (A6) — *not* TanStack Query.

**Walk through it.**
- Open `http://localhost:3000/tasks`. Drag a card across columns → it restatuses optimistically, persists, and (via `/ws/tasks`) any other open tab updates live. Confirm with `moon run cli:dev -- list`.
- Drag `todo`→`In progress` spawns a session; drag a `wip`/`waiting` card back to `todo`/`backlog` stops it.
- Open a running task → watch the agent terminal live (`/ws/terminal`, token via `POST /sessions/:id/terminal-token`); completed/idle sessions show a static transcript.
- List / board / table view toggle (persisted to localStorage).

**Automated coverage.** gateway: terminal service, sessions service, `/ws/tasks` gateway + `TaskBoardEvent` schema. web: `task-events` pub/sub, `use-local-storage`.

**Gaps.** Optimistic-board reducer and `lib/api.ts` have no unit tests yet; no Playwright smoke in CI. Serving the Next build from the gateway in prod is **not** implemented (the Electron app wraps the web UI instead).

---

## Phase 4 — Inference ⚠️ PARTIAL (largest remaining gap)

**Shipped.** The plan/act model split (`agent.plan` vs `agent.act`, surfaced via `LlmService`); per-task classification (`LlmClassifier` → bug/feature/question/chore on the act model) and readiness planning (`PlannerService` → `todo` vs `backlog` on the plan model) on create; generated execution prompt for `todo`s; a reason for `backlog`s.

**Walk through it.**
```bash
moon run cli:dev -- add "fix the flaky heartbeat test"   # → classified kind + lands todo (with prompt) or backlog (with reason)
```
Inspect the resulting task's `kind`, `status`, and generated prompt in the web task thread.

**Automated coverage.** gateway: classifier + planner services (with fake LLM), prompt builder.

**Gaps (tracked in [`../todo/outstanding.md`](../todo/outstanding.md) #2,3,5,6,7).** No bulk/paste add; no URL/GitHub-context fetching; no repo guessing; no inline answers for `question` items; **no chokidar knowledge-dir watcher** (the only "knowledge base" today is user-added source *URLs*, injected as a reference list — not watched MD-file content).

---

## Phase 5 — Polish ◐ PARTIAL

**Shipped.** Task priorities (`0..3`, scheduler picks highest first, oldest-first within a priority); crash retries capped by `agent.maxRetries` → `abandoned`; ESLint + Prettier; CI (`moon ci`); the Vitest suites.

**Walk through it.**
- Add tasks with different `priority` values, enable the pool, confirm scheduling order.
- Force a crash (kill the PTY) and watch requeue → retry → abandon after the cap.

**Automated coverage.** gateway: scheduler priority ordering, retry/abandon.

**Gaps (outstanding #4,8,9,10,12).** No `tmux`/`warp`/`iterm` spawner backends (`terminal.mode` enum exists but only `pty` is wired); no per-repo concurrency caps; no per-repo branch-naming / PR templates; `repos` not yet first-class; no `waiting`-session suspension.

---

## Phase 6 — Workflows (node-based automation builder) ✅

**Shipped.** A visual n8n/Make-style builder. `shared` node-type registry drives both gateway executors and the web palette. Tables `workflows`/`workflow_runs`/`node_runs`; `WorkflowEngine` (topological run, cycle rejection, per-node persistence, short-circuit on failure, `AbortSignal` cancel); executors `http.request` (SSRF-guarded, with a self-origin allowance for the gateway's own API) and `ai.claude`; a single `WorkflowScheduler` (croner) for cron triggers, plus manual / signed-webhook / task-event triggers. Web: React Flow canvas, palette, config panel, Play/Save toolbar, run-output panel, run polling.

**Walk through it.**
- `http://localhost:3000/workflows` → new workflow → drag `manual → http.request` → **Run** → see a persisted run with per-node status + output.
- Add an `ai.claude` node → Run → a completion comes back (verified with `haiku4.5`).
- **Demo API**: install the **HTTP methods showcase** template → **Run** → each of GET/POST/PUT/PATCH/DELETE echoes back in the run-output panel (hits the built-in `/playground/echo`).
- **Schedule** trigger: set a cron, enable, wait for the tick to fire a run.
- **Webhook** trigger: `POST /hooks/workflows/:id/:token` with a JSON body → fires a run with the body as trigger output; a bad token → 404. Rotate via `POST /workflows/:id/webhook/rotate`.
- Invalid node params → 400.

**Automated coverage.** gateway: graph algorithms, engine success/failure/validation, service create/update-sync/webhook, executor guards. shared: node-type registry + param validation.

**Gaps (follow-ups in [`../todo/phase-6-workflows-mvp.md`](../todo/phase-6-workflows-mvp.md)).** Live WS run streaming, logic nodes + `{{expr}}` templating, credential vault + OAuth, Slack/Google/Email executors, palette drag/minimap/autosave, CLI `workflow` commands.

---

## Phase 7 — Hardening, Reports & Widgets ✅ (essentially complete)

The consolidation phase: make what exists trustworthy, let users export artifacts, and fill genuine dashboard gaps. Full detail in [`../todo/phase-7-hardening-reports-widgets.md`](../todo/phase-7-hardening-reports-widgets.md).

### A1 — Provider keys encrypted at rest ✅
**Shipped.** AES-256-GCM via `crypto/` (`MIDNITE_SECRET_KEY`, per-value IV, self-describing `v1:` format); encrypt-on-write / decrypt-on-read; legacy plaintext re-encrypted on next write + a one-time startup pass. **Fail-closed:** no key ⇒ encrypted providers disabled and writes rejected (400).
**Walk through it.** Boot *without* `MIDNITE_SECRET_KEY` → saving a provider key returns 400, encrypted providers are inert (never a silent plaintext fallback). Boot *with* the key → keys save, round-trip, and on disk the stored value is `v1:…` ciphertext, not the raw key.
**Automated coverage.** gateway: `crypto.service` (hex/base64 key decode, round-trip, tamper detection), credential repository encrypt/decrypt.

### A2 — LLM usage & cost accounting ✅
**Shipped.** `llm_usage` table + `usage/` module; per-call records (provider, model, feature, in/out tokens, est. cost); `GET /usage/summary` aggregates by day/provider/feature; **soft-warn** budget banner (never blocks). Councils are *not* tracked (they run via spawned CLI sessions, no SDK token counts).
**Walk through it.** Run a few LLM-backed actions (classify a task, run an `ai.claude` node) → `curl localhost:7777/usage/summary` shows the rollup; the dashboard **LLM cost & usage** widget reflects it.
**Automated coverage.** gateway: usage service aggregation + recording.

### A3 — Web test toolchain ◐ PARTIAL
**Shipped.** Vitest + @testing-library/react + jsdom wired (`web:test` runs in `moon ci`); seeded suites for the highest-risk logic. **This change added `command-palette.test.tsx`** (6 tests), bringing web to 15.
**Gaps.** `lib/api.ts` + optimistic-board tests; a Playwright smoke suite in CI.

### A4 — Resilience & durability ◐ PARTIAL
**Shipped.** SQLite WAL + `synchronous=NORMAL` + `busy_timeout=5000`; consistent online backup via `POST /admin/backup` (DB snapshot + uploads copy).
**Walk through it.** `curl -X POST localhost:7777/admin/backup` → a snapshot file is produced; restore is a documented manual stop-and-copy.
**Gaps.** CLI `midnite backup` wrapper; a live-restore endpoint; a restart-recovery audit (workflow runs) + shutdown-kills-all-PTYs verification.

### A6 — `task.*` WebSocket broadcast ✅
**Shipped.** `TaskEventBus` + `TasksGateway` (`/ws/tasks`) publish a `TaskBoardEvent` on every transition; web `useTaskEvents` invalidates the cache (polling kept as fallback). Also powers notifications.
**Walk through it.** Open the board in two tabs; move a card in one → the other updates without a manual refresh.
**Automated coverage.** gateway: tasks gateway + event bus; shared: `TaskBoardEvent` schema.

### B — Reports & export (Councils first) ✅
**Shipped.** `shared/report.ts` (format enum + server/client split); gateway `buildCouncilRunReport()` (format-aware: prompt → active synthesis → archived syntheses → per-member contributions, de-anonymizing A/B/C via the label map); route `GET /councils/:id/runs/:runId/export?format=md`; web `ExportMenu` (Copy Markdown · Download .md · Download PDF via `@media print` + `window.print()`).
**Walk through it.** Run a council, open a run, use **Export** → copy/download the Markdown; **Download PDF** opens the print dialog (works in browser and Electron). `curl 'localhost:7777/councils/:id/runs/:runId/export?format=md'` returns the Markdown; `?format=pdf` returns 400 (rendered client-side).
**Automated coverage.** gateway: 14 builder tests (attributed / anonymized / multi-synthesis / failed-member); shared: report shape.
**Gaps.** One-click Electron `webContents.printToPDF()` bridge (window.print covers it); other report types (Projects, Task threads) — free once the framework is reused.

### C — Dashboard widgets ✅
**Shipped.** **LLM cost & usage** widget (with A2) and a **Shipped** widget (recent done tasks with `owner/repo#123` PR links). Registry already covered agents/activity/throughput/system-health/sessions/workflows/councils/memories/etc.
**Walk through it.** `/dashboard` → add the **Shipped** and **LLM cost & usage** widgets from the registry; confirm they populate.
**Gaps.** Quick-capture widget; per-repo status widget (needs repos first-class).

### D — Smaller features ✅
**Shipped.** **⌘K command palette** (cross-surface jump; nav-only v1); **desktop notifications** on `→waiting`/`→done` (opt-in in Settings, requests Notification permission); **tags + saved filters** (tag chips on cards, modal editor, `tags` query-param board filter that's shareable/bookmarkable).
**Walk through it.**
- **⌘K** anywhere → type to filter surfaces (matches label *and* description) → ↑/↓ + Enter navigates, Esc closes.
- Settings → enable notifications (grant permission) → move a task to `waiting`/`done` → a notification fires.
- Open a task → add tags (Enter to add, × to remove) → on the board, the tag filter pills narrow the list; the URL carries `?tags=…` (bookmark it).
**Automated coverage.** web: `command-palette` (6 tests — open/toggle/filter/empty/Enter-nav/Escape), `dashboard-widgets` registry. gateway: tag normalization (trim/dedupe/cap) + `PATCH /tasks/:id/tags`.

---

## What is *not* built (so you don't test for it)

From [`../todo/outstanding.md`](../todo/outstanding.md) (original plan, Phases 1–5) — all unstarted:
bulk/paste add · URL+GitHub-context inference · repo guessing · inline question answers · knowledge-dir watcher · per-repo concurrency caps · per-repo branch naming/PR templates · `Spawner` interface + tmux/warp/iterm · serve Next build from gateway · suspend `waiting` sessions.

Deferred Phase-7 items (non-blockers): CLI `midnite backup`, live-restore, restart-recovery audit + shutdown verification, CI Playwright smoke, command-palette content search, tags-on-create, hard-stop budget caps (decided soft-warn only), Electron one-click printToPDF, remote-access auth (decided local-only).

---

## Quick regression checklist

- [ ] `moon run :typecheck :test :lint` green (`web:build` re-run if it flakes — see §0).
- [ ] gateway boots, `/health` ok; web boots, board renders.
- [ ] CLI add → list → move round-trips; the move shows live in an open web tab (A6).
- [ ] Manual task start spawns a session; lifecycle hooks transition it; PR captured on done.
- [ ] Workflow `manual → http.request` runs; `ai.claude` returns a completion; webhook + bad-token (404).
- [ ] Council export downloads Markdown + prints to PDF.
- [ ] Provider key save fails closed without `MIDNITE_SECRET_KEY`; stored as `v1:` ciphertext with it.
- [ ] ⌘K palette, tag filter (`?tags=`), notifications opt-in, backup endpoint.
