# Open decisions

From [`docs/INITIAL_PLAN.md`](../docs/INITIAL_PLAN.md) §Open decisions to settle. Each entry has a **Status** line — update it when resolved and copy the resolution to [`done.md`](done.md).

---

## 1. Does `waiting` hold its agent slot?

**Recommendation:** yes, in v1.

Claude Code blocks on input, so the pty session literally sits there. Holding the slot is simplest and matches reality; releasing it (to start more `todo`s) means suspending the waiting session — more powerful but harder.

**Status:** open. Decide before starting Phase 2.

---

## 2. First execution backend

**Recommendation:** `pty` first, native terminal windows second.

`pty` gives the gateway-managed, browser-streamable session that powers the Phase 3 xterm.js UX. Native (tmux/warp/iterm) backends come later in Phase 5.

**Status:** open. Likely resolves to `pty` at start of Phase 2.

---

## 3. Where does midnite live?

**Recommendation:** new standalone repo (current location `~/Dev/midnite`).

The alternative — a folder under an existing workspace — would entangle midnite's release/PR cycle with the host repo.

**Status:** open. Current footprint is a standalone directory; needs a `git init` + first commit to fully resolve.
