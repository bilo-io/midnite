# Completed work

Append new entries at the **top**. Each entry: one heading with the date, a short summary, and the tickbox list of what landed.

---

## 2026-06-08 — Workflows MVP (node-based automation builder)

New **Workflows** space: an n8n/Make-style visual builder where a workflow is a directed graph of nodes wired by edges, starting at a trigger (manual Play, cron schedule, or signed webhook) and flowing data through action nodes (HTTP request, AI/Claude). Runs are persisted with per-node status/output and shown in run history (polled in the MVP). A **node-type registry** in `shared` drives both the gateway executor registry and the web palette/config forms, so adding an integration is one definition + one executor. Branch: `feature/workflow-builder`. See [`todo/phase-6-workflows-mvp.md`](phase-6-workflows-mvp.md).

- [x] `shared`: `node.ts`, `node-types.ts` (registry + 5 MVP types), `trigger.ts`, `run.ts`, `workflow.ts`, `events/workflow.ts`; `WorkflowsConfigSchema` defaulted onto `MidniteConfigSchema`; registry/param tests
- [x] `gateway`: `workflows`/`workflow_runs`/`node_runs` tables (+ migration `0003_workflows`); `WorkflowsModule` (controller/service/repository); `WorkflowEngine` (topological run, cycle rejection, short-circuit, background execution) + `ExecutorRegistry` with `http.request` (SSRF-guarded) and `ai.claude` (reuses `AnthropicService`) executors; single `WorkflowScheduler` tick loop (croner, gated on `workflows.enabled`); signed webhook receiver `POST /hooks/workflows/:id/:token`
- [x] `web`: `@xyflow/react` + `zustand`; `/workflows` list + `/workflows/[id]` React Flow editor (palette, custom nodes, config panel with cron preview + webhook URL, toolbar with Play/Save, run-output panel); editor-scoped Zustand store; polling run hook; nav entry + design-token theming
- [x] Verified live: manual + HTTP run succeeds (real fetch); AI/Claude returns text (`haiku4.5`); webhook fires from an external POST with body as trigger output (bad token → 404); invalid params → 400; `:typecheck` + `:test` green (56 tests)
- [ ] Follow-ups: live WS streaming, logic nodes, credential vault + OAuth, Slack/Google/Email executors, drag-from-palette + autosave, CLI commands

---

## 2026-06-07 — Live 2-way session terminal stream

