# Open decisions

From [`docs/INITIAL_PLAN.md`](../docs/INITIAL_PLAN.md) §Open decisions to settle. **All three are now resolved** (2026-06-19) — kept here as a record.

---

## 1. Does `waiting` hold its agent slot?

**Resolution: YES (as recommended).**

Claude Code blocks on input, so the PTY session literally sits there — freeing the slot would orphan it. Implemented as the configurable `agent.waitingHoldsSlot` (default `true`) in [`shared/src/config.ts`](../packages/shared/src/config.ts). Releasing/suspending `waiting` sessions remains an unbuilt Phase-5 option ([phase-5-polish.md](phase-5-polish.md)).

**Status:** ✅ resolved.

---

## 2. First execution backend

**Resolution: `pty` first** (as recommended).

`node-pty` is the only implemented backend; it powers the gateway-managed, browser-streamable xterm.js session (Phase 3). The `tmux` / `warp` / `iterm` backends — and a pluggable `Spawner` interface to select between them — are still outstanding ([phase-5-polish.md](phase-5-polish.md)).

**Status:** ✅ resolved (native backends deferred to Phase 5, not yet built).

---

## 3. Where does midnite live?

**Resolution: new standalone repo** (as recommended).

midnite is a standalone git repository at `~/Dev/midnite` with its own history, CI, and release workflow — not a folder under another workspace.

**Status:** ✅ resolved.
