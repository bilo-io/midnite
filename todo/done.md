# Completed work

Append new entries at the **top**. Each entry: one heading with the date, a short summary, and the tickbox list of what landed.

---

## 2026-06-18 — Dedicated /download page with platform detection (site)

A standalone `/download` page on the marketing site that detects the visitor's OS and features the matching desktop (Electron) build, while listing every platform so nobody is locked in. macOS (Apple Silicon + Intel) are real download buttons; Windows & Linux show as disabled "Coming soon" until those builds ship (electron-builder is macOS-only today — unchanged here).

- [x] `site/lib/downloads.ts` — typed `DownloadTarget` manifest (single source of truth) + `DESKTOP_VERSION` + `assetUrl()` (`releases/latest/download/<asset>`)
- [x] `site/lib/platform.ts` — pure `detectPlatform(ua, uaPlatform)` (UA Client Hints → UA-string fallback)
- [x] `site/components/download-picker.tsx` — `'use client'`; detected-platform featured card (mac → Apple Silicon primary + Intel) over an all-platforms list; carries the unsigned-macOS `xattr` note
- [x] `site/app/download/page.tsx` — Nav + `.bg-grid` backdrop + `Reveal` + picker + Footer; route metadata
- [x] `site/components/nav.tsx` — "Download" now routes to `/download` (Next `Link` for path links); homepage `download.tsx` keeps its section + gains an "All platforms →" link
- [x] Verified: `site:typecheck` + `site:lint` + `site:build` green; 11-assertion Playwright drive (mac/windows/linux detection via stubbed `userAgentData`, mac arm64 asset href, win/linux "Coming soon", not-locked-in, nav + homepage links → /download); macOS view screenshotted

## 2026-06-18 — Task priorities + crash retries

Tasks now carry a **priority** (0 Low · 1 Normal · 2 High · 3 Urgent) that the scheduler honours (highest-priority `todo` first, oldest-first within a priority), and an agent **retry cap** that bounds the previously-unbounded crash→requeue loop.

- [x] `shared`: `TaskSchema` gains `priority` (0..3, default 1) + `retryCount`; `CreateTaskRequestSchema` gains optional `priority`; `AgentConfigSchema.maxRetries` (default 3)
- [x] `gateway/db`: `priority`/`retry_count` columns + `tasks_status_priority_idx` (migration `0018`, additive/forward-only)
- [x] `gateway/tasks`: `listTasks` orders `priority DESC, createdAt ASC`; `incrementRetry`; service `retry()` transition (bumps count → todo) distinct from transient `requeue`; priority stored on create (clamped)
- [x] `gateway/pool`: `agent-runner` onExit now retries up to `maxRetries` then abandons (was an uncapped requeue); timeouts/manual-cancel stay terminal
- [x] `web`: priority selector in the new-task modal; Low/High/Urgent badge on task cards (Normal unmarked)
- [x] Tests: repo priority-ordering + `incrementRetry` (`:memory:` SQLite); service priority-on-create + `retry`; runner retry-under-cap + exhausted→abandoned. Full `:typecheck` + `:test` (241 gateway) + gateway/web builds green

The left nav can now expand to show labels and be locked open or closed. Default is unchanged (collapsed icon bar). Driven by one new `navMode` field on `AppSettings`, shared between the nav and the settings page via the existing `useLocalStorage`.

- [x] `web/lib/app-settings.ts` — `NavMode = 'auto' | 'expanded' | 'collapsed'`, `navMode` on `AppSettings` (default `'auto'`), `NAV_W_COLLAPSED`/`NAV_W_EXPANDED` constants
- [x] `web/components/nav-bar.tsx` — `auto` overlay-expands on hover **and** keyboard focus-within (no content reflow); `expanded`/`collapsed` lock states; pin/unpin button in the expanded header; labels replace tooltips when expanded; an effect mirrors locked-open width into the `--nav-offset` CSS var. Collapsed rendering left identical to before
- [x] `web/app/(main)/layout.tsx` + `globals.css` — `<main>` padding driven by `var(--nav-offset)` (default `3.5rem`) with a `transition-[padding]`; keeps the layout a server component (no client conversion)
- [x] `web/app/(main)/settings/settings-view.tsx` — new **Navigation** card with an Auto / Locked open / Locked closed segmented radio control
- [x] Verified: `web:typecheck` + `web:build` green; 17-assertion Playwright drive-through (default collapsed, hover overlay without reflow, pin-to-lock + reload persistence, settings lock open/closed/auto round-trip) all green

A stylized **Finances** card: add income and expense line-items, toggle list⇄totals, and see the leftover (income − expenses). First **multi-instance** widget — you can place several (e.g. "Fixed costs" vs "Holiday budget"), each with its own editable title and data.

