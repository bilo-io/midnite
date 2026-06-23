# Phase 3 — Browser ✅

> React kanban with live WS; xterm.js terminals embedded per task.

> **Status (2026-06-23): complete.** Server-state now runs on **TanStack Query** (PR #125) — `useApiData`/`usePolling` are thin wrappers over `useQuery` (kept the same external API so call-sites didn't churn), `QueryClientProvider` is mounted in the layout, and `invalidateData()` calls `queryClient.invalidateQueries()`. The `task.*` WS subscription (**Phase 7 A6**, `e2b9b73`) drives the board: an event triggers `invalidateData()` → immediate refetch, with `refetchInterval` polling as a fallback. WS sync stays a coarse invalidate-and-refetch rather than patching a normalized cache — a fine for v1; finer-grained cache patching would be a later optimisation, not a gap. See [phase-1-board.md](phase-1-board.md).

## Web

- [x] **TanStack Query setup, REST client pointed at the gateway** — DONE (PR #125). The data layer is TanStack Query: a singleton `QueryClient` ([`web/lib/query-client.ts`](../packages/web/lib/query-client.ts), `staleTime:0` + `retry:false` to match prior behaviour) provided in [`(main)/layout.tsx`](../packages/web/app/(main)/layout.tsx); `useApiData`/`usePolling` wrap `useQuery` (with `refetchInterval`) keeping their old signatures; `invalidateData()` ([`web/lib/data-refresh.ts`](../packages/web/lib/data-refresh.ts)) broadcasts a global invalidation via the shared client. _(The earlier "custom hooks, not TanStack Query" note predated PR #125 and was stale.)_
- [x] WebSocket subscription, store synced via `task.*` events — **DONE (Phase 7 A6, `e2b9b73`).** [`useTaskEvents`](../packages/web/hooks/use-task-events.ts) subscribes to `/ws/tasks` (capped-backoff reconnect), mounted app-wide via [`LiveData`](../packages/web/components/live-data.tsx) in [`(main)/layout.tsx`](../packages/web/app/(main)/layout.tsx). _Sync model: an event triggers `invalidateData()` (coarse refetch) + a client fan-out ([`task-events.ts`](../packages/web/lib/task-events.ts)) rather than patching a normalized store — polling remains as a fallback._
- [x] Kanban board (`@dnd-kit/core`) — drag cards across the status columns, optimistic update + rollback — [`web/components/board-view.tsx`](../packages/web/components/board-view.tsx)
- [x] Task card: title, repo, status, priority/project badges, PR link when present
- [x] Embedded `xterm.js` terminal with a **2-way** WS stream to a gateway-spawned PTY — live session window for active sessions (`use-terminal-socket` + `live-terminal` + `session-terminal`); static transcript kept for completed/idle
- [x] Form to add a new task (new-task modal posts to `POST /tasks`) — [`web/components/new-task-modal.tsx`](../packages/web/components/new-task-modal.tsx)

## Gateway support

- [x] Live terminal stream — `WS /ws/terminal` (platform-ws `WsAdapter` on the Fastify server) with a bounded ring buffer for scrollback replay; per-session token via `POST /sessions/:id/terminal-token`. On-demand PTY spawn, reattach, idle reap, shutdown cleanup. (Replaces the originally-sketched `GET /tasks/:id/terminal/stream`.)
- [x] ✅ DONE (PR #93, 2026-06-22) — Serve the Next.js production build from the gateway in prod mode. `gateway.webDir` (or `MIDNITE_WEB_DIR`) points at the static export (`packages/web/out`); [`lib/serve-web.ts`](../packages/gateway/src/lib/serve-web.ts) mounts it at `/` via `@fastify/static` (mirroring `/uploads/`), so one process serves API + UI in prod. Off unless set (dev keeps the standalone `next` server). The export is fully static, so the controllers' specific routes keep priority over the `/*` file mount.

## Done criteria

- [x] Drag a card across columns in the browser and see the change reflected on the CLI's `midnite list` (after the next poll/refetch)
- [x] Open a running task's detail view and watch the agent's terminal live
