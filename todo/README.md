# todo/ — progress tracker

A lightweight place to track what's been done and what's outstanding, without leaning on an external issue tracker.

## Layout

- `done.md` — append-only log of completed work, **most-recent first**.
- `phase-N-*.md` — one file per phase from [`docs/INITIAL_PLAN.md`](../docs/INITIAL_PLAN.md) §Phased build plan. Each file holds the outstanding checklist for that phase.
- `open-decisions.md` — the open design decisions that still need answers.

## Conventions

- Items live as GitHub-flavored checkboxes: `- [ ]` for outstanding, `- [x]` for done.
- When an item is finished, **move it** from its phase file into `done.md` with a date — don't just tick the box in place. Keeps the phase files focused on what's left.
- New unplanned work goes into the relevant phase file (or `phase-5-polish.md` if it doesn't fit anywhere else).
- Resolved open decisions: update the `Status:` line in `open-decisions.md` and copy the resolution into `done.md`.
- **Adding a new phase file: claim the number in the [Quick links](#quick-links) index in the *same commit*.** Phase docs get added from parallel sessions, so the next free number isn't reliable until it's listed here — the index is the source of truth for which numbers are taken. Pick the lowest unused number, add the `phase-N-*.md` file and its index line together, and you won't collide with a doc another session is writing.

## Quick links

**Phases** (✅ done · ⚠️ partial · ◻ planned):

- [phase-0-scaffold.md](phase-0-scaffold.md) — Scaffold ✅
- [phase-1-board.md](phase-1-board.md) — Board you drive by hand ✅
- [phase-2-agents.md](phase-2-agents.md) — Agents ✅
- [phase-3-browser.md](phase-3-browser.md) — Browser ✅
- [phase-4-inference.md](phase-4-inference.md) — Inference ⚠️
- [phase-5-polish.md](phase-5-polish.md) — Polish ⚠️
- [phase-6-workflows-mvp.md](phase-6-workflows-mvp.md) — Workflows (node-based builder)
- [phase-7-hardening-reports-widgets.md](phase-7-hardening-reports-widgets.md) — Hardening, reports & widgets
- [phase-8-office-fidelity.md](phase-8-office-fidelity.md) — Office fidelity & presence
- [phase-9-office-visual-overhaul.md](phase-9-office-visual-overhaul.md) — Office visual overhaul
- [phase-10-test-suite-hardening.md](phase-10-test-suite-hardening.md) — Test suite hardening & visual previews
- [phase-11-public-site-rewrite.md](phase-11-public-site-rewrite.md) — Public site rewrite
- [phase-12-workflow-expressions.md](phase-12-workflow-expressions.md) — Workflow data flow & expressions ◻
- [phase-13-repos-first-class.md](phase-13-repos-first-class.md) — Repos as a first-class entity ⚠️ (Theme A done)
- [phase-14-workflows-connect.md](phase-14-workflows-connect.md) — Workflows part 2: vault, integrations, CLI ◻
- [phase-15-smart-intake.md](phase-15-smart-intake.md) — Smart intake & inference (bulk, URL/GitHub context, answers, knowledge files) ✅
- [phase-16-bulk-add.md](phase-16-bulk-add.md) — Bulk / paste add (standalone build-out of P15 Theme A) ◻
- [phase-17-spawner-tmux.md](phase-17-spawner-tmux.md) — Pluggable spawner & durable tmux sessions ◻
- [phase-18-reports-exports.md](phase-18-reports-exports.md) — Reports & exports across the app (tasks, projects, workflow runs) ◻
- [phase-19-onboarding-wizard.md](phase-19-onboarding-wizard.md) — First-run onboarding & setup wizard ◻
- [phase-20-global-search.md](phase-20-global-search.md) — Global search (full-text across the app) ✅
- [phase-21-notifications.md](phase-21-notifications.md) — Notifications & alerting (in-app, browser, webhook) ⚠️ (A–C done — feed + channels + web center; D desktop-native remains)
- [phase-22-fleet-visibility.md](phase-22-fleet-visibility.md) — Fleet visibility: ops metrics & PR lifecycle ◻
- [phase-23-approvals-autonomy.md](phase-23-approvals-autonomy.md) — Approvals & autonomy policy ◻
- [phase-24-responsive-mobile-pwa.md](phase-24-responsive-mobile-pwa.md) — Responsive & mobile companion (PWA) ◻
- [phase-25-ui-library.md](phase-25-ui-library.md) — @midnite/ui: reusable component library & design system ✅
- [phase-26-docs-app.md](phase-26-docs-app.md) — Docs app (packages/docs) on @midnite/ui ◻
- [phase-27-task-dependencies.md](phase-27-task-dependencies.md) — Task dependencies & dependency-aware scheduling ◻
- [phase-28-project-planning-breakdown.md](phase-28-project-planning-breakdown.md) — Project planning & structured task breakdown ◻

**Meta:**

- [done.md](done.md) — completed-work log (most-recent first)
- [outstanding.md](outstanding.md) — remaining gaps vs. the original 1–5 plan
- [open-decisions.md](open-decisions.md) — design decisions (all resolved)
