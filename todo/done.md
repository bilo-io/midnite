# Completed work

Append new entries at the **top**. Each entry: one heading with the date, a short summary, and the tickbox list of what landed.

---

## 2026-06-20 — Phase 9 office A1 re-theme: Agent pool + Communal area (PR #20)

Re-themed the two bottom rooms so the Pool (G) and Communal (E) themes have named, fittingly-coloured rooms to build on.

- [x] Renamed `RoomId`s — **lounge → pool**, **kitchen → communal** (`layout.ts`); `ROOMS` labels now **AGENT POOL** / **COMMUNAL**.
- [x] Re-paletted in `ROOM_STYLES` (`theme.ts`): pool → tiled-aqua floor + cyan accent; communal → cosy warm floor + orange accent. All six room accents now read distinctly (work blue · board sky · library amber · pool cyan · communal orange · corner green), still translucent over the light/dark base.
- [x] **Seam only** — the pool basin/animated water/swims (G1–G3) and communal couches/astro-turf + relocated super-sized TV/PlayStation + retro-games menu (E2–E4) furnish those rooms in their own slices; coffee break (E1) still works in the communal area. `layout.test.ts` green; verified `web:typecheck --force` + `web:lint`; `moon ci` green on PR #20.

## 2026-06-20 — Phase 9 office A1: multi-room floor plan (PR #19)

Turned `/office` from a single room into a six-room walled floor plan — the foundational seam the rest of Phase 9 builds on.

