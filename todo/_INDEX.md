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
| [54 · Runtime & process resilience](phase-54-runtime-process-resilience.md) | 🔄 WIP | 8/26 | `███░░░░░░░` | 31% | — | D E F |
| [53 · Task lifecycle resilience](phase-53-task-lifecycle-resilience.md) | 🔄 WIP | 6/22 | `███░░░░░░░` | 27% | — | C D E |
| [52 · In-app diff & PR review](phase-52-in-app-diff-review.md) | 🔄 WIP | 10/25 | `████░░░░░░` | 40% | — | C D |
| [51 · Session detail page](phase-51-session-detail-page.md) | ✅ DONE | 27/27 | `██████████` | 100% | — | — |
| [50 · Autonomy guardrails](phase-50-autonomy-guardrails.md) | 🔄 WIP | 11/29 | `████░░░░░░` | 38% | — | C E F |
| [49 · Data portability](phase-49-data-portability.md) | 🔄 WIP | 0/27 | `░░░░░░░░░░` | 0% | A | B C D E F |
| [48 · Slides](phase-48-slides.md) | ✅ DONE | 26/26 | `██████████` | 100% | — | — |
| [47 · CLI power-user pass](phase-47-cli-power-user-pass.md) | ✅ DONE | 26/26 | `██████████` | 100% | — | — |
| [46 · Inbound integrations](phase-46-inbound-integrations.md) | ✅ DONE | 20/20 | `██████████` | 100% | — | — |
| [45 · Recurring/scheduled tasks](phase-45-recurring-scheduled-tasks.md) | ✅ DONE | 15/15 | `██████████` | 100% | — | — |
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

**Headline:** the original **0–48 roadmap is complete** — Phase 42 closed out with
**Theme B** (task modal via a `?task=` param, the static-export-friendly replacement
for intercepting routes — PR #272, 2026-07-02).
The **live frontier** is **Phase 51** (session detail — Theme E in flight, F to go) plus a
newly-planned resilience/review trio — **52** (in-app PR review), **53** (task-lifecycle
resilience), **54** (runtime/process resilience) — and the two unstarted plans
**49** (data portability) and **50** (autonomy guardrails). (An *earlier* Phase 42 was a
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

### [Phase 54 — Runtime & process resilience](phase-54-runtime-process-resilience.md)
*(Hardens the gateway process itself: boot → run → shutdown. Watchdog rides the single tick; one shared `pause`/`resume` (reused by Phase 50's kill switch); preserves boot recovery + the pty/tmux Spawner split.)*
- ✅ **A** — Boot preflight + config validation + fail-fast (`strictBoot`) (PR #275)
- ✅ **B** — Readiness/liveness health endpoints (`/health/ready` vs `/live`) (PR #275)
- ✅ **C** — Live watchdog: slot-leak + session-health auto-heal + pty liveness probe (PR #280)
- ◻ **D** — Scheduler resilience: readiness gate + backoff + first-class pause/resume
- ◻ **E** — Graceful shutdown: drain in-flight agents + WAL checkpoint/close
- ◻ **F** — Runtime health in web + CLI (`midnite doctor`)

### [Phase 53 — Task lifecycle resilience](phase-53-task-lifecycle-resilience.md)
*(Additive layer over the existing lifecycle — no state-machine refactor; escalation reuses `waiting` + a typed reason. Complements Phase 50.)*
- ✅ **A** — Failure taxonomy + `task_failures` records (`classifyFailure`)
- ✅ **B** — Retry backoff (exponential + jitter) + class-aware retry
- ◻ **C** — Stuck-state watchdogs (wip-inactivity, aged-todo, waiting-too-long)
- ◻ **D** — Escalate-to-human (needs-attention via `waiting` + `waitReason`) + nudges
- ◻ **E** — Board "needs attention" + failures/health view + CLI doctor

### [Phase 52 — In-app diff & PR review](phase-52-in-app-diff-review.md)
*(Extends tasks — no new domain. Reuses the workflow GitHub plumbing, `pr-status` fetch strategy, Phase 37 AI review. A→B→C is the critical path.)*
- ✅ **A** — Diff API: expose the PR diff to the web (structured)
- ✅ **B** — Diff viewer: file tree + split/unified + syntax highlight
- ◻ **C** — Review actions: inline comment + approve/request-changes + in-app merge
- ◻ **D** — Comment persistence (drafts) + Phase 37 AI review inline
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
- ◻ **C** — Destructive-action limits (act-path gate)
- ✅ **D** — Audit completeness + RBAC gap closure
- ◻ **E** — Safety control panel (web)
- ◻ **F** — CLI safety commands

### [Phase 49 — Data portability](phase-49-data-portability.md)
- ◻ **A** — Archive contract + schema-version stamp
- ◻ **B** — Bulk export service
- ◻ **C** — Atomic import service
- ◻ **D** — CLI export/import commands
- ◻ **E** — Web Settings → Data page
- ◻ **F** — Scheduled auto-backup

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