The session web window is now a **direct, bidirectional stream** between a gateway-spawned PTY and the browser: the web app renders live output via xterm.js *and* sends keystrokes/resizes back over a WebSocket. PTY is configurable (defaults to an interactive shell in the session's repo, `terminal.command: "claude"` to drive a live agent), spawned on demand when a window opens, reused/replayed across reconnects, idle-reaped, and killed on shutdown. Live terminal serves active (`running`/`waiting`) sessions; completed/idle keep the static REST transcript. Branch: `feature/session-terminal-stream`.

- [x] `shared`: `events/terminal.ts` — zod discriminated unions for the WS protocol (`attach`/`input`/`resize` ↔ `output`/`status`/`error`, bytes base64-framed), `TerminalTokenResponse`; extended `TerminalConfigSchema` (`command`/`args`/`scrollbackBytes`/`idleDisposeMs`)
- [x] `gateway`: `terminal.service.ts` (node-pty lifecycle, byte-bounded ring buffer, single-use per-session token, idle/shutdown cleanup, fail-soft load), `terminal.gateway.ts` (`@WebSocketGateway` on `/ws/terminal`, raw-message zod validation, token auth), `WsAdapter` wired in `main.ts`, `POST /sessions/:id/terminal-token`. Added `node-pty` + `ws` (+ root `postinstall` restoring node-pty's macOS `spawn-helper` exec bit dropped by pnpm extraction)
- [x] `web`: `use-terminal-socket` (mint token → attach → stream → input/resize, capped-backoff reconnect), `session-terminal` (xterm.js, client-only `ssr:false` dynamic, FitAddon + ResizeObserver, theme-synced), `session-terminal-modal`, `sessions-view` branches active→terminal / completed→transcript; `gatewayWsUrl()` + `mintTerminalToken()` in `lib/api.ts`
- [x] Tests: shared union round-trips; gateway `terminal.service` (echo PTY, ring trim, reattach replay, exit, destroy, token single-use) + `terminal.gateway` (attach/echo, unauthorized, bad-message, attach-before-input, detach) — 32 gateway tests passing; `:typecheck`, `:lint`, web `next build` green; live E2E against the running gateway (REST token → WS attach → PTY spawn → input echoed) confirmed
- [ ] Follow-ups: browser visual pass; wire the Phase-2 scheduler to pre-spawn `claude` PTYs into the same registry; surface terminal liveness on `SessionSummary`

---

## 2026-06-04 — Projects feature

New **Projects** space: group work under a project with an (AI-assistable) description, up to 10 source links (auto-detected kind + best-effort OpenGraph/oEmbed title), and a project tag (user color, auto-contrast text) that tasks carry. From a project you can draft a markdown plan (one-shot Claude call) and turn checked items into tasks. One project per task via a nullable `tasks.projectId`. Branch: `feature/projects`.

- [x] `shared`: `project.ts` (zod schemas + `MAX_SOURCES_PER_PROJECT`/`MAX_TAG_LENGTH`), `color.ts` (WCAG contrast → readable text), `source.ts` (`detectSourceKind`), `plan.ts` (checklist parse/serialize), `task.ts` +`projectId`
- [x] `gateway`: `projects` + `project_sources` tables, `tasks.project_id` (+ migration `0001_cheerful_argent`); `projects` module (controller/service/repository), `lib/opengraph.ts` (SSRF-guarded fetch + YouTube oEmbed), AI prompts; `AnthropicService.getPlanModel()`; `TasksService.createForProject`; `tasks?projectId=` filter
- [x] `web`: `/projects` page (grid/list toggle), create/edit modal (AI description, color picker, sources), `ProjectTag`, `SourceIcon`, plan panel (draft → interactive checklist → create tasks), board cards show the project tag
- [x] Tests: shared (color/source/plan) + gateway (opengraph/service/repository incl. `:memory:` migration) — 35 passing; `:typecheck`, `web build`, and a live REST E2E (create/limit/validation/oEmbed/create-tasks/filter/delete-unlinks) all green
- [ ] Follow-ups: CLI commands; spawn agents/sessions from project tasks; extract source-doc contents for richer plans

---

## 2026-05-28 — Phase 0 scaffold

Initial empty monorepo skeleton based on [`docs/INITIAL_PLAN.md`](../docs/INITIAL_PLAN.md). Stack overrides confirmed: Nest.js (Fastify adapter) for the gateway, Next.js App Router for the web.

- [x] Workspace root: `.prototools`, `.moon/{workspace,toolchain,tasks}.yml`, `pnpm-workspace.yaml`, root `package.json`, `tsconfig.base.json`, `.gitignore`, `.editorconfig`
- [x] `midnite.json` sample config
- [x] `knowledge/` placeholder folder
- [x] `packages/shared` — zod config schema (`config.ts`), task types (`task.ts`)
- [x] `packages/gateway` — Nest.js + Fastify adapter, `/health` controller, drizzle dir placeholder
- [x] `packages/cli` — commander program with `add` / `list` / `move` / `serve` stubs
- [x] `packages/web` — Next.js App Router with placeholder kanban layout (5 columns)
- [x] `todo/` tracker folder
- [x] `CLAUDE.md` brief

> Verification (`pnpm install`, `moon run gateway:dev`, `moon run web:dev`, `node packages/cli/dist/index.js add hello`) is the next implementer's responsibility — see [phase-0-scaffold.md](phase-0-scaffold.md) for the unchecked verification items.

## 2026-06-11 — Memory page (markdown knowledge entries)

A dedicated Memory page (brain icon in the sidenav) for organising knowledge bases — markdown entries that are either global or scoped to a project. Distinct from sources (links): memories are authored content, edited in place.

- [x] `shared/src/memory.ts` — `MemorySchema` (`projectId: null` = global), create/update request schemas, response schemas
- [x] Gateway `memories` table (+`0009_memories` migration) and `memories/` module: repository → service → controller (`GET/POST /memories`, `PATCH/DELETE /memories/:id`), service tests
- [x] Web `/memory` page: search (`?q=`), scope filter pills (`?scope=` — Global + projects holding memories), grid/list toggle (persisted), New button
- [x] `MemoryCard` (grid/list) with scope chip + excerpt; `MemoryModal` detail view: title, scope select, markdown editor, save/delete with confirm
- [x] Verified: typecheck + tests green; live CRUD smoke against a throwaway gateway (create global/scoped, 400 on missing title, partial patch, null re-scope, delete, 404)
