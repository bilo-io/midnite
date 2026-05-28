# Phase 3 — Browser

> React kanban with live WS; xterm.js terminals embedded per task.

## Web

- [ ] TanStack Query setup, REST client pointed at the gateway
- [ ] WebSocket subscription, store synced via `task.*` events
- [ ] Kanban board (`@dnd-kit/core`) — drag cards across the 5 status columns, optimistic update + WS reconcile
- [ ] Task card: title, repo, agent slot, status, PR link when present
- [ ] Task detail panel/route with embedded `xterm.js` streaming the agent's pty output
- [ ] Form to add a new task (single text field, posts to `POST /tasks`)

## Gateway support

- [ ] `GET /tasks/:id/terminal/stream` — SSE or WS endpoint streaming the ring buffer
- [ ] Serve the Next.js production build from the gateway in prod mode (optional — INITIAL_PLAN.md hints at this)

## Done criteria

- [ ] Open `http://localhost:3000`, drag a `todo` card onto `backlog`, see the change reflected on the CLI's `midnite list`
- [ ] Open a running task's detail view and watch the agent's terminal live
