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

- [done.md](done.md)
- [phase-0-scaffold.md](phase-0-scaffold.md)
- [phase-1-board.md](phase-1-board.md)
- [phase-2-agents.md](phase-2-agents.md)
- [phase-3-browser.md](phase-3-browser.md)
- [phase-4-inference.md](phase-4-inference.md)
- [phase-5-polish.md](phase-5-polish.md)
- [open-decisions.md](open-decisions.md)
