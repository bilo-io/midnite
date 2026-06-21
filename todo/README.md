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
- [phase-13-repos-first-class.md](phase-13-repos-first-class.md) — Repos as a first-class entity ◻
- [phase-14-workflows-connect.md](phase-14-workflows-connect.md) — Workflows part 2: vault, integrations, CLI ◻

**Meta:**

- [done.md](done.md) — completed-work log (most-recent first)
- [outstanding.md](outstanding.md) — remaining gaps vs. the original 1–5 plan
- [open-decisions.md](open-decisions.md) — design decisions (all resolved)
