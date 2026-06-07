# Phase 3 — Browser

> React kanban with live WS; xterm.js terminals embedded per task.

## Web

- [ ] TanStack Query setup, REST client pointed at the gateway
- [ ] WebSocket subscription, store synced via `task.*` events
- [ ] Kanban board (`@dnd-kit/core`) — drag cards across the 5 status columns, optimistic update + WS reconcile
- [ ] Task card: title, repo, agent slot, status, PR link when present
- [x] Embedded `xterm.js` terminal with a **2-way** WS stream to a gateway-spawned PTY — live session window for active sessions (`use-terminal-socket` + `session-terminal` + `session-terminal-modal`); static transcript kept for completed/idle
- [ ] Form to add a new task (single text field, posts to `POST /tasks`)

## Gateway support

- [x] Live terminal stream — `WS /ws/terminal` (platform-ws `WsAdapter` on the Fastify server) with a bounded ring buffer for scrollback replay; per-session token via `POST /sessions/:id/terminal-token`. On-demand PTY spawn, reattach, idle reap, shutdown cleanup. (Replaces the originally-sketched `GET /tasks/:id/terminal/stream`.)
- [ ] Serve the Next.js production build from the gateway in prod mode (optional — INITIAL_PLAN.md hints at this)

## Done criteria

- [ ] Open `http://localhost:3000`, drag a `todo` card onto `backlog`, see the change reflected on the CLI's `midnite list`
- [ ] Open a running task's detail view and watch the agent's terminal live