- [x] `web/lib/dashboard-widgets.ts` — `FinanceEntry`/`FinanceConfig` types, `finances` registry entry (Wallet icon, `mediumSizes`), `MULTI_INSTANCE` set so the catalogue keeps offering it once placed; `newInstance('finances')` mints a `crypto.randomUUID()` id; `sizeForKey` maps the `finances-` prefix
- [x] `web/components/finances-widget.tsx` — editable-list card (modelled on `links-widget`): per-card title, income/expense editors, list vs totals view, leftover line coloured by sign, amounts via `Intl.NumberFormat` (no symbol)
- [x] `web/components/dashboard-grid.tsx` — fan-out to `finances-<id>` grid keys (mirroring `proj-N`); id-keyed render/update/remove/label branches; layout reconcile handles add/remove automatically
- [x] `web/lib/use-local-storage.ts` — **bug fix exposed by multi-instance**: `set` performed the localStorage write + sync-event dispatch *inside* the React updater; the synchronous dispatch re-entered listeners and (with Strict Mode's double-invoke) appended twice. Now resolves against a `valueRef` and persists outside the updater, keeping it pure. Latent for single-instance widgets (catalogue dedup hid it); duplicate finance ids surfaced it
- [x] Verified: `web:typecheck` + `web:build` green; full Playwright drive-through (add 2 cards → independent titles/data, list⇄totals toggle, leftover math, persistence across reload) all green

## 2026-06-13 — Marketing site (`@midnite/site`)

A standalone Next.js App Router landing page on port **3001**, reusing the web app's design language (HSL token system, conic-gradient accents, grid backdrop, system fonts), with a scroll-driven 3D hero. Independent of the gateway — pure marketing surface, no `@midnite/shared` dependency.

- [x] New `packages/site` package (auto-discovered via `packages/*`): `package.json` (`@midnite/site`), `moon.yml` (dev/build/start/typecheck on :3001), `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`
- [x] Design tokens copied from `packages/web/app/globals.css` (dark-only `<html class="dark">`), plus `.bg-grid`, `.text-gradient`, `.gradient-border` halo, and a scroll `.reveal` keyframe
- [x] React Three Fiber hero (`@react-three/fiber` 9 / `@react-three/drei` 10 / `three` / `@react-three/postprocessing`): custom-GLSL starfield (twinkle + swirl), a geodesic **"orchestration core"** — a smooth fresnel glow sphere inside a slowly-rotating wireframe lattice with glowing nodes — **selective bloom** + vignette + ACES tonemapping; camera pulls back on scroll (core → ambient field) with window-tracked pointer parallax; canvas dynamic-imported `ssr:false`, lazy-loaded out of first-load JS; honours `prefers-reduced-motion`
  - Note: the original morphing noise-displaced orb used additive blending on a closed mesh, which strobed/flickered as it rotated — replaced with the flicker-free geodesic core (single convex glow sphere + clean line/point geometry, normal blending)
- [x] Sections: Hero → How it works (5-step lifecycle) → Features grid (6 cards) → CLI showcase (terminal chrome) → closing CTA + footer; `Reveal` wrapper drives scroll-in via IntersectionObserver
- [x] Verified: `moon run site:typecheck` + `moon run site:build` green; live render confirmed over CDP (16 reveal nodes fire on scroll, WebGL canvas mounts) — hero, how-it-works, features, CLI all screenshotted

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

## 2026-06-11 — Councils (multi-agent debate page)

- [x] `shared/src/council.ts` — Council/Participant/Run zod contracts (provider = `AgentCli`, run-participant snapshots with anonymization `label`), `councils.runTimeoutMs` config
- [x] Gateway `councils/` module (+`0010_councils` migration, 4 tables): CRUD + run routes; `CouncilRunnerService` spawns per-participant one-shot CLIs in managed PTYs, captures/cleans output, shuffles + labels A/B/C before the Claude verdict call (label map persisted for UI de-anonymization); stale runs failed on restart
- [x] `TerminalService.spawnManagedRun` — eager pinned PTYs (no idle reap) with capture/exit hooks; `council-` attach guard; `killManagedRun` that preserves the exit hook; terminal-token mint widened to live managed runs
- [x] Web `/councils` list (grid/list toggle persisted, `?q=`, create modal) and `/councils/[id]`: participants side panel (debounced saves, provider select), free-form topic composer (dictation), per-participant live terminal tabs + Verdict tab (markdown + label legend), run thread; nav link
- [x] Verified: typecheck + tests (incl. runner orchestration: timeout/partial-failure/shuffle-label/restart) + full builds green; merged to main after memories (`0009` → `0010` migration order)
