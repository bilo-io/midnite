# todo/ — phase index

> **Scan this file, not every `phase-*.md`.** This is the single roll-up of phase
> progress + which themes are open, in-flight, or done. `/exec` reads this to pick
> work and writes back to it (see [Maintenance](#maintenance)). Only open an
> individual `phase-N-*.md` once you've chosen a candidate phase here.
>
> Generated from the 2026-06-26 git report; kept current by `/exec` as themes land.

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

## Phases

| Phase | Status | Done | Progress | % | 🔄 WIP | ◻ TODO |
|-------|--------|------|----------|---|--------|--------|
| [0 · Scaffold](phase-0-scaffold.md) | ✅ DONE | 10/10 | `██████████` | 100% | — | — |
| [1 · Board by hand](phase-1-board.md) | ✅ DONE | 16/16 | `██████████` | 100% | — | — |
| [2 · Agents](phase-2-agents.md) | ✅ DONE | 10/10 | `██████████` | 100% | — | — |
| [3 · Browser](phase-3-browser.md) | ✅ DONE | 10/10 | `██████████` | 100% | — | — |
| [4 · Inference](phase-4-inference.md) | ✅ DONE | 11/11 | `██████████` | 100% | — | — |
| [5 · Polish](phase-5-polish.md) | ✅ DONE | 9/9 | `██████████` | 100% | — | — |
| [6 · Workflows MVP](phase-6-workflows-mvp.md) | ✅ DONE | 30/30 | `██████████` | 100% | — | — |
| [7 · Hardening/reports](phase-7-hardening-reports-widgets.md) | ✅ DONE | 31/31 | `██████████` | 100% | — | — |
| [8 · Office fidelity](phase-8-office-fidelity.md) | ✅ DONE | 26/26 | `██████████` | 100% | — | — |
| [9 · Office overhaul](phase-9-office-visual-overhaul.md) | ✅ DONE | 43/43 | `██████████` | 100% | — | — |
| [10 · Test hardening](phase-10-test-suite-hardening.md) | ✅ DONE | 48/48 | `██████████` | 100% | — | — |
| [11 · Public site](phase-11-public-site-rewrite.md) | ✅ DONE | 42/42 | `██████████` | 100% | — | — |
| [12 · Workflow expressions](phase-12-workflow-expressions.md) | ✅ DONE | 33/33 | `██████████` | 100% | — | — |
| [13 · Repos first-class](phase-13-repos-first-class.md) | ✅ DONE | 16/16 | `██████████` | 100% | — | — |
| [14 · Workflows pt2](phase-14-workflows-connect.md) | ✅ DONE | 23/23 | `██████████` | 100% | — | — |
| [15 · Smart intake](phase-15-smart-intake.md) | ✅ DONE | 21/21 | `██████████` | 100% | — | — |
| [16 · Bulk add](phase-16-bulk-add.md) | ✅ DONE | 17/17 | `██████████` | 100% | — | — |
| [17 · Spawner/tmux](phase-17-spawner-tmux.md) | ✅ DONE | 22/22 | `██████████` | 100% | — | — |
| [18 · Reports/exports](phase-18-reports-exports.md) | ✅ DONE | 22/22 | `██████████` | 100% | — | — |
| [19 · Onboarding wizard](phase-19-onboarding-wizard.md) | ✅ DONE | 19/19 | `██████████` | 100% | — | — |
| [20 · Global search](phase-20-global-search.md) | ✅ DONE | 23/23 | `██████████` | 100% | — | — |
| [21 · Notifications](phase-21-notifications.md) | ✅ DONE | 23/23 | `██████████` | 100% | — | — |
| [22 · Fleet visibility](phase-22-fleet-visibility.md) | ✅ DONE | 21/21 | `██████████` | 100% | — | — |
| [23 · Approvals/autonomy](phase-23-approvals-autonomy.md) | ✅ DONE | 23/23 | `██████████` | 100% | — | — |
| [24 · Responsive/PWA](phase-24-responsive-mobile-pwa.md) | ✅ DONE | 22/22 | `██████████` | 100% | — | — |
| [25 · @midnite/ui](phase-25-ui-library.md) | ✅ DONE | 17/17 | `██████████` | 100% | — | — |
| [26 · Docs app](phase-26-docs-app.md) | ✅ DONE | 19/19 | `██████████` | 100% | — | — |
| [27 · Task dependencies](phase-27-task-dependencies.md) | ✅ DONE | 22/22 | `██████████` | 100% | — | — |
| [28 · Project planning](phase-28-project-planning-breakdown.md) | ✅ DONE | 18/18 | `██████████` | 100% | — | — |
| [29 · Releases/versioning](phase-29-releases-versioning-changelog.md) | ✅ DONE | 14/14 | `██████████` | 100% | — | — |
| [30 · Quality gates](phase-30-quality-gates.md) | ✅ DONE | 25/25 | `██████████` | 100% | — | — |
| [31 · Office live-activity](phase-31-office-live-activity.md) | ✅ DONE | 22/22 | `██████████` | 100% | — | — |
| [32 · CLI live dashboard](phase-32-cli-live-dashboard.md) | ✅ DONE | 19/19 | `██████████` | 100% | — | — |
| [33 · Multi-user teams](phase-33-multi-user-teams.md) | ✅ DONE | 55/55 | `██████████` | 100% | — | — |
| [34 · Bundle baseline](phase-34-bundle-baseline.md) | ✅ DONE | 23/23 | `██████████` | 100% | — | — |
| [35 · RBAC enforcement](phase-35-rbac-enforcement.md) | ✅ DONE | 34/34 | `██████████` | 100% | — | — |
| [36 · Template marketplace](phase-36-workflow-template-marketplace.md) | ✅ DONE | 40/40 | `██████████` | 100% | — | — |
| [37 · AI code review](phase-37-ai-code-review.md) | ✅ DONE | 35/35 | `██████████` | 100% | — | — |
| [38 · Search scoping + service tokens](phase-38-search-scoping-service-tokens.md) | ✅ DONE | 28/28 | `██████████` | 100% | — | — |
| [39 · Visual customization](phase-39-visual-customization.md) | ✅ DONE | 25/25 | `██████████` | 100% | — | — |
| [40 · Ideas pipeline](phase-40-ideas-pipeline.md) | ✅ DONE | 51/51 | `██████████` | 100% | — | — |
| [41 · Command palette](phase-41-command-palette.md) | ✅ DONE | 32/32 | `██████████` | 100% | — | — ² |
| [42 · Task detail routing](phase-42-task-detail-routing.md) | ◻ TODO | 0/11 | `░░░░░░░░░░` | 0% | — | A B C |
| [43 · Preference sync](phase-43-server-side-preference-sync.md) | 🔄 WIP | 4/24 | `██░░░░░░░░` | 17% | — | B C |
| [44 · Outbound webhooks](phase-44-outbound-webhooks.md) | ◻ TODO | 0/16 | `░░░░░░░░░░` | 0% | — | A B C D |
| [45 · Recurring/scheduled tasks](phase-45-recurring-scheduled-tasks.md) | 🔄 WIP | 0/15 | `░░░░░░░░░░` | 0% | A | B C D |

**Headline:** the original **0–41 roadmap is 100% complete** (Phases 39 & 41 closed 2026-06-30). **Phases 42 (task detail routing), 43 (server-side preference sync), 44 (outbound webhooks & integrations), and 45 (recurring/scheduled tasks)** are freshly planned and open — all their themes are pickable. (An *earlier* Phase 42 was a parallel restatement of Phase 40, folded into Phase 40 Theme G and removed 2026-06-27; the current 42 & 43 are new, unrelated phases — two brainstorm sessions ran concurrently, so the preference-sync plan took the next free number, 43.)

² Phase 41 — themes A–D all landed and the verification checklist is signed off (PR #237). The 3 remaining boxes are all `⏳` deferred (contextual task-detail commands ×2 + the `E` edit-form shortcut). The 2 contextual-command boxes are now **un-deferred and folded into Phase 42 Theme C** (they needed the `/tasks/:id` route Phase 42 adds).

## Theme key (active phases)

What the letters mean for the phases that still have open or in-flight themes —
so you can pick from this file without opening the phase doc first.

### [Phase 40 — Ideas pipeline](phase-40-ideas-pipeline.md)
- ✅ **A** — Idea entity + sidenav
- ✅ **B** — Ideas views (table / list / grid)
- ✅ **C** — AI chat composer (backend #215, UI #232)
- ✅ **D** — Promote idea → project (#234)
- ✅ **E** — Phase doc editor (GitHub-backed) (#229)
- ✅ **F** — Phase doc → task seeder (#233)
- ✅ **G** — Phase-doc ↔ board sync-back (#236) *(folded in from former Phase 42 Theme E)*

### [Phase 42 — Task detail routing & contextual commands](phase-42-task-detail-routing.md)
- ◻ **A** — `/tasks/:id` full detail page (extract `<TaskDetail>`, deep-linkable) **[M]**
- ◻ **B** — Intercepting-route modal (modal on click / full page on direct link) + nav migration **[M–L]**
- ◻ **C** — Contextual "Move to…" palette commands (closes Phase 41's 2 deferred boxes) **[S]**

### [Phase 43 — Server-side preference sync](phase-43-server-side-preference-sync.md)
- ✅ **A** — `UserPreferencesSchema` contract in `shared` (synced subset of `AppSettings`) (PR #240) **[S–M]**
- ◻ **B** — Gateway `user_preferences` table + `GET`/`PUT /users/me/preferences` (authed) **[M]**
- ◻ **C** — Web sync layer (hydrate-on-login, debounced write-through, LWW; localStorage-only when signed out) **[M]**

### [Phase 44 — Outbound webhooks & integrations](phase-44-outbound-webhooks.md)
- ◻ **A** — Webhook endpoint entity + CRUD + Settings → Integrations UI (team-scoped) **[M]**
- ◻ **B** — Signed delivery engine off the `TaskEventBus` (HMAC, reused SSRF/retry core, deliveries log) **[M]**
- ◻ **C** — Provider formatting: Slack / Discord / generic JSON (Linear deferred) **[S–M]**
- ◻ **D** — Deliveries log UI + "Send test event" + redeliver **[S]**

### [Phase 45 — Recurring & scheduled tasks](phase-45-recurring-scheduled-tasks.md)
*(Workflow-backed: a recurring task is a `[trigger.schedule] → [task.create]` workflow — reuses the workflow scheduler/runs/run-history.)*
- ◻ **A** — `task.create` workflow action/executor (the missing link) **[M]**
- ◻ **B** — Recurrence presets (+ raw-cron escape hatch) on the schedule trigger **[S–M]**
- ◻ **C** — Dedicated "Schedules" facade view (list/create/edit/run-now) **[M]**
- ◻ **D** — Run-history surfacing + "Daily standup" starter preset **[S]**

## Maintenance

`/exec` keeps this file current — do not hand-edit casually:

1. **On pickup** (before the worktree): move the chosen theme letter(s) from the
   `◻ TODO` column into `🔄 WIP`, commit straight to `main`, and push — so other
   `/exec` loops see the claim and skip it.
2. **On merge** (in the branch, before the PR merges): drop the theme letter(s)
   out of `🔄 WIP`, bump the `Done`/`Progress`/`%` cells, and flip the row's
   **Status** to `✅ DONE` once every theme is done. The phase doc + `done.md`
   move in the same branch, so merging auto-updates docs and this index together.