- [x] **A1 — room model**: replaced the single `LAYOUT` grid with a 34×22 multi-room plan (`layout.ts`) — a 3×2 arrangement (work · board · library over lounge · kitchen · corner office) connected by 2-tile doorways in every shared wall, so the whole map stays one connected walkable space. New `ROOMS` describes each room's interior rect + label. `dimensions.ts` bumped to 34×22.
- [x] **Per-room palette**: `ROOM_STYLES` in `theme.ts` — a translucent floor accent over the theme-driven base (light/dark still shows through) + an accent-coloured label per room, so each room reads as a distinct space.
- [x] Added bookshelf + door textures; built the **library** (bookshelves + reading chair) and a **corner-office door**; repositioned the existing desks/lounge/kitchen/board fixtures into their rooms. Agent A* pathfinding routes through the doorways unchanged.
- [x] `layout.test.ts` (4 tests) asserts the grid invariants and that **every room is reachable from the spawn** (no walled-off pockets). Verified `web:typecheck` (`--force`, to dodge moon's stale typecheck cache), `web:lint`, `web:build`, `web:build-storybook` green; `moon ci` green on PR #19.
- Note: deferred to later Phase 9 slices — camera-follow for the bigger map (**A2**), the searchable library modal (**C**, anchor `BOOKSHELF_POS` ready), the corner-office scene + desk toys (**F**), and per-room decor variety (**B2**).

## 2026-06-20 — Phase 9 office E1: kitchen coffee break (PR #18)

Added a kitchenette to `/office` and a personal "on a break" toggle.

- [x] **E1 — coffee break**: a kitchenette nook in the lounge's bottom-left corner — a **counter** + **stool** (new procedural textures in `textures.ts`) beside the existing **coffee machine**, plus a `KITCHEN` zone label (`layout.ts`). All decor (no colliders).
- [x] The coffee machine is **interactable**: walk up + press **E** toggles an "on a break" state, mirroring the board-room `nearBoard`/`openBoard` proximity+interact pattern (`nearKitchen` → `toggleBreak`). The HUD shows a `☕ On a break` badge + a *take a break / get back to work* prompt; a `☕` floats over the player while on a break.
- [x] State on `office-store.ts`: `onBreak`/`toggleBreak`, `nearKitchen`/`setNearKitchen`. Per Decisions §5 the flag is **mock/local** to the session; `reset()` leaves `onBreak` alone (personal presence flag, not transient scene state). Covered by `office-store.test.ts` (3 tests).
- [x] Verified: `web:typecheck` / `web:lint` green; store test passes from the primary checkout; `moon ci` green on PR #18.
- Note: a standalone walled kitchen **room** comes with the multi-room layout (A1) — this is the corner-nook version that ships independently of it.

## 2026-06-20 — Phase 9 office D1: board room → projects hub (PR #17)

Repurposed the `/office` board room from a static documents whiteboard (Phase 8 D3) into the **live projects hub**, the highest-utility office interaction.

- [x] **D1 — projects in the board room**: `boardroom-panel.tsx` now lists active projects (`getProjects`) — each row shows the project tag, name, and task count. Clicking one opens the existing `project-modal.tsx` **as-is**, portalled over the office (`<body>`, escaping the stage's `overflow-hidden` / page-reveal transform), so the URL stays `/office`. Plans, sources, tasks, and the project's memory are all reachable without leaving the room. Escape from a project returns to the list; Escape from the list returns to the room.
- [x] The project modal subsumes the old per-project document browser (its Plan tab + memory link cover what the whiteboard showed), so `documents.ts`, `documents.test.ts`, and `document-modal.tsx` were removed and replaced by a small, tested `lib/office/projects.ts` (`boardroomProjects` → active + alphabetised) seam.
- [x] `nearBoard`/`openBoard`/`boardOpen` scene+store flow unchanged; web-only, no gateway/shared changes. README updated.
- [x] Verified: `web:typecheck` / `web:lint` green; `projects.test.ts` (2 tests) pass from the primary checkout; `moon ci` green on PR #17.

## 2026-06-20 — Phase 8 office: idle sleep/game (C1), click-to-walk (D2), coffee corner (A3)

Rounded out the achievable rest of Phase 8 (remaining open items need external assets, new session data, or are out of scope).

- [x] **C1 — idle agents sleep or game**: idle lounge agents split deterministically by id (`isGamer`) — sleepers show an animated `z`/`zz`/`zzz` (timer-driven `tickIdleBubbles`/`setActivity`), gamers show `▶` and face the TV. Closes the original "sleep or game" lounge ask.
- [x] **D2 — click-to-walk**: clicking the floor pathfinds the player there, reusing the A* (`findPath` gained an `openEnds` flag so the player can't end on furniture) + a velocity-steered waypoint follower in `movePlayer`. Manual WASD cancels it; a deadline aborts if it's nudged into furniture (`onPointerDown`/`nearestOpenTile`).
- [x] **A3 — coffee corner**: a procedural coffee-station texture in the lounge corner (pure decor).
- [x] Verified: `web:typecheck` / `web:build` (`/office` 4.6 kB) / `web:test` (42 pass).
- Note: B2 day/night is effectively covered (the office already follows the `time` theme via `resolved`); C2 per-tool glow is blocked (no current-tool field on `SessionSummary`); A1 (external pack) + E (multiplayer) remain out of scope.

## 2026-06-20 — Phase 8 office C3: grid pathfinding for agent movement

Agents now route around walls + furniture when they walk between the lounge and a hot desk (previously a straight-line tween that could clip).

- [x] `blockedGrid()` (`lib/office/layout.ts`, Phaser-free): walkability grid = walls + furniture; seat tiles are blocked but the start/goal seat is special-cased so an agent leaves its couch and steps onto its desk without cutting through anything between.
- [x] 4-directional A* + waypoint tween chain in `office-scene.ts` (`findPath`/`tileOf`/`faceActor`, rewritten `walkActor`): per-segment walk facing/animation; degrades to a direct tween if a path isn't found.
- [x] Verified: `web:typecheck` / `web:build` (`/office` 4.6 kB) / `web:test` (42 pass).

## 2026-06-20 — Phase 8 office D1: wire desk Call/Messages to the gateway

Finished the last "still mock" piece of `/office`. Walking up to a desk agent now opens real session views, reusing the Sessions-page modals.

- [x] **Call** → live session terminal (`SessionTerminalModal`), enabled while the session is running/waiting; **Messages** → transcript (`SessionTranscriptModal`, fetched via `getSessionTranscript`). `OfficeAgent` now carries its `SessionSummary` (`agents.ts`); `office-hud.tsx` drops the mock call-ring/textarea. Transcript modal portalled to `<body>` so the stage's `overflow-hidden` / a persisted page-reveal transform can't clip it.
- [x] No one-off "send prompt" gateway API exists — the terminal is the live channel, so Call opens it.
- [x] Verified: `web:typecheck` / `web:build` (`/office` 4.6 kB) / `web:test` (42 pass).

## 2026-06-20 — Phase 8 office: zones (lounge / hot desks / board room), robot agents, document viewer

Turned `/office` into a zoned, lived-in room. The left half is open-plan **hot desks** (work) over a **lounge** (TV + gaming console + couches); the right half is a walled **board room**. Agents are now little **robots**; the human player roams. Boardroom decision: a project's "documents" = its `plan` + memories scoped to it (rendered read-only via the app's `MarkdownPreview`).

- [x] **Zones + floor plan** (`lib/office/layout.ts`, Phaser-free): 24×16 room, partition wall + doorway, desk/lounge seat positions, furniture/label/board anchors, rugs, plants.
- [x] **Actor model + movement** (`office-scene.ts`): working agents (`status !== 'idle'`) sit at hot desks (interactable); idle agents chill on lounge couches/armchairs. On a status flip the robot **walks** (tweened + walk animation) lounge ↔ desk. Furniture (desks, couches, TV, console, conference table) are static colliders; doorway is passable.
- [x] **Higher-fidelity characters** (`lib/office/textures.ts`): 16×20 (was 12×15), two kinds — a **human** player and **robot** agents (antenna, visor + glowing eyes, chest panel/light), down/up/side × 2 walk frames. Plus couch/armchair/TV/console/table/whiteboard/plant textures.
- [x] **Board room** (`boardroom-panel.tsx` + `document-modal.tsx` + `lib/office/documents.ts`): walk up to the whiteboard (E) → panel with a **project filter** (`Select`) listing that project's plan + scoped memories; click → read-only `MarkdownPreview` modal. Fetches `getProjects` + `getMemories` via `useApiData`.
- [x] **Store + HUD**: `office-store.ts` gains `nearBoard`/`boardOpen` (+ freeze input while any panel is open); HUD shows a board prompt and renders `<BoardroomPanel>`.
- [x] Grid bumped to 24×16 (aspect follows via `OFFICE_ASPECT`).
- [x] Verified: `web:typecheck` / `web:build` (`/office` 4.6 kB, Phaser in its dynamic chunk) / `web:test` (42 pass, incl. 4 new `boardroomDocs` tests).
- [ ] **Still deferred**: wire Call/Message → gateway; grid pathfinding (walk uses straight-line tweens through the doorway region); external Tiled/LimeZu pack.

## 2026-06-20 — Phase 8 office fidelity: procedural pixel-art sprites, presence, layout

Executed the achievable slice of [phase-8](phase-8-office-fidelity.md) on `main`. Rather than block on a paid asset pack (LimeZu) + Tiled authoring, the fidelity jump is done **procedurally** — sprites/tiles generated in code — which is deterministic, themeable, and zero-licensing; the external Tiled/LimeZu route stays open as a later upgrade.

- [x] **Procedural pixel-art** (`lib/office/textures.ts`): generated textures for a tiled floor, brick walls, wooden desks/monitors/chairs, and character sprites (down/up/side, 2-frame walk cycle). Idempotent (`exists()`-guarded) so a StrictMode/HMR remount can't double-register a key. Tiles drawn neutral and tinted to the theme palette.
- [x] **Sprites replace blobs** (A2): `office-scene.ts` rewritten — player is a `Sprite` that walks + flips via `walkAnim`; agents sit behind their desks. Per-agent identity tint (`agentTint`) for variety; player has its own tint. All Milestone-1 movement/proximity/store-bridge/teardown logic preserved.
- [x] **Presence** (C1): per-agent status speech bubble (`···`/`?`/`z`/`✓`) coloured by the shared status tint, gently bobbing.
- [x] **Polish** (B2): soft drop-shadows under characters/desks + a radial vignette (`buildVignette`, generated canvas texture).
- [x] **Fixed-aspect-ratio layout** (B3): `OFFICE_ASPECT` (new Phaser-free `lib/office/dimensions.ts`) drives a full-width CSS `aspect-ratio` box; the canvas + HUD scale together and the page scrolls when it overflows the viewport (no more `vh` clamp).
- [x] Trimmed `theme.ts` to the palette fields still used (decorative colours now baked into textures).
- [x] Verified: `web:typecheck` / `web:build` (23 static pages; `/office` 3.35 kB, Phaser in its dynamic chunk) / `web:test` (38 pass) all green.
- [ ] **Deferred** (with reasons in phase-8): D1 wire Call/Message → gateway (separate API/transcript work, deserves its own tested change); C2 per-tool glow (needs a current-tool field on the session); C3 pathfinding/wander/sub-agents; A1 external Tiled/LimeZu pack; B2 day/night + camera zoom/scroll; Theme E multiplayer.

## 2026-06-20 — Office theme-aware colours + Phase 8 roadmap

The [`/office`](../packages/web/components/office/README.md) Phaser canvas hardcoded a dark palette, so it stayed dark on the light theme while the rest of the app flipped. Made the structural colours + labels follow the app's light/dark tokens, and captured the larger fidelity roadmap in [phase-8](phase-8-office-fidelity.md).

- [x] **Theme-aware office** (`feature/office-theme-colors`): `lib/office/theme.ts` `buildOfficePalette()` reads the CSS design tokens (`--background`/`--muted`/`--border`/`--secondary`/`--foreground`) into Phaser ints (reusing the now-exported `hslTripletToInt`); `office-scene.ts` gains `applyPalette()` + tracks recolourable objects; `office-game.tsx` re-applies on `useTheme()` change. Decorative colours (desk/screen/avatar/highlight) + status tints stay fixed.
- [x] **Phase 8 doc** ([phase-8-office-fidelity.md](phase-8-office-fidelity.md)): real sprites via Tiled + LimeZu/Kenney (replace the blobs), walk animations, status-driven liveliness, and wiring Call/Message to the gateway.

## 2026-06-19 — Phase 7 remaining items (hardening, widgets, Theme D, tags)

Implemented the rest of [phase-7](phase-7-hardening-reports-widgets.md) directly on `main`, committed feature-by-feature (the working tree was being edited concurrently, so each commit is scoped to its own files). Phase 7 is now essentially complete; deferred items are listed in the phase doc.

- [x] **A6 — task.* WebSocket broadcast** (`e2b9b73`): `TaskEventBus` + `TasksGateway` (`/ws/tasks`) emit a `TaskBoardEvent` on every transition; web `useTaskEvents` invalidates the cache (polling kept as fallback). Mirrors the workflow gateway. +9 tests.
- [x] **Shipped widget** (`33d3380`): dashboard widget listing recent done tasks with their PR links.
- [x] **Notifications** (`7384897`): opt-in desktop notifications on `→waiting`/`→done`, driven off the A6 event stream (web Notification API; works in Electron). Settings toggle requests permission.
- [x] **A4 durability** (`05acd6d`): `synchronous=NORMAL` + `busy_timeout` WAL pragmas; `POST /admin/backup` (SQLite online backup + uploads copy) via `SQLITE_TOKEN`. +2 tests, boot-smoked.
- [x] **⌘K command palette** (`0fad41c`): navigation switcher across enabled surfaces, mounted in the (main) layout.
- [x] **A3 web tests** (`e3ad2f2`): stood up Vitest + RTL + jsdom + a `test` task (now in `moon ci`); seeded dashboard-widgets / task-events / use-local-storage (9 tests).
- [x] **Tags + saved filters** (`d31cc00` data, `cdee3ec` UI): `tags` column (migration 0025) + `PATCH /tasks/:id/tags` (normalised) + card chips + modal editor + a board tag filter via the `tags` query param (shareable saved view).
- [x] Verified per feature: `:typecheck`/`:lint` green, gateway tests 335, web tests 9, web build 19/19; A4 + earlier hardening boot-smoked.

## 2026-06-19 — Phase 7 Theme B: councils report export (Markdown + PDF)

A reusable report-export framework, with a council run as the first consumer. Markdown is built server-side by a pure serializer; PDF is rendered client-side via print-to-PDF (no puppeteer/jsPDF, per the locked decision). Built in an isolated worktree, reviewed, and merged to `main`. (Paired with the Phase 7 Theme A hardening entry further down — both landed this day.)

- [x] `shared/src/report.ts` — `ReportFormat` enum + server/client-rendered split helpers (`SERVER_RENDERED_REPORT_FORMATS`, `isServerRenderedReportFormat`, `REPORT_CONTENT_TYPE`), reused by the export controller, the API client, and the web `ExportMenu`
- [x] Gateway: pure `buildCouncilRunReport()` (`councils/lib/council-report.ts`) — **format-aware** across the unified council formats, de-anonymizes A/B/C syntheses via the entry `labelMap`, archives non-active per-format syntheses; `GET /councils/:id/runs/:runId/export?format=md` (text/markdown attachment; `pdf`/unknown → 400; missing council/run → 404)
- [x] Web: reusable `ExportMenu` (Copy Markdown · Download .md · Download PDF) on the council run view; PDF via an isolated print container + `window.print()` (works in browser and Electron)
- [x] Electron one-click `printToPDF()` bridge deferred (window.print already yields a PDF in the desktop app) — `TODO(desktop)` left in `export-menu.tsx`
- [x] 17 new tests (14 gateway builder + 3 shared); after merge to main: `moon run :typecheck`, `:lint` (0 errors), `gateway:test` (327), and `web:build` all green

## 2026-06-19 — Plan reconciliation (trackers ↔ reality)

Audited [`docs/INITIAL_PLAN.md`](../docs/INITIAL_PLAN.md) (Phases 1–5) against the actual codebase and brought the stale `todo/` checklists in line with what shipped. No code changed — docs only.

- [x] **Phases 1–3 essentially complete; the project has gone well beyond the plan** (Projects, Memory, Councils, Brainstorms, Phase-6 Workflows, marketing `site`, Electron `desktop`, multi-provider LLM). Stack overrides (Nest+Fastify, Next.js App Router) confirmed intentional.
- [x] Updated [phase-0](phase-0-scaffold.md) → [phase-5](phase-5-polish.md) checkboxes with per-item status + deviation annotations; resolved all three [open-decisions.md](open-decisions.md) (waiting holds slot · pty-first · standalone repo).
- [x] Recorded the genuine remaining gaps from the written plan, with scoping, in new [outstanding.md](outstanding.md):
  - Phase 1/3: **no `task.*` WebSocket broadcast** — live updates are polling + cache invalidation, not event-driven (and no TanStack Query)
  - Phase 4 (**inference, biggest gap**): no bulk/paste add, URL/GitHub context fetch, repo guessing, or inline question answers; **no chokidar knowledge-dir watcher** — KB is user-added source URLs, not watched MD-file content
  - Phase 5: no `tmux`/`warp`/`iterm` spawners (no `Spawner` interface; `terminal.mode` is unread), no per-repo concurrency caps, no per-repo branch-naming / PR-template injection
- [x] Confirmed shipped Phase-5 items: priorities, crash retries, eslint+prettier, `moon ci`, 270+ gateway tests.

## 2026-06-19 — Manual task kickoff (Start button + drag-to-WIP)

A task could only reach `wip` (with a linked Claude Code session) via the autonomous scheduler, which is off by default — and `PATCH /tasks/:id/status` only moved the column without spawning anything. Added an explicit on-demand kickoff that reuses the existing runner, so a user can start a task themselves regardless of `agent.poolEnabled`.

- [x] Gateway `POST /tasks/:id/start` in `pool.controller.ts` — guards (startable only from `todo`/`backlog`, 409 if already slotted), delegates to `AgentRunnerService.start`, 409 on `no free agent slot`. New `pool.controller.test.ts` (6 cases).
- [x] Web `lib/api.ts` `startTask(id)`; `task-thread-modal.tsx` gains a **Start** button (todo/backlog) beside Abandon.
- [x] `board-view.tsx` rebuilt on `@dnd-kit`: draggable cards + droppable columns; drop into *In progress* from todo/backlog (and a hover **Start** button on those cards) routes through `startTask`, every other move stays `updateTaskStatus`. `tasks-view.tsx` owns the optimistic `onMove` (rollback + error banner, e.g. "no free agent slot").
- [x] README Configuration: documented the autonomous (`agent.poolEnabled`) vs manual (`/tasks/:id/start`) paths to `wip`.
- [x] `:typecheck` + `:lint` green; gateway tests 270 passing.

## 2026-06-18 — Multi-provider agents + provider-agnostic LLM wrapper

The Agents page now lists every coding agent as a collapsed accordion with per-agent **CLI** and **API** tabs, and the gateway's own AI calls run through a provider abstraction so any of Anthropic / OpenAI / Google Gemini / an OpenAI-compatible endpoint can power them.

- [x] `shared/src/llm.ts` — `LlmProvider` enum, masked `ProviderCredential` (+ update/active requests, response envelopes), `CLI_PROVIDER_MAP`; `AgentCliStatusListResponse`; widened `AgentConfig.provider` (legacy `'claude'` → `'anthropic'` via preprocess)
- [x] Gateway `agent/llm/`: `LlmProviderAdapter` interface, `LlmService` (active-provider dispatch, `reload()` on change, env/Keychain fallback), four adapters (Anthropic tool-use; OpenAI json_schema; Gemini + openai-compatible JSON-mode via `json-output.ts`); `llm_providers`/`llm_settings` tables (`0019` migration) + `ProviderCredentialsRepository`
- [x] Migrated every internal call site off `AnthropicService` → `LlmService` (classifier, planner, project enhance/draft-plan, heartbeat, ping, workflow `ai.claude` node); deleted `anthropic.service.ts`
- [x] Endpoints: `GET /agents/cli/statuses`, `GET /providers`, `PUT /providers/:provider`, `PUT /providers/active` (keys write-only, returned masked as `hasKey` + last-4)
- [x] Web: `ui/tabs.tsx`, `agent-card.tsx` (per-CLI accordion, CLI + API tabs), Agents page rebuilt (per-agent rows; Primary Agent gains CLI/API routing selectors); api client `getCliStatuses`/`getProviders`/`updateProvider`/`setActiveProvider`
- [x] Tests (257 gateway, +15): json-output parser, providers masked round-trip, adapter enabled-wiring, migrated-service fakes; README AI-providers section
- [x] Verified live against a throwaway gateway: providers list/upsert/activate, masked key (no raw-key leak), all CLI statuses, ping routed to the active provider (real OpenAI 401 with a fake key)

## 2026-06-18 — Windows/Linux desktop builds + tagged release workflow

Extends desktop packaging to all three OSes and automates publishing, so the `/download` page's Windows & Linux buttons become real (they were "Coming soon"). The Electron main process was already portable (`paths.ts` → `app.getPath`), so this is pipeline-only.

- [x] `desktop/electron-builder.yml` — global `artifactName: ${productName}-${version}-${arch}.${ext}` (predictable cross-OS names); added `win` (nsis, x64) + `linux` (AppImage, x64) targets
- [x] `.github/workflows/release.yml` — on `v*` tag: 4-OS matrix (macos-14/13, windows, ubuntu; `fail-fast: false`) → proto/pnpm install (Electron binary downloaded) → gateway+web build → `desktop run stage` (deploy + electron-rebuild per arch) → `electron-builder <os>` → upload-artifact; a `release` job downloads all and creates a **draft** GitHub Release (review gate before buttons go live)
- [x] `site/lib/downloads.ts` — Windows + Linux flipped to `available` with x64 asset names matching electron-builder
- [x] `desktop/package.json` `package:win`/`package:linux` scripts; README "Distribution" rewritten for the tag→workflow flow
- [x] Verified locally: `site:typecheck`+`lint`+`build` green; Playwright drive confirms win/linux now render real `-x64.exe` / `-x64.AppImage` download links (no longer "Coming soon"); workflow YAML reviewed. **Cross-OS builds unverified here** — validated by the first `v0.0.0` tag (CI); win/linux best-effort (icons/native-rebuild may need follow-up)

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

## 2026-06-19 — Brainstorms (multi-agent ideation page)

A divergent sibling of Councils: contributors each generate ideas through a fixed *lens*, then a synthesizer distills the **attributed** ideas in a **switchable mode** (shortlist · gaps · opportunities · critique · combine). The same captured ideas can be re-synthesized in another mode without re-running generation.

- [x] `shared/src/brainstorm.ts` — Brainstorm/Contributor/Run zod contracts (provider = `AgentCli`, run-contributor snapshots, **no anonymization label**), `BrainstormSynthMode` enum + labels, `StartBrainstormRunRequest{prompt,mode}` + `RetryBrainstormSynthesisRequest{mode}`, `brainstorms.runTimeoutMs` config
- [x] Lifted `oneshot-command` + `clean-output` from `councils/lib/` to `terminal/lib/` (shared by both runners); updated Council's two imports
- [x] Gateway `brainstorms/` module (+`0021_brainstorms` migration, 4 tables): CRUD + run routes; `BrainstormRunnerService` spawns per-contributor one-shot CLIs in managed PTYs, then runs the synthesizer over attributed ideas in the run's mode; `retrySynthesis(mode)` re-distills captured ideas (mode switch / provider escape hatch) without respawning contributors; ≥1 contributor; stale runs failed on restart
- [x] Web `/brainstorms` list (grid/list/table, bulk archive/delete, `?q=`, create modal) and `/brainstorms/view?id=`: contributors side panel (debounced saves, provider + lens, synthesizer provider + default mode), prompt composer with mode picker, per-contributor live terminal tabs + Synthesis tab (markdown) with a **re-synthesize-in-mode** control, run thread; auto-registered in nav + Settings → Features via `lib/features.ts` (lucide `Brain` icon)
- [x] Starter lenses (First Principles · Contrarian · Customer/JTBD · Moonshot) seeded on create as editable contributors, so a fresh board is immediately useful (`BRAINSTORM_STARTER_LENSES` in shared, seeded in the service)
- [x] Per-mode synthesis archive: each run keeps one synthesis per mode (`syntheses` JSON, +`0022` migration), so re-synthesizing in a new mode accumulates rather than overwriting — the web Synthesis tab shows mode chips to switch between e.g. Shortlist and Gap analysis
- [x] Verified: full `:typecheck`/`:lint`/`:test`/`:build` green (10 shared + 12 gateway brainstorm tests, incl. synthesize / fail-on-no-ideas / mode-switch re-synthesis reusing ideas + accumulating the archive / starter-lens seeding); live REST smoke against a throwaway gateway (seeded contributors, defaults, patch, 400 empty prompt / bad mode, 404 unknown; `0021`+`0022` migrations apply on boot)

## 2026-06-19 — Phase 7 Theme A substrate: encrypt provider keys + LLM usage/cost

**A1 — Provider API keys encrypted at rest (fail-closed).** Replaced the old `key-cipher` (`MIDNITE_PROVIDER_KEY`, plaintext pass-through) with a `gateway/src/crypto/` module (`CryptoService`, AES-256-GCM).

- [x] `CryptoService` — env key **`MIDNITE_SECRET_KEY`** (32 bytes hex/base64); per-value random 12-byte IV; self-describing format `v1:<base64(iv|tag|ct)>`. **Fail-closed**: no key ⇒ encrypted values undecryptable (provider reads as no key / disabled) and writes throw `SecretEncryptionUnavailableError`. Legacy plaintext read as-is + **re-encrypted in place** on next write and via a one-time startup pass.
- [x] `provider-credentials.repository.ts` encrypts on write / decrypts on read; masked `hasKey`+last4 unchanged (computed from decrypted value). `ProvidersService` maps the fail-closed error → 400. Global `CryptoModule`. Deleted `key-cipher.{ts,test.ts}`.
- [x] Tests: crypto round-trip / fail-closed write+read / legacy upgrade; repo `:memory:` integration (encrypted-at-rest, startup upgrade, disabled-without-key).

**A2 — LLM usage & cost accounting (track + soft-warn only).**

- [x] `shared/src/usage.ts` — `LlmFeature` union, usage record / summary / bucket / budget-warning schemas, `UsageConfigSchema` (`dailyBudgetUsd`/`monthlyBudgetUsd`/`warnAtRatio`) defaulted onto `MidniteConfigSchema` (existing configs stay valid).
- [x] Gateway `llm_usage` table (migration **`0024_llm_usage`**, `at`+`feature` indexes) + `usage/` module (repo→service→controller); `GET /usage/summary?from=&to=&groupBy=` returns totals + by day/provider/feature + soft-warn entries (advisory; **never blocks**). Testable static price table (`usage/lib/pricing.ts`).
- [x] Adapter interface carries `usage{inputTokens,outputTokens}`; Anthropic/OpenAI/Gemini adapters wired (openai-compatible inherits). `LlmService` records one row per call with an optional `feature` arg (default `unknown`). Tagged call sites: classifier→`classifier`, planner→`planner`, projects→`project`, heartbeat→`agent`, workflow ai-node→`workflow`. Councils run via spawned CLI sessions (not `LlmService`) → not tracked.
- [x] Web: `getUsageSummary()` client fn + dashboard **LLM cost & usage** widget (spend by day/provider/feature + soft-warn banner) registered in the widget registry/grid.
- [x] Verified after review + merge to `main`: gateway tests **327 pass** (incl. 0024 on `:memory:`), shared 71 pass, `moon run :typecheck`/`:lint` (0 errors)/`web:build` green; an isolated gateway boot smoke confirmed the crypto + usage modules wire up and `/usage/summary` + masked `/providers` respond.
