# Phase 3 — Browser ✅ (state-sync deviation)

> React kanban with live WS; xterm.js terminals embedded per task.

> **Status (2026-06-19): functionally complete**, with one deviation: server-state sync uses **custom polling hooks + manual cache invalidation**, not TanStack Query or a `task.*` WS subscription. The board stays live, but coarsely (poll/refetch) rather than event-driven. See [phase-1-board.md](phase-1-board.md) for the missing task WS broadcast.

## Web

- [ ] TanStack Query setup, REST client pointed at the gateway — _NOT as specified; custom `useApiData`/`usePolling` hooks + `invalidateData()` pub/sub instead ([`web/lib/data-refresh.ts`](../packages/web/lib/data-refresh.ts), [`web/lib/api.ts`](../packages/web/lib/api.ts))_
- [ ] WebSocket subscription, store synced via `task.*` events — _NOT IMPLEMENTED; relies on polling/invalidation_
- [x] Kanban board (`@dnd-kit/core`) — drag cards across the status columns, optimistic update + rollback — [`web/components/board-view.tsx`](../packages/web/components/board-view.tsx)
- [x] Task card: title, repo, status, priority/project badges, PR link when present
- [x] Embedded `xterm.js` terminal with a **2-way** WS stream to a gateway-spawned PTY — live session window for active sessions (`use-terminal-socket` + `live-terminal` + `session-terminal`); static transcript kept for completed/idle
- [x] Form to add a new task (new-task modal posts to `POST /tasks`) — [`web/components/new-task-modal.tsx`](../packages/web/components/new-task-modal.tsx)

## Gateway support

- [x] Live terminal stream — `WS /ws/terminal` (platform-ws `WsAdapter` on the Fastify server) with a bounded ring buffer for scrollback replay; per-session token via `POST /sessions/:id/terminal-token`. On-demand PTY spawn, reattach, idle reap, shutdown cleanup. (Replaces the originally-sketched `GET /tasks/:id/terminal/stream`.)
- [ ] Serve the Next.js production build from the gateway in prod mode — **NOT IMPLEMENTED.** `bootstrap.ts` serves `/uploads/` static only; the web app runs as a separate Next.js server (and is also wrapped by the Electron desktop app).

## Done criteria

- [x] Drag a card across columns in the browser and see the change reflected on the CLI's `midnite list` (after the next poll/refetch)
- [x] Open a running task's detail view and watch the agent's terminal live
