# Phase 32 — CLI live dashboard (`midnite watch`)

> The CLI ([`packages/cli`](../packages/cli)) is today line-based — `commander` + `cli-table3`, one-shot `console.log` output (`add`, `list`, `search`, `workflow …`). **Phase 32 gives it a live face.** A new `midnite watch` command opens a full-screen, terminal-native dashboard — the board, the agent pool, and live session logs — that subscribes to the gateway WS and updates in real time, for people who live in the terminal and don't want to alt-tab to the browser kanban.

> Scope guardrails: this **builds on existing seams** — the REST snapshots (`GET /tasks`, `GET /sessions`, `GET /pool`), the typed client `createClient()` in [`client.ts`](../packages/cli/src/client.ts), and the WS-subscribe precedent already used by `midnite workflow watch` (`gatewayWsUrl()` in [`workflow.ts`](../packages/cli/src/workflow.ts) + the `applyWorkflowEvent` reducer in [`workflow-run-reducer.ts`](../packages/shared/src/workflow-run-reducer.ts)). The CLI stays a **pure HTTP/WS client of the gateway** — no gateway internals, no new gateway endpoints (reuse what exists). Commands stay thin: parse → call the typed client → render. **Out of scope:** mouse support (keyboard-first), session control (start/stop/kill an agent — that's a later autonomy/control phase), office-style visuals, multiplayer, and Windows-terminal edge cases (best-effort, not a goal).

> Effort tags: **S** small · **M** medium · **L** large.

---

## Theme A — TUI foundation, render loop & WS seam — **M**

The scaffold every panel sits in. The CLI currently has **no TUI framework** (deps are just `commander` + `cli-table3`); this introduces one and the `watch` command.

### A1. ink app + `watch` command — **M** ✅ DONE (PR #149, 2026-06-23)
- [x] Add **ink@5.x** (React for the terminal — **Decisions §1**) + `react@18` to [`packages/cli/package.json`](../packages/cli/package.json); register a `watch` command in [`index.ts`](../packages/cli/src/index.ts) that resolves the gateway URL (`resolveBaseUrl`) and renders the dashboard app. `gatewayWsUrl` moved to `ws.ts` so both the new dashboard and `workflow watch` share it.
- [x] Full-screen **alt-screen** app (ink `<Box>` flexbox layout — board / pool / logs regions) with a top status bar (gateway URL, connection state, last-update tick). Seeds board and pool from REST snapshots (`GET /tasks`, `GET /pool`) on mount; applies live `task.*` events from `/ws/tasks` incrementally.
- [x] **Clean teardown:** restore the terminal (leave alt-screen, show cursor) on `q`/`Ctrl-C`/`SIGINT`/uncaught error — never leave the user's terminal wedged. Unsubscribe the WS on unmount. 11 unit tests (StatusBar states, BoardPanel, PoolPanel) in `src/watch/Dashboard.test.tsx`.

### A2. Reusable WS-subscribe helper — **S**
- [x] ✅ Factor the hand-rolled WS-subscribe currently inline for `workflow watch` (`gatewayWsUrl()` + the `new WebSocket` + subscribe handshake) into **one small reusable helper** in the CLI (e.g. `cli/src/ws.ts`): connect, send the `{type:'subscribe'}` handshake, validate frames against a shared schema, reconnect-with-backoff, and a teardown handle. `watch` and `workflow watch` both consume it.
- [x] ✅ Keep it **CLI-local**, not in `shared` — `web` already has its own browser `WebSocket` client ([`use-task-events.ts`](../packages/web/hooks/use-task-events.ts)); this is the Node-side equivalent and there's no third consumer (**Decisions §2**).

---

## Theme B — Live board panel — **M**

The headline panel: the kanban, live, in the terminal.

### B1. Board snapshot + columns — **S–M** ✅ DONE (PR #149 + #154)
- [x] ✅ (PR #149/#154) Initial board seeded from `GET /tasks`; columns for backlog/todo/wip/waiting/done; compact task cards: short id · priority arrow · title · `[repo]`.

### B2. Live updates via a board reducer — **M** ✅ DONE (PR #154)
- [x] ✅ (PR #154) WS subscription via `openWs` helper; `task.created/updated/deleted/bulkCreated` applied live.
- [x] ✅ (PR #154) `applyTaskEvent` pure reducer in `shared/src/task-board-reducer.ts`; 8 unit tests. `tasks.bulkCreated` → refetch (IDs only).
- [x] ✅ (PR #154) No flicker — ink re-renders from reduced state; no full refetch per event.

---

## Theme C — Agent slots / pool panel — **S–M**

What's running *right now*.

### C1. Pool panel — **S–M** ✅ DONE (PR #149)
- [x] ✅ (PR #149) Pool seeded from `GET /pool`; one row per slot — idle/busy, taskId (8 chars), pid.
- [x] ✅ (PR #149) Slot state derived from live `task.*` events — `fetchSnapshots()` called on each board event, pool re-seeded. Source noted: REST poll-on-task-event (no dedicated slot WS event needed).

---

## Theme D — Live logs panel — **M/L**

The ambitious panel — sequenced last, and shippable on its own if it proves heavy (**Decisions §4**).

### D1. Session selection — **S** ✅ DONE (PR #156)
- [x] ✅ (PR #156) Tab cycles wip tasks; selected task highlighted with `▶` in BoardPanel; selected session shown in LogPanel header.

### D2. Streamed scrollback — **M/L** ✅ DONE (PR #156)
- [x] ✅ (PR #156) Terminal WS via token (`GET /sessions/:id/terminal-token`); noHandshake + `attach` message; base64 decode + ANSI strip + 100-line cap. Switches cleanly on session change (old WS closed). Exited footer on `status.exited/dead`.

---

## Theme E — Keyboard navigation & task moves — **M**

Navigation + the single mutation we allow (**Decisions §5** — read-only otherwise).

### E1. Navigation & selection — **S–M**
- [ ] Move focus between panels (board ↔ pool ↔ logs) and between columns/cards with arrow/`hjkl` keys; a visible focus indicator; a help/footer line of keybindings.

### E2. Move a task's status — **M**
- [ ] On a focused task, move its status (e.g. `wip → waiting → done`) via `client().moveTask(id, status)` — the **only** mutation in this phase. Optimistic update reconciled by the next `task.updated` event. No destructive actions (no kill/stop/retry — explicitly out of scope).

---

## Files this phase touches (map)

- **CLI app + command:** [`cli/src/index.ts`](../packages/cli/src/index.ts) (register `watch`), new `cli/src/watch/` (ink app + panels: board, pool, logs), [`cli/package.json`](../packages/cli/package.json) (add `ink` + `react`)
- **CLI client + WS:** [`cli/src/client.ts`](../packages/cli/src/client.ts) (reuse `createClient`; possibly add `listSessions`/`getPool` if missing), new `cli/src/ws.ts` (reusable WS-subscribe), [`cli/src/workflow.ts`](../packages/cli/src/workflow.ts) (migrate its inline WS onto the shared helper)
- **Shared (contract):** new `shared/src/task-board-reducer.ts` (`applyTaskEvent`), referencing [`events/task.ts`](../packages/shared/src/events/task.ts), [`events/terminal.ts`](../packages/shared/src/events/terminal.ts), [`task.ts`](../packages/shared/src/task.ts), [`session.ts`](../packages/shared/src/session.ts)
- **Gateway (read-only, no changes expected):** existing routes — [`tasks/tasks.controller.ts`](../packages/gateway/src/tasks/tasks.controller.ts), [`sessions/sessions.controller.ts`](../packages/gateway/src/sessions/sessions.controller.ts), [`pool/pool.controller.ts`](../packages/gateway/src/pool/pool.controller.ts); WS at [`tasks/tasks.gateway.ts`](../packages/gateway/src/tasks/tasks.gateway.ts)
- **Docs:** update the CLI README and append to [`done.md`](done.md) as items land.

## Verification

- `moon run gateway:dev` (with a couple of tasks/sessions running), then `midnite watch` (via `moon run cli:dev -- watch`):
  - [ ] A full-screen dashboard opens; the **board panel** shows columns and live-updates as tasks are added/moved (in the web UI or via `midnite add`/`move`) **without** a manual refresh.
  - [ ] The **pool panel** shows agent slots (idle/busy · task · pid) and tracks spawns/exits.
  - [ ] Selecting a running session streams its **live logs** into the scrollback panel; switching sessions swaps cleanly; an exited session shows a clear footer.
  - [ ] Keyboard nav moves focus between panels/columns; moving a focused task's status updates both the TUI and the gateway (confirm in the web board).
  - [ ] Pressing `q` / `Ctrl-C` **restores the terminal cleanly** (no wedged alt-screen, cursor visible).
- `moon run :typecheck`, `moon run :lint`, `moon run :test` green — including unit tests for `applyTaskEvent` (pure reducer) and snapshot tests of rendered panels (ink testing util / `ink-testing-library`). (Run web tests from the **primary checkout**, not a `.git` worktree.)

## Decisions / open questions

1. **Renderer** — *resolved:* **ink (React for the terminal)**. Declarative flexbox layout, handles alt-screen + redraw, and matches the React-heavy repo (the web team already knows React). Trade-off accepted: it adds `ink` + `react` to an otherwise lean CLI (`commander` + `cli-table3` only).
2. **WS helper location** — *resolved:* **CLI-local** (`cli/src/ws.ts`), not `shared`. `web` has its own browser `WebSocket` client; there's no third Node consumer, so promoting to `shared` would be premature. Revisit if a third consumer appears.
3. **`applyTaskEvent` reducer location** — *recommend (default in B2):* **`shared`** — it's pure, contract-shaped state derivation, unit-testable, and the web board could later adopt it instead of refetch-on-event. Alternative: keep it CLI-local if it ends up CLI-specific.
4. **Theme D (live logs) commitment** — *recommend:* **in scope but sequenced last**, and shippable independently. If the per-session terminal streaming proves heavy (backpressure, ANSI handling), land A–C + E first and let D follow as its own slice — the dashboard is useful without it.
5. **Interactivity** — *resolved:* **read-only + task moves**. The only mutation is `moveTask`; no session start/stop/kill/retry this phase (those belong with a later control/autonomy phase, gated by Phase 23 approvals).
6. **Pool slot-change source** — *open:* if the gateway doesn't emit a dedicated slot-change event on the board WS, derive busy/idle from the live board + a sessions snapshot refreshed on `task.*` events. Confirm the source while building C1 and document what was chosen (no new gateway endpoint either way).
