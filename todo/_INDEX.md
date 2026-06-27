# todo/ — phase index

> **Scan this file, not every `phase-*.md`.** This is the single roll-up of phase
> progress + which themes are open, in-flight, or done. `/exec` reads this to pick
> work and writes back to it (see [Maintenance](#maintenance)). Only open an
> individual `phase-N-*.md` once you've chosen a candidate phase here.
>
> Generated from the 2026-06-26 git report; kept current by `/exec` as themes land.

## Legend

- **Status** — `✅ COMPLETE` · `🔄 WIP` · `◻ TODO`
- **Progress** — 20-cell bar, filled ∝ done/total; the `%` column is the exact figure.
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
| [0 · Scaffold](phase-0-scaffold.md) | ✅ COMPLETE | 10/10 | `████████████████████` | 100% | — | — |
| [1 · Board by hand](phase-1-board.md) | ✅ COMPLETE | 16/16 | `████████████████████` | 100% | — | — |
| [2 · Agents](phase-2-agents.md) | ✅ COMPLETE | 10/10 | `████████████████████` | 100% | — | — |
| [3 · Browser](phase-3-browser.md) | ✅ COMPLETE | 10/10 | `████████████████████` | 100% | — | — |
| [4 · Inference](phase-4-inference.md) | ✅ COMPLETE | 11/11 | `████████████████████` | 100% | — | — |
| [5 · Polish](phase-5-polish.md) | ✅ COMPLETE | 9/9 | `████████████████████` | 100% | — | — |
| [6 · Workflows MVP](phase-6-workflows-mvp.md) | ✅ COMPLETE | 30/30 | `████████████████████` | 100% | — | — |
| [7 · Hardening/reports](phase-7-hardening-reports-widgets.md) | ✅ COMPLETE | 31/31 | `████████████████████` | 100% | — | — |
| [8 · Office fidelity](phase-8-office-fidelity.md) | ✅ COMPLETE | 26/26 | `████████████████████` | 100% | — | — |
| [9 · Office overhaul](phase-9-office-visual-overhaul.md) | ✅ COMPLETE | 43/43 | `████████████████████` | 100% | — | — |
| [10 · Test hardening](phase-10-test-suite-hardening.md) | ✅ COMPLETE | 48/48 | `████████████████████` | 100% | — | — |
| [11 · Public site](phase-11-public-site-rewrite.md) | ✅ COMPLETE | 42/42 | `████████████████████` | 100% | — | — |
| [12 · Workflow expressions](phase-12-workflow-expressions.md) | ✅ COMPLETE | 33/33 | `████████████████████` | 100% | — | — |
| [13 · Repos first-class](phase-13-repos-first-class.md) | ✅ COMPLETE | 16/16 | `████████████████████` | 100% | — | — |
| [14 · Workflows pt2](phase-14-workflows-connect.md) | ✅ COMPLETE | 23/23 | `████████████████████` | 100% | — | — |
| [15 · Smart intake](phase-15-smart-intake.md) | ✅ COMPLETE | 21/21 | `████████████████████` | 100% | — | — |
| [16 · Bulk add](phase-16-bulk-add.md) | ✅ COMPLETE | 17/17 | `████████████████████` | 100% | — | — |
| [17 · Spawner/tmux](phase-17-spawner-tmux.md) | ✅ COMPLETE | 22/22 | `████████████████████` | 100% | — | — |
| [18 · Reports/exports](phase-18-reports-exports.md) | ✅ COMPLETE | 22/22 | `████████████████████` | 100% | — | — |
| [19 · Onboarding wizard](phase-19-onboarding-wizard.md) | ✅ COMPLETE | 19/19 | `████████████████████` | 100% | — | — |
| [20 · Global search](phase-20-global-search.md) | ✅ COMPLETE | 23/23 | `████████████████████` | 100% | — | — |
| [21 · Notifications](phase-21-notifications.md) | ✅ COMPLETE | 23/23 | `████████████████████` | 100% | — | — |
| [22 · Fleet visibility](phase-22-fleet-visibility.md) | ✅ COMPLETE | 21/21 | `████████████████████` | 100% | — | — |
| [23 · Approvals/autonomy](phase-23-approvals-autonomy.md) | ✅ COMPLETE | 23/23 | `████████████████████` | 100% | — | — |
| [24 · Responsive/PWA](phase-24-responsive-mobile-pwa.md) | ✅ COMPLETE | 22/22 | `████████████████████` | 100% | — | — |
| [25 · @midnite/ui](phase-25-ui-library.md) | ✅ COMPLETE | 17/17 | `████████████████████` | 100% | — | — |
| [26 · Docs app](phase-26-docs-app.md) | ✅ COMPLETE | 19/19 | `████████████████████` | 100% | — | — |
| [27 · Task dependencies](phase-27-task-dependencies.md) | ✅ COMPLETE | 22/22 | `████████████████████` | 100% | — | — |
| [28 · Project planning](phase-28-project-planning-breakdown.md) | ✅ COMPLETE | 18/18 | `████████████████████` | 100% | — | — |
| [29 · Releases/versioning](phase-29-releases-versioning-changelog.md) | ✅ COMPLETE | 14/14 | `████████████████████` | 100% | — | — |
| [30 · Quality gates](phase-30-quality-gates.md) | ✅ COMPLETE | 25/25 | `████████████████████` | 100% | — | — |
| [31 · Office live-activity](phase-31-office-live-activity.md) | ✅ COMPLETE | 22/22 | `████████████████████` | 100% | — | — |
| [32 · CLI live dashboard](phase-32-cli-live-dashboard.md) | ✅ COMPLETE | 19/19 | `████████████████████` | 100% | — | — |
| [33 · Multi-user teams](phase-33-multi-user-teams.md) | ✅ COMPLETE | 55/55 | `████████████████████` | 100% | — | — |
| [34 · Bundle baseline](phase-34-bundle-baseline.md) | ✅ COMPLETE | 23/23 | `████████████████████` | 100% | — | — |
| [35 · RBAC enforcement](phase-35-rbac-enforcement.md) | ✅ COMPLETE | 34/34 | `████████████████████` | 100% | — | — |
| [36 · Template marketplace](phase-36-workflow-template-marketplace.md) | ✅ COMPLETE | 40/40 | `████████████████████` | 100% | — | — |
| [37 · AI code review](phase-37-ai-code-review.md) | ✅ COMPLETE | 35/35 | `████████████████████` | 100% | — | — |
| [38 · Search scoping + service tokens](phase-38-search-scoping-service-tokens.md) | ✅ COMPLETE | 28/28 | `████████████████████` | 100% | — | — |
| [39 · Visual customization](phase-39-visual-customization.md) | 🔄 WIP | 24/25 | `███████████████████░` | 96% | — | — ¹ |
| [40 · Ideas pipeline](phase-40-ideas-pipeline.md) | 🔄 WIP | 43/51 | `█████████████████░░░` | 84% | — | G |
| [41 · Command palette](phase-41-command-palette.md) | 🔄 WIP | 21/33 | `█████████████░░░░░░░` | 64% | — | — ² |

**Headline:** the original 0–38 roadmap is **100% complete**; only 39–41 remain. (Phase 42 was a parallel restatement of Phase 40 — its unique work, the sync-back layer, is folded into Phase 40 as Theme G and the doc was removed on 2026-06-27.)

¹ Phase 39 — themes A–E all landed; the only open box is an `⏳` optional UI-font item in Theme C. No pickable theme.
² Phase 41 — themes A–D all landed; remaining open boxes are the verification checklist + 2 `⏳` deferred items. No pickable theme.

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
- ◻ **G** — Phase-doc ↔ board sync-back *(folded in from former Phase 42 Theme E)*

## Maintenance

`/exec` keeps this file current — do not hand-edit casually:

1. **On pickup** (before the worktree): move the chosen theme letter(s) from the
   `◻ TODO` column into `🔄 WIP`, commit straight to `main`, and push — so other
   `/exec` loops see the claim and skip it.
2. **On merge** (in the branch, before the PR merges): drop the theme letter(s)
   out of `🔄 WIP`, bump the `Done`/`Progress`/`%` cells, and flip the row's
   **Status** to `✅ COMPLETE` once every theme is done. The phase doc + `done.md`
   move in the same branch, so merging auto-updates docs and this index together.
