# todo/ — phase index

> **Scan this file, not every `phase-*.md`.** This is the single roll-up of phase
> progress + which themes are open, in-flight, or done. `/exec` reads this to pick
> work and writes back to it (see [Maintenance](#maintenance)). Only open an
> individual `phase-N-*.md` once you've chosen a candidate phase here.
>
> Ordered **newest-first (descending)** — highest phase number at the top.
> Generated from the 2026-06-26 git report + a 2026-07-01 full theme-key rebuild;
> kept current by `/exec` as themes land.

## Legend

- **Status** — `✅ DONE` · `🔄 WIP` · `◻ TODO`
- **Progress** — 10-cell bar, filled ∝ done/total; the `%` column is the exact figure.
- **Theme columns** — phases are sliced into lettered **themes** (`A`, `B`, `C`, …).
  Each letter appears in exactly one of:
  - **🔄 WIP** — a theme an `/exec` loop has **claimed** and is building right now
    (committed to `main` at pickup so parallel loops skip it). Empty in steady state.
  - **◻ TODO** — themes with open, non-deferred work, free to pick.
  - Themes not listed in either column are **done** (or the phase predates the
    theme convention). `⏳`/`❌` deferred/out-of-scope themes are **not** listed as TODO.
- The **[Theme key](#theme-key-all-phases--status-per-theme)** below lists **every
  phase's themes** with a per-theme status icon + one-liner, so you can get context
  without opening the phase doc.

## Phases

| Phase | Status | Done | Progress | % | 🔄 WIP | ◻ TODO |
|-------|--------|------|----------|---|--------|--------|
| [65 · Memory workspace](phase-65-memory-workspace.md) | ✅ DONE | 33/33 | `██████████` | 100% | — | — |
| [64 · Office presence](phase-64-office-presence.md) | ✅ DONE | 30/30 | `██████████` | 100% | — | — |
| [63 · Office 3D](phase-63-office-3d.md) | ✅ DONE | 28/28 | `██████████` | 100% | — | — |
| [62 · Fable-Digest](phase-62-fable-digest.md) | 🔄 WIP | 24/32 | `████████░░` | 75% | V | — |
| [61 · Fable-Observability](phase-61-fable-observability.md) | ✅ DONE | 36/36 | `██████████` | 100% | — | — |
| [60 · Fable-Analysis](phase-60-fable-analysis.md) | ✅ DONE | 62/62 | `██████████` | 100% | — | — |
| [59 · Chat to board](phase-59-chat-to-board.md) | ✅ DONE | 27/27 | `██████████` | 100% | — | — |
| [58 · Dependency graph & roadmap](phase-58-dependency-graph-roadmap.md) | ✅ DONE | 25/25 | `██████████` | 100% | — | — |
| [57 · Performance & scale](phase-57-performance-scale.md) | ✅ DONE | 27/27 | `██████████` | 100% | — | — |
| [56 · Realtime / WS reliability](phase-56-realtime-ws-reliability.md) | ✅ DONE | 26/26 | `██████████` | 100% | — | — |
| [55 · Projects detail page](phase-55-projects-detail-page.md) | ✅ DONE | 23/23 | `██████████` | 100% | — | — |
| [54 · Runtime & process resilience](phase-54-runtime-process-resilience.md) | ✅ DONE | 26/26 | `██████████` | 100% | — | — |
| [53 · Task lifecycle resilience](phase-53-task-lifecycle-resilience.md) | ✅ DONE | 22/22 | `██████████` | 100% | — | — |
| [52 · In-app diff & PR review](phase-52-in-app-diff-review.md) | ✅ DONE | 25/25 | `██████████` | 100% | — | — |
| [51 · Session detail page](phase-51-session-detail-page.md) | ✅ DONE | 27/27 | `██████████` | 100% | — | — |
| [50 · Autonomy guardrails](phase-50-autonomy-guardrails.md) | ✅ DONE | 29/29 | `██████████` | 100% | — | — |
| [49 · Data portability](phase-49-data-portability.md) | ✅ DONE | 34/34 | `██████████` | 100% | — | — |
| [48 · Slides](phase-48-slides.md) | ✅ DONE | 26/26 | `██████████` | 100% | — | — |
| [47 · CLI power-user pass](phase-47-cli-power-user-pass.md) | ✅ DONE | 26/26 | `██████████` | 100% | — | — |
| [46 · Inbound integrations](phase-46-inbound-integrations.md) | ✅ DONE | 20/20 | `██████████` | 100% | — | — |
| [45 · Recurring/scheduled tasks](phase-45-recurring-scheduled-tasks.md) | 🗑️ RETIRED | 15/15 | `██████████` | 100% | — | Removed: the Schedules facade + cron trigger were retired as redundant with workflows/routines |
| [44 · Outbound webhooks](phase-44-outbound-webhooks.md) | ✅ DONE | 20/20 | `██████████` | 100% | — | — |
| [43 · Preference sync](phase-43-server-side-preference-sync.md) | ✅ DONE | 25/25 | `██████████` | 100% | — | — |
| [42 · Task detail routing](phase-42-task-detail-routing.md) | ✅ DONE | 11/11 | `██████████` | 100% | — | — |
| [41 · Command palette](phase-41-command-palette.md) | ✅ DONE | 32/32 | `██████████` | 100% | — | — ² |
| [40 · Ideas pipeline](phase-40-ideas-pipeline.md) | ✅ DONE | 51/51 | `██████████` | 100% | — | — |
| [39 · Visual customization](phase-39-visual-customization.md) | ✅ DONE | 25/25 | `██████████` | 100% | — | — |
| [38 · Search scoping + service tokens](phase-38-search-scoping-service-tokens.md) | ✅ DONE | 28/28 | `██████████` | 100% | — | — |
| [37 · AI code review](phase-37-ai-code-review.md) | ✅ DONE | 35/35 | `██████████` | 100% | — | — |
| [36 · Template marketplace](phase-36-workflow-template-marketplace.md) | ✅ DONE | 40/40 | `██████████` | 100% | — | — |
| [35 · RBAC enforcement](phase-35-rbac-enforcement.md) | ✅ DONE | 34/34 | `██████████` | 100% | — | — |
| [34 · Bundle baseline](phase-34-bundle-baseline.md) | ✅ DONE | 23/23 | `██████████` | 100% | — | — |
| [33 · Multi-user teams](phase-33-multi-user-teams.md) | ✅ DONE | 55/55 | `██████████` | 100% | — | — |
| [32 · CLI live dashboard](phase-32-cli-live-dashboard.md) | ✅ DONE | 19/19 | `██████████` | 100% | — | — |
| [31 · Office live-activity](phase-31-office-live-activity.md) | ✅ DONE | 22/22 | `██████████` | 100% | — | — |
| [30 · Quality gates](phase-30-quality-gates.md) | ✅ DONE | 25/25 | `██████████` | 100% | — | — |
| [29 · Releases/versioning](phase-29-releases-versioning-changelog.md) | ✅ DONE | 14/14 | `██████████` | 100% | — | — |
| [28 · Project planning](phase-28-project-planning-breakdown.md) | ✅ DONE | 18/18 | `██████████` | 100% | — | — |
| [27 · Task dependencies](phase-27-task-dependencies.md) | ✅ DONE | 22/22 | `██████████` | 100% | — | — |
| [26 · Docs app](phase-26-docs-app.md) | ✅ DONE | 19/19 | `██████████` | 100% | — | — |
| [25 · @midnite/ui](phase-25-ui-library.md) | ✅ DONE | 17/17 | `██████████` | 100% | — | — |
| [24 · Responsive/PWA](phase-24-responsive-mobile-pwa.md) | ✅ DONE | 22/22 | `██████████` | 100% | — | — |
| [23 · Approvals/autonomy](phase-23-approvals-autonomy.md) | ✅ DONE | 23/23 | `██████████` | 100% | — | — |
| [22 · Fleet visibility](phase-22-fleet-visibility.md) | ✅ DONE | 21/21 | `██████████` | 100% | — | — |
| [21 · Notifications](phase-21-notifications.md) | ✅ DONE | 23/23 | `██████████` | 100% | — | — |
| [20 · Global search](phase-20-global-search.md) | ✅ DONE | 23/23 | `██████████` | 100% | — | — |
| [19 · Onboarding wizard](phase-19-onboarding-wizard.md) | ✅ DONE | 19/19 | `██████████` | 100% | — | — |
| [18 · Reports/exports](phase-18-reports-exports.md) | ✅ DONE | 22/22 | `██████████` | 100% | — | — |
| [17 · Spawner/tmux](phase-17-spawner-tmux.md) | ✅ DONE | 22/22 | `██████████` | 100% | — | — |
| [16 · Bulk add](phase-16-bulk-add.md) | ✅ DONE | 17/17 | `██████████` | 100% | — | — |
| [15 · Smart intake](phase-15-smart-intake.md) | ✅ DONE | 21/21 | `██████████` | 100% | — | — |
| [14 · Workflows pt2](phase-14-workflows-connect.md) | ✅ DONE | 23/23 | `██████████` | 100% | — | — |
| [13 · Repos first-class](phase-13-repos-first-class.md) | ✅ DONE | 16/16 | `██████████` | 100% | — | — |
| [12 · Workflow expressions](phase-12-workflow-expressions.md) | ✅ DONE | 33/33 | `██████████` | 100% | — | — |
| [11 · Public site](phase-11-public-site-rewrite.md) | ✅ DONE | 42/42 | `██████████` | 100% | — | — |
| [10 · Test hardening](phase-10-test-suite-hardening.md) | ✅ DONE | 48/48 | `██████████` | 100% | — | — |
| [9 · Office overhaul](phase-9-office-visual-overhaul.md) | ✅ DONE | 43/43 | `██████████` | 100% | — | — |
| [8 · Office fidelity](phase-8-office-fidelity.md) | ✅ DONE | 26/26 | `██████████` | 100% | — | — |
| [7 · Hardening/reports](phase-7-hardening-reports-widgets.md) | ✅ DONE | 31/31 | `██████████` | 100% | — | — |
| [6 · Workflows MVP](phase-6-workflows-mvp.md) | ✅ DONE | 30/30 | `██████████` | 100% | — | — |
| [5 · Polish](phase-5-polish.md) | ✅ DONE | 9/9 | `██████████` | 100% | — | — |
| [4 · Inference](phase-4-inference.md) | ✅ DONE | 11/11 | `██████████` | 100% | — | — |
| [3 · Browser](phase-3-browser.md) | ✅ DONE | 10/10 | `██████████` | 100% | — | — |
| [2 · Agents](phase-2-agents.md) | ✅ DONE | 10/10 | `██████████` | 100% | — | — |
| [1 · Board by hand](phase-1-board.md) | ✅ DONE | 16/16 | `██████████` | 100% | — | — |
| [0 · Scaffold](phase-0-scaffold.md) | ✅ DONE | 10/10 | `██████████` | 100% | — | — |

**Headline:** phases **0–61 are complete** (incl. Fable analysis/observability **60/61** and
performance/scale **57** — its Verification pass signed off 2026-07-11), plus the office pair
**63/64**. The **only live frontier** is **62** (Fable-Digest): every lettered theme A–H has
landed (PRs through #404); only the phase **Verification checklist** remains. (An *earlier* Phase 42 was a
parallel restatement of Phase 40, folded into Phase 40 Theme G and removed 2026-06-27; the
current 42 & 43 are new, unrelated phases — two brainstorm sessions ran concurrently, so the
preference-sync plan took the next free number, 43.)

² Phase 41 — themes A–D all landed and the verification checklist is signed off (PR #237). The
3 remaining boxes are all `⏳` deferred (contextual task-detail commands ×2 + the `E` edit-form
shortcut). The 2 contextual-command boxes are now **un-deferred and folded into Phase 42 Theme C**
(they needed the `/tasks/:id` route Phase 42 adds).

## Theme key (all phases — status per theme)

Every phase's lettered themes with a status icon + one-liner, so you can gauge scope and pick
work without opening the phase doc. Status: `✅` done · `🔄` WIP (claimed) · `◻` TODO · `◐`
partial · `⏳` deferred · `❌` out-of-scope. Newest-first.

### [Phase 65 — Memory workspace](phase-65-memory-workspace.md)
*Turn the memory modal into a 3-panel `/memory/view?id=` workspace (NotebookLM-style): left sources rail, center doc + chat-to-the-knowledge-base, right Studio that generates artifacts. Sources graduate to an ingested corpus (URL bodies + file uploads); memory becomes THE knowledge notion — project sources retired. Naming stays `memory`; FTS + LlmService reuse, no embeddings.*
- ✅ **A** — `/memory/view?id=` page: 3-panel shell + `GET /memories/:id` + routing/nav (modal reserved for create) (PR #379)
- ✅ **B** — Source ingestion: fetch+extract URL bodies + PDF/md/txt uploads; new content storage; re-index into FTS (PR #382)
- ✅ **C** — Chat to the knowledge base: persisted threads, FTS-retrieve→stuff→LlmService answer with source citations (PR #385)
- ✅ **D** — Studio: text artifacts (brief/FAQ/study-guide/timeline, markdown) + infographic (LLM→SVG) via a `memory_artifacts` table; async generate, sandboxed SVG viewer (PR #384)
- ✅ **E** — Studio: audio overview (two-host script→TTS mp3) + video (deck→ffmpeg slideshow); file-backed on `memory_artifacts`, degrade w/o provider (PR #388)
- ✅ **F** — Retire project sources → memories: forward migration to a project-scoped memory, drop `project_sources`, remove UI/API (PR #380)
- ✅ **G** — Tests (inline across A–F) + Memory Workspace product doc + a11y pass + the cross-cutting chat e2e; Verification checklist driven to done (PR #386 partial, PR #391 finish)

### [Phase 64 — Office multiplayer presence](phase-64-office-presence.md)
*Teammates as live avatars in the office (2D + 3D): a /ws/presence channel (last-known-state, no ring, zero DB), hybrid guest/JWT identity, emote wheel + locate, ghost mode, nav pill + dashboard widget; proximity chat as stretch. Theme D blocked on Phase 63 A–C.*
- ✅ **A** — Presence contract + gateway service (typed frames, tick-coalesced team fan-out, snapshot-on-join) (PR #356)
- ✅ **B** — Client presence store + throttled position sampler + guest identity + interpolation (PR #358)
- ✅ **C** — 2D renderer: remote humans as Actors, minimap dots, scene scoping (solo-preserving) (PR #361)
- ✅ **D** — 3D renderer: r3f presence avatars + billboards + minimap (PR #362)
- ✅ **E** — Emote wheel, teammates roster, locate/walk-to (PR #363)
- ✅ **F** — Nav pill, dashboard widget, server-enforced ghost mode (PR #367)
- ✅ **G** — Proximity chat bubbles: ephemeral, radius-filtered, rate-limited; 2D + 3D; never persisted (PR #372)
- ✅ **H** — Gateway/contract/interp tests + two-context Playwright smoke; fixed 2 real bugs it caught (broadcast DI undefined → presence crashed on connect; re-hello bypassed the update path → ghost toggle no-op) (PR #368)

### [Phase 63 — Office 3D](phase-63-office-3d.md)
*The office rebuilt in first-person three.js (r3f + drei): same rooms/data, same Zustand store contract so every existing React panel is reused untouched; 2D/3D tabs on /office; arcade sub-scene with one playable Breakout. Pure packages/web; 2D office behavior-preserving.*
- ✅ **A** — World foundation: r3f stage, procedural low-poly world from layout.ts, frustum culling, day/night lighting (PR #337)
- ✅ **B** — First-person rig: pointer-lock + WASD, grid AABB collision, footstep head-bob (reduced-motion aware) (PR #342)
- ✅ **C** — Agents & interactions: proximity → existing store fields → existing modals; low-poly avatars + billboards + P31 tool bubbles; minimap (PR #347)
- ✅ **D** — Arcade sub-scene: cabinet room, playable Breakout w/ power-ups on a CanvasTexture screen, stub cabinets → existing menu (PR #348)
- ✅ **E** — Corner office + pickers in 3D, ambient parity touches (PR #350)
- ✅ **F** — Tabs & routing: ?view=2d|3d + P43 preference sync, lazy engine isolation (PR #336; 3D view a placeholder pending Theme A's r3f world)
- ✅ **G** — Perf budget + unit/store-contract/Playwright tests (PR #352)

### [Phase 62 — Fable-Digest](phase-62-fable-digest.md)
*Retrospectives per task + fleet digests, workflow-first: a task-event trigger + retro/digest nodes + seeded pipelines; gateway stores primitives. Fable series #3.*
- ✅ **A** — Retro contract + deterministic skeleton + task_retros storage (auto on terminal, zero LLM) (PR #341)
- ✅ **B** — Task-event workflow trigger (workflows fire on task.done/abandoned/needs-attention) (PR #351)
- ✅ **C** — Node executors: generate-retro / list-completed-tasks / build-digest / notify (PR #393)
- ✅ **D** — Retro pipeline template: seeded task-event→generate-retro→branch(notable)→notify; deterministic `isRetroNotable` surfaced by the executor (PR #399)
- ✅ **E** — Digest pipeline template: daily-digest seed → list-completed→build-digest→parallel {slack (rich blocks, optional/skip-if-unbound), notify}; slack.message gains Block Kit `blocks` (P44 webhook fan-out ⏳ deferred) (PR #401)
- ✅ **F** — Retro surfaces: task-detail Retro tab (full retro + AI-summary honesty badge) + P18 markdown export + session cockpit deep-link (PR #402)
- ✅ **G** — Digest surfaces: `/digests` two-pane master-detail feed + structured detail w/ task deep-links + md export, Latest-digest widget, digests indexed in global search (PR #404)
- ✅ **H** — Transcript slicer (done in C) + `midnite retro` CLI + `retro.autoSkeleton`/`narrativeMaxTokens` config + `docs/RETROS.md` (PR #403); **`midnite digest list`/`show` CLI** now landed over Theme G's `GET /digests` (PR #409)

### [Phase 61 — Fable-Observability](phase-61-fable-observability.md)
*Deepen the existing metrics/usage seam: real session tokens (honestly labeled), cost attribution, cycle time, rollups + retention, live Ops. Fable series #2.*
- ✅ **A** — Real session-token harvesting: Stop-hook transcript parse → session_usage; measured vs labeled estimate (PR #366)
- ✅ **B** — Cost attribution: GET /usage/attribution (groupBy task/repo/project/session) + measured-vs-estimated composition; soft budgets fold in session cost (PR #370)
- ✅ **C** — Cycle-time as a first-class metric (todo→wip→done from task_events; GET /metrics/cycle-time) (PR #354)
- ✅ **D** — Gauge history that survives restarts: sampler + gauge_samples + GET /metrics/gauges/history (PR #343)
- ✅ **E** — Rollups + retention (metrics_rollup table + timer job + raw pruning; GET /metrics/rollups; transparent read-switch deferred) (PR #381)
- ✅ **F** — Live metrics channel on the P56 reliable WS: on-change gauge push via MetricsEventBus + MetricsGateway (`/ws/metrics`), Ops page consumes it (poll fallback) (PR #389)
- ✅ **G** — Ops page deepening: cycle-time + fleet-trend (PR #360) + run timeline (PR #396) + **cost views** (spend trend + by-dimension breakdown, PR #400) — all themes landed; Verification pass signed off 2026-07-11
- ✅ **H** — Widgets + session/project cockpit integration (PR #391)
- ✅ **I** — CLI (`usage --by`, `ops [--watch]`) + `docs/METRICS.md`; also fixed a Theme-F DI regression that 500'd `/metrics/ops` (PR #392)

### [Phase 60 — Fable-Analysis](phase-60-fable-analysis.md)
*Repo-wide audit → ranked findings reports (analysis-only, bar security quick-wins + safe dep bumps). Direction-preserving. M runs last.*
- ✅ **A** — Auth, transport & headers audit (rate-limit posture, CORS, token lifecycle) (PR #357)
- ✅ **B** — Secrets, signatures & crypto paths audit (PR #346; workflow `$env` master-secret leak fixed, findings logged)
- ✅ **C** — Input validation & injection sweep: FOUND+FIXED a HIGH arbitrary-file-read on `GET /media/:id/file`; FTS/zip-slip/raw-sql verified safe; SSRF logged as follow-up (PR #357)
- ✅ **D** — Dependency & supply-chain audit (+ safe bumps): ws 8.18→8.21 DoS bump, rest triaged (PR #355)
- ✅ **E** — State-machine, scheduler & concurrency correctness (PR #357)
- ✅ **F** — Data integrity & boundary-condition bugs (PR #365)
- ✅ **G** — Error handling & failure-path correctness (13 findings, no P0; SW-1/2 + FO-2 + ES-1 the standouts) (PR #369)
- ✅ **H** — Consistency & flow sweep (15 findings; systemic loading≈empty≈error; P1 Ideas dead-end) (PR #373)
- ✅ **I** — Accessibility & keyboard navigation: audited all surfaces; fixed 7 ARIA quick-wins (tabs kbd nav, palette combobox, collapse inert, dialog focus-trap) + axe gate→error + contrast script; 5 documented (PR #374)
- ✅ **J** — Mobile & responsive polish: fixed horizontal overflow on projects/ops/schedules/workflows + settings-table clipping; audit shots lock it (PR #389)
- ✅ **K** — CLI robustness & coverage (export/import tests + MIDNITE_TOKEN + SW-4 fix; boundary OK) (PR #376)
- ✅ **L** — Docs site, public site & @midnite/ui test gap: fixed the ui test hole (46→54 play-fns) + verified re-export shims; found dead Docs link + no product docs; proposed a product-led docs IA (PR #375)
- ✅ **M** — Cross-cutting synthesis & remediation backlog: 91 findings ranked+deduped (no P0; 26 fixed inline, 65 open), 7 systemic patterns, 5 remediation phases + 2 maintenance tracks proposed (PR #394)

### [Phase 59 — Chat to board](phase-59-chat-to-board.md)
*Natural-language command bar in the Cmd-K palette; deterministic-first, local-model-preferred; composes existing task services.*
- ✅ **A** — Intent contract + deterministic parser + LLM fallback (PR #321)
- ✅ **B** — Execute intents by composing existing services (PR #323)
- ✅ **C** — Status-query answerer (read-only) (PR #335)
- ✅ **D** — Inference routing: deterministic-first, local-preferred (PR #332)
- ✅ **E** — Palette command-bar UI (PR #334)
- ✅ **F** — Safety: preview, confirm, undo, audit (PR #333)

### [Phase 58 — Dependency graph & milestone roadmap](phase-58-dependency-graph-roadmap.md)
*(Make the plan visible: surface Phase 27's dependency edges as a DAG + a milestone roadmap. Server-authoritative graph API; React Flow + dagre view; milestone data model + assignment. No new scheduling semantics — read/visualize what's modeled.)*
- ✅ **A** — Graph API (server-authoritative): GET /tasks/graph, ready/unmet + foreign nodes, bounded (PR #318)
- ✅ **B** — Dependency DAG view (React Flow + dagre): read-only @xyflow/react + dagre LR layout, project picker, ?task= modal (PR #324)
- ✅ **C** — Project progress overlay: per-project completion bar on project surfaces (PR #320) + on the dependency graph toolbar when project-scoped (PR #327)
- ✅ **D** — Milestone data model (PR #322)
- ✅ **E** — Roadmap view + milestone assignment: milestone lanes + progress + backlog, drag-to-assign/reorder, inline CRUD, task-detail picker (PR #326)
- ✅ **F** — Entry points + breakdown tie-in: goal→breakdown seeds a milestone, milestone→graph filter, task→milestone chip on the card (PR #338)

### [Phase 57 — Performance & scale](phase-57-performance-scale.md)
*(No new domain — perf work across existing layers: batch loads + indexes in repositories, lean summary DTOs + pagination as shared contracts, cache tuning + virtualization on the web. Evidence-driven via a seed + benchmark harness.)*
- ✅ **A** — Seed + benchmark harness (evidence first) (PR #308)
- ✅ **B** — Kill the task-hydration N+1 (batched `hydrateMany`: 400-task list 2401→7 queries; workflow summaries 401→2 — PR #312)
- ✅ **C** — Lean list DTOs + pagination: TaskSummary DTO + paged GET /tasks (PR #319) + workflows/projects/repos pages (PR #397); keyset ⏳ deferred
- ✅ **D** — DB indexes on hot paths: projects(createdBy,teamId) + workflows(teamId) close the teamScopeFilter full-scans (PR #314)
- ✅ **E** — Refetch / cache tuning (coalesce refetches + staleTime; granular deferred to P56 — PR #307)
- ✅ **F** — List virtualization: board + run-history + approval-log (PR #310) + status-grouped accordions (sessions/workflows/projects) via a document-scroll `WindowVirtualList` — no inner scrollbar (PR #405)

### [Phase 56 — Realtime / WS reliability](phase-56-realtime-ws-reliability.md)
*(No new domain — a shared reliability layer under the existing WS gateways, lifting the terminal WS's proven seq+ring+resume onto every board channel so clients never silently drift. In-memory ring; restart forces resync.)*
- ✅ **A** — Sequenced event contracts + server event ring (PR #305)
- ✅ **B** — Resume protocol + gap-detection (the core guarantee — PR #313)
- ✅ **C** — Per-client backpressure + heartbeat + metrics (PR #315)
- ✅ **D** — Shared reliable client subscription hook (tasks/ideas/approvals; resume via #313; workflow-run bespoke) (PR #316)
- ✅ **E** — Apply across cockpits + connection-status UI (worst-of indicator + recovery toast; resync via #313) (PR #317)
- ✅ **F** — Terminal WS alignment: seq+ts envelope on output, `resume`/`resync-required` on ring overflow (PR #311)
- ✅ **Verification** — all 9 acceptance criteria driven end-to-end + ticked; added a browser-level reconnect-resume Playwright spec (replay + gap→resync); no gaps found (2026-07-09)

### [Phase 55 — Projects detail page](phase-55-projects-detail-page.md)
*(Entirely web — no gateway/API changes; every project endpoint already exists. A `/projects/view?id=` cockpit cloning the session-detail layout; the modal stays for in-context use + creating.)*
- ✅ **A** — Detail page shell, routing & collapsible two-rail layout (PR #301)
- ✅ **B** — Extract the aspect panels (shared by modal + page) (PR #300)
- ✅ **C** — Rail content: stats & actions (left) · sources & activity (right) (PR #301)
- ✅ **D** — Navigation wiring & the modal-vs-page rule (PR #301)

### [Phase 54 — Runtime & process resilience](phase-54-runtime-process-resilience.md)
*(Hardens the gateway process itself: boot → run → shutdown. Watchdog rides the single tick; one shared `pause`/`resume` (reused by Phase 50's kill switch); preserves boot recovery + the pty/tmux Spawner split.)*
- ✅ **A** — Boot preflight + config validation + fail-fast (`strictBoot`) (PR #275)
- ✅ **B** — Readiness/liveness health endpoints (`/health/ready` vs `/live`) (PR #275)
- ✅ **C** — Live watchdog: slot-leak + session-health auto-heal + pty liveness probe (PR #280)
- ✅ **D** — Scheduler resilience: readiness gate + backoff + first-class pause/resume
- ✅ **E** — Graceful shutdown: drain in-flight agents + WAL checkpoint/close (PR #288)
- ✅ **F** — Runtime health in web + CLI (`midnite doctor`) (PR #289)

### [Phase 53 — Task lifecycle resilience](phase-53-task-lifecycle-resilience.md)
*(Additive layer over the existing lifecycle — no state-machine refactor; escalation reuses `waiting` + a typed reason. Complements Phase 50.)*
- ✅ **A** — Failure taxonomy + `task_failures` records (`classifyFailure`)
- ✅ **B** — Retry backoff (exponential + jitter) + class-aware retry
- ✅ **C** — Stuck-state watchdogs (wip-inactivity, aged-todo, waiting-too-long) (PR #293)
- ✅ **D** — Escalate-to-human (needs-attention via `waiting` + `waitReason`) + nudges
- ✅ **E** — Board "needs attention" + failures/health view + CLI doctor

### [Phase 52 — In-app diff & PR review](phase-52-in-app-diff-review.md)
*(Extends tasks — no new domain. Reuses the workflow GitHub plumbing, `pr-status` fetch strategy, Phase 37 AI review. A→B→C is the critical path.)*
- ✅ **A** — Diff API: expose the PR diff to the web (structured)
- ✅ **B** — Diff viewer: file tree + split/unified + syntax highlight
- ✅ **C** — Review actions: inline comment + approve/request-changes + in-app merge (PR #292)
- ✅ **D** — Comment persistence (drafts) + Phase 37 AI review inline (PR #297)
- ✅ **E** — Embed in task detail + deep-linkable `?tab=review` route

### [Phase 51 — Session detail page](phase-51-session-detail-page.md)
- ✅ **A** — Session detail contract + API enrichment
- ✅ **B** — Detail page shell, routing, collapsible layout
- ✅ **C** — Terminal (live interactive + ended transcript)
- ✅ **D** — Left panel (approvals + task/project context)
- ✅ **E** — Right panel (session info & stats)
- ✅ **F** — Sessions list upgrade + entry points

### [Phase 50 — Autonomy guardrails & blast radius](phase-50-autonomy-guardrails.md)
- ✅ **A** — Kill switch & global pause (scheduling gate)
- ✅ **B** — Spend & rate caps that block (scheduling gate)
- ✅ **C** — Destructive-action limits (act-path gate) (PR #287)
- ✅ **D** — Audit completeness + RBAC gap closure
- ✅ **E** — Safety control panel (web) (PR #288)
- ✅ **F** — CLI safety commands

### [Phase 49 — Data portability](phase-49-data-portability.md)
- ✅ **A** — Archive contract + schema-version stamp
- ✅ **B** — Bulk export service (PR #291; secrets + users/teams deferred)
- ✅ **C** — Atomic import service (version-gated, replace/merge, in-process reindex) (PR #298)
- ✅ **D** — CLI export/import commands (export PR #294; import PR #304)
- ✅ **E** — Web Settings → Data page (download PR #296; restore preview→confirm PR #303; also fixed a DI bug that 500'd export)
- ✅ **F** — Scheduled auto-backup (PR #299)
- ✅ **G** — Secrets round-trip (`--include-secrets` + scrypt passphrase re-wrap) + users/teams export/import; closes the deferred B/C tails (PR #383)

### [Phase 48 — Slides (reveal.js decks)](phase-48-slides.md)
*(Net-new domain; persistence mirrors workflows; web static-export `?id=`; reveal.js client-only.)*
- ✅ **A** — Deck contract + `slides` table + migration
- ✅ **B** — Gateway CRUD module (team-scoped)
- ✅ **C** — Typed API client + web data layer
- ✅ **D** — Sidenav entry + list/grid view
- ✅ **E** — Editor + live reveal.js preview
- ✅ **F** — Present mode + PDF/HTML export

### [Phase 47 — CLI power-user pass](phase-47-cli-power-user-pass.md)
*(Thin-CLI: presentation + client-side loops only, no gateway changes.)*
- ✅ **A** — Brand chrome + ANSI logo
- ✅ **B** — Colour vocabulary (chalk palette)
- ✅ **C** — Spinners & progress (ora)
- ✅ **D** — Interactive prompts (inquirer)
- ✅ **E** — Machine output (global `--json`)
- ✅ **F** — Shell completions + bulk-by-filter ops

### [Phase 46 — Inbound integrations](phase-46-inbound-integrations.md)
- ✅ **A** — Inbound source entity + contract + Settings UI
- ✅ **B** — Provider-aware signed receiver → task creation
- ✅ **C** — Provider adapters (GitHub / Linear / generic)
- ✅ **D** — Deliveries log + source backlink

### [Phase 45 — Recurring & scheduled tasks](phase-45-recurring-scheduled-tasks.md)
*(Workflow-backed: `[trigger.schedule] → [task.create]`.)*
- ✅ **A** — `task.create` workflow action/executor
- ✅ **B** — Recurrence presets (+ raw-cron escape hatch)
- ✅ **C** — Schedules facade view
- ✅ **D** — Run-history + "Daily standup" preset

### [Phase 44 — Outbound webhooks & integrations](phase-44-outbound-webhooks.md)
- ✅ **A** — Webhook endpoint entity + CRUD + Settings UI
- ✅ **B** — Signed delivery engine off the event bus
- ✅ **C** — Provider formatting (Slack / Discord / generic)
- ✅ **D** — Deliveries log UI + "send test" + redeliver

### [Phase 43 — Server-side preference sync](phase-43-server-side-preference-sync.md)
- ✅ **A** — `UserPreferences` contract in `shared`
- ✅ **B** — Gateway persistence + authed read/write
- ✅ **C** — Web sync layer (hydrate + write-through, LWW)

### [Phase 42 — Task detail routing & contextual commands](phase-42-task-detail-routing.md)
- ✅ **A** — Full detail page (`/tasks/view?id=`)
- ✅ **B** — Modal via `?task=` param (client-side; intercepting routes N/A under `output: 'export'`) + nav migration (PR #272)
- ✅ **C** — Contextual "Move to…" palette commands

### [Phase 41 — Command palette & keyboard navigation](phase-41-command-palette.md)
- ✅ **A** — ⌘K palette core (search + recents)
- ◐ **B** — Palette actions (2 contextual cmds deferred → folded into Phase 42 C)
- ✅ **C** — Global keyboard shortcuts + help overlay
- ✅ **D** — Board arrow-key navigation (E edit-shortcut ⏳ deferred)

### [Phase 40 — Ideas pipeline](phase-40-ideas-pipeline.md)
- ✅ **A** — Idea entity + sidenav
- ✅ **B** — Ideas views (table / list / grid)
- ✅ **C** — AI chat composer
- ✅ **D** — Promote idea → project
- ✅ **E** — Phase doc editor (GitHub-backed)
- ✅ **F** — Phase doc → task seeder
- ✅ **G** — Phase-doc ↔ board sync-back

### [Phase 39 — Visual customization](phase-39-visual-customization.md)
- ✅ **A** — Background gallery + animated gradient
- ✅ **B** — Accent-colour personalization
- ✅ **C** — Density & typography scale
- ✅ **D** — Motion & visual-effects controls
- ✅ **E** — Live preview + no-flash application

### [Phase 38 — Search scoping + service tokens](phase-38-search-scoping-service-tokens.md)
- ✅ **A** — FTS5 search index scoped by team
- ✅ **B** — Service-account tokens (machine auth + expiry)

### [Phase 37 — AI code review integration](phase-37-ai-code-review.md)
- ✅ **A** — GitHub executor nodes + credential type
- ✅ **B** — Built-in "AI Code Review" workflow template
- ◐ **C** — Repo ↔ GitHub webhook wiring (partial defer)
- ◐ **D** — Task PR review surfacing (re-review deferred)

### [Phase 36 — Workflow template marketplace](phase-36-workflow-template-marketplace.md)
- ✅ **A** — Template entity + CRUD
- ✅ **B** — Install & fork from templates
- ✅ **C** — Built-in template library (seeded on boot)
- ◐ **D** — Web marketplace UI (detail page deferred)
- ✅ **E** — CLI template commands

### [Phase 35 — RBAC enforcement](phase-35-rbac-enforcement.md)
- ✅ **A** — Scoped list queries (team/user)
- ✅ **B** — Role-based write guards (decorator)
- ✅ **D** — WebSocket event scoping by team
- ✅ **E** — Notification scoping to team

### [Phase 34 — Bundle baseline & web performance](phase-34-bundle-baseline.md)
- ✅ **A** — Bundle analyzer + baseline report
- ✅ **B** — `optimizePackageImports` quick wins
- ✅ **C** — Dynamic imports for view-heavy libs
- ✅ **D** — Build hygiene + disk-accounting docs

### [Phase 33 — Multi-user & teams](phase-33-multi-user-teams.md)
- ✅ **A** — User identity + JWT auth
- ✅ **B** — Teams + membership + invites
- ✅ **C** — Resource ownership columns
- ✅ **D** — Agent isolation + audit log
- ✅ **E** — Admin + profile UI

### [Phase 32 — CLI live dashboard (`midnite watch`)](phase-32-cli-live-dashboard.md)
- ✅ **A** — TUI foundation (ink + WS seam)
- ✅ **B** — Live board panel (kanban columns)
- ✅ **C** — Agent slots / pool panel
- ✅ **D** — Live logs panel (session streaming)
- ✅ **E** — Keyboard nav + task moves

### [Phase 31 — Office live-activity layer](phase-31-office-live-activity.md)
- ✅ **A** — Live activity event backbone
- ✅ **B** — Task-aware room routing by status
- ✅ **C** — Tool-level bubbles + activity poses
- ✅ **D** — Attention/approval surfacing
- ✅ **E** — Push-patch over refetch + throttling

### [Phase 30 — Quality gates: verified completion](phase-30-quality-gates.md)
- ✅ **A** — Check runner + config schema
- ✅ **B** — Gate the done transition (persist results)
- ✅ **C** — Auto-fix loop (dedicated budget)
- ✅ **D** — Web + CLI check surfaces

### [Phase 29 — Releases, versioning & changelog](phase-29-releases-versioning-changelog.md)
- ✅ **A** — Lockstep versioning + version-sync tool
- ✅ **B** — Root `CHANGELOG.md`
- ✅ **C** — `/release-prep` skill
- ✅ **D** — `/release-complete` skill

### [Phase 28 — Project planning & structured breakdown](phase-28-project-planning-breakdown.md)
- ✅ **A** — Structured breakdown model + LLM generation
- ✅ **B** — Create tasks with dependencies from breakdown
- ✅ **C** — Goal → planned board (editable preview)
- ✅ **D** — Standalone breakdown + CLI goal planning

### [Phase 27 — Task dependencies & dependency-aware scheduling](phase-27-task-dependencies.md)
- ✅ **A** — Dependency model + blocker graph + integrity
- ✅ **B** — Dependency-aware scheduling (ready-gating)
- ✅ **C** — Dependencies in web UI (blocked chips)
- ✅ **D** — CLI coverage + e2e tests

### [Phase 26 — Docs app (`@midnite/docs`)](phase-26-docs-app.md)
- ✅ **A** — Docs app scaffold consuming `@midnite/ui`
- ✅ **B** — Design-system documentation
- ✅ **C** — Product & developer docs
- ◐ **D** — Navigation, search & build seam

### [Phase 25 — @midnite/ui library](phase-25-ui-library.md)
- ✅ **A** — Package scaffold + Vite build
- ✅ **B** — Tokens + theming foundation
- ✅ **C** — Migrate primitives + stories
- ✅ **D** — Storybook catalog + docs seam

### [Phase 24 — Responsive & mobile PWA](phase-24-responsive-mobile-pwa.md)
- ✅ **A** — Responsive layout + navigation
- ✅ **B** — Touch interactions + tap-to-move
- ✅ **C** — PWA installability (manifest + SW)

### [Phase 23 — Approvals & autonomy](phase-23-approvals-autonomy.md)
- ✅ **A** — Policy engine + rule storage
- ✅ **B** — Cross-session approvals inbox
- ✅ **C** — Approval audit log
- ✅ **D** — Autonomy modes + settings

### [Phase 22 — Fleet visibility](phase-22-fleet-visibility.md)
- ✅ **A** — Runtime metrics recording
- ✅ **B** — Ops dashboard surface
- ✅ **C** — PR status model + refresh
- ✅ **D** — PR/git surface + delivery panel

### [Phase 21 — Notifications & alerting](phase-21-notifications.md)
- ✅ **A** — Notification model + persisted feed
- ✅ **B** — Channel dispatch interface
- ✅ **C** — Web notification center + toasts
- ✅ **D** — Desktop native notifications

### [Phase 20 — Global search](phase-20-global-search.md)
- ✅ **A** — FTS5 index + contract + maintenance
- ✅ **B** — Search endpoint (ranking + snippets)
- ✅ **C** — Command palette integration
- ✅ **D** — Dedicated search page

### [Phase 19 — Onboarding & setup wizard](phase-19-onboarding-wizard.md)
- ✅ **A** — Setup-readiness model + endpoint
- ✅ **B** — Guided wizard UI
- ✅ **C** — First-run detection + soft gating
- ✅ **D** — Ongoing status panel

### [Phase 18 — Reports & exports](phase-18-reports-exports.md)
- ✅ **A** — Task export with timeline
- ✅ **B** — Project export (tasks + knowledge)
- ✅ **C** — Workflow-run export (resolved params)
- ✅ **D** — Generalized renderer for all domains

### [Phase 17 — Spawner & tmux sessions](phase-17-spawner-tmux.md)
- ✅ **A** — Extract `Spawner` interface
- ✅ **B** — TmuxSpawner (durable sessions + reattach)
- ✅ **C** — Backend selection + survive-restart
- ✅ **D** — Spawner contract tests + tmux in CI

### [Phase 16 — Bulk / paste add](phase-16-bulk-add.md)
- ✅ **A** — Bulk create API (coalesced board update)
- ✅ **B** — CLI `add --bulk` (stdin / file)
- ✅ **C** — Web paste-list modal (preview + results)

### [Phase 15 — Smart intake & inference](phase-15-smart-intake.md)
- ✅ **A** — Bulk paste add (API + CLI + web)
- ✅ **B** — URL / GitHub-context inference
- ✅ **C** — Inline answers for question-type items
- ✅ **D** — Knowledge-files watcher + injection

### [Phase 14 — Workflows pt.2: make them connect](phase-14-workflows-connect.md)
- ✅ **A** — Live run streaming
- ✅ **B** — Credential vault + OAuth2
- ✅ **C** — Integration executors (Slack / email / Sheets)
- ✅ **D** — CLI parity (list / run / history)
- ✅ **E** — Editor polish (autosave / replay / templates)

### [Phase 13 — Repos as first-class entity](phase-13-repos-first-class.md)
- ✅ **A** — Repo registry (DB-backed CRUD)
- ✅ **B** — Selectable + validated repo refs on tasks

### [Phase 12 — Workflow data flow & expressions](phase-12-workflow-expressions.md)
- ✅ **A** — Expression engine (safe resolver + typed context)
- ✅ **B** — Engine integration (resolve params pre-execute)
- ✅ **C** — Reshape + storage nodes
- ✅ **D** — n8n-style expression editor + autocomplete
- ◐ **E** — Run-history debugging (inline resolved-value preview)
- ✅ **F** — Palette grouping + new-node surfacing

### [Phase 11 — Public site rewrite](phase-11-public-site-rewrite.md)
- ✅ **A** — Multi-theme, favicon, layout shell + nav
- ⏳ **B** — Cursor particle field (removed → backdrop)
- ✅ **C** — Persistent preview panel (Mac chrome)
- ✅ **D** — Scroll-driven sections + typewriter titles
- ✅ **E** — Epic hero (cycling typed titles)
- ✅ **F** — Panel content (terminal + webapp mockups)
- ✅ **G** — Download page restyle + platform detect
- ✅ **H** — Legal pages (sidebar sub-layout + markdown)

### [Phase 10 — Test suite hardening & visual previews](phase-10-test-suite-hardening.md)
- ✅ **A** — Shared unit coverage for contract schemas
- ✅ **B** — Gateway test depth (controller + integration)
- ✅ **C** — Component tests (Storybook + a11y)
- ✅ **D** — Flow tests (Playwright)
- ✅ **E** — Screenshot previews + visual baselines
- ✅ **F** — CI wiring + coverage gates

### [Phase 9 — Office visual overhaul](phase-9-office-visual-overhaul.md)
- ✅ **A** — Multi-room layout + theme-aware palette
- ✅ **B** — Distinct agent characters + props
- ✅ **C** — Bookshelf modal (searchable library)
- ✅ **D** — Board room projects list
- ✅ **E** — Communal area (coffee, TV, gaming)
- ✅ **F** — Corner office (customisable desk)
- ✅ **G** — Agent pool (lounging + swimming)

### [Phase 8 — Office fidelity & presence](phase-8-office-fidelity.md)
- ◐ **A** — Procedural pixel art + walk animations + tileset
- ✅ **B** — Theme-aware colours + fixed-aspect scrolling map
- ✅ **C** — Status bubbles + idle anims + pathfinding
- ✅ **D** — Call/message wiring + click-to-walk + minimap
- ❌ **E** — Multiplayer presence (out of scope)

### [Phase 7 — Hardening, reports & widgets](phase-7-hardening-reports-widgets.md)
- ✅ **A** — Encrypt API keys + LLM usage accounting + web test toolchain
- ✅ **B** — Export framework + councils report + print-to-PDF
- ✅ **C** — Cost / recent-PRs / quick-capture / per-repo status widgets
- ✅ **D** — Command palette + notifications + tags/saved-filters
- ✅ **A6** — Task WebSocket broadcast (event-driven board)

### [Phase 6 — Workflows (MVP)](phase-6-workflows-mvp.md)
*(no lettered themes — predates the convention)*
- ✅ Graph types + node registry + execution engine + persistence; React Flow editor + palette; manual/schedule/webhook triggers, HTTP + Claude nodes.

### [Phase 5 — Polish](phase-5-polish.md)
*(no lettered themes — predates the convention)*
- ✅ Pluggable spawner (pty/tmux); priorities, retries, per-repo concurrency caps; per-repo branch/PR conventions + CI + test suites.

### [Phase 4 — Inference](phase-4-inference.md)
*(no lettered themes — predates the convention)*
- ✅ Plan/act split, classification, bulk intake, repo guessing; knowledge-base watcher + prompt injection. ⏳ Embeddings/RAG deferred.

### [Phase 3 — Browser](phase-3-browser.md)
*(no lettered themes — predates the convention)*
- ✅ TanStack Query + WS-synced kanban (drag-drop); xterm.js 2-way terminal + static transcripts.

### [Phase 2 — Agents](phase-2-agents.md)
*(no lettered themes — predates the convention)*
- ✅ Agent pool (idle/busy slots + tick scheduler); PTY spawner + live stdout ring buffer; Claude Code lifecycle/stop hooks.

### [Phase 1 — Board by hand](phase-1-board.md)
*(no lettered themes — predates the convention)*
- ✅ SQLite task/event store + REST + WS; CLI `add`/`list`/`move`/`serve`; live board + terminal streaming.

### [Phase 0 — Scaffold](phase-0-scaffold.md)
*(no lettered themes — predates the convention)*
- ✅ Monorepo (moon + proto) + package skeletons; builds / lints / tests green across the graph.

## Maintenance

`/exec` keeps this file current — do not hand-edit casually:

1. **On pickup** (before the worktree): move the chosen theme letter(s) from the
   `◻ TODO` column into `🔄 WIP`, commit straight to `main`, and push — so other
   `/exec` loops see the claim and skip it.
2. **On merge** (in the branch, before the PR merges): drop the theme letter(s)
   out of `🔄 WIP`, bump the `Done`/`Progress`/`%` cells, and flip the row's
   **Status** to `✅ DONE` once every theme is done. The phase doc + `done.md`
   move in the same branch, so merging auto-updates docs and this index together.
3. **Keep the [Theme key](#theme-key-all-phases--status-per-theme) in sync** — when a
   theme lands, flip its `◻`/`🔄` to `✅` there too (it mirrors the per-theme status).
