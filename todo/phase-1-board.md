# Phase 1 — Board you drive by hand ✅ (one deviation)

> Gateway + SQLite store + REST/WS + CLI `add` / `list` / `move`. No agents yet. Proves the data model and live updates.

> **Status (2026-06-19): functionally complete.** One deviation from the spec: there is **no `task.*` WebSocket broadcast** — live board updates are delivered by polling + manual cache invalidation on the web side, not a WS subscription. See [phase-3-browser.md](phase-3-browser.md) and the outstanding-work note in [done.md](done.md).

## Gateway

- [x] Drizzle schema for `tasks` and `task_events` tables (plus `task_attachments`, `task_links`) — [`gateway/src/db/schema.ts`](../packages/gateway/src/db/schema.ts)
- [x] Better-sqlite3 connection + drizzle migrations (`0000_init` onward; 22+ forward-only migrations)
- [x] `TasksModule` with a `TasksService` (drizzle-backed) and a `TasksController`
  - [x] `POST /tasks` — create a task (multipart: prompt, status, priority, projectId, images)
  - [x] `GET /tasks` — list, optional `?status=` (and `?projectId=`)
  - [x] `PATCH /tasks/:id` — move status — _split into `PATCH /tasks/:id/status` (+ `/tasks/:id/project`) rather than one generic PATCH_
  - [x] `DELETE /tasks/:id` — abandon/remove — _archive-gated (archive first, then delete); abandon is also reachable via stop/cancel transitions_
- [ ] WebSocket gateway pushing `task.created` / `task.updated` / `task.deleted` events — **NOT IMPLEMENTED.** `task_events` rows are written, but no WS gateway broadcasts them. (WS infra exists, but only for terminals and workflow runs.)
- [x] Config loader (`MidniteConfigModule`) reading `midnite.json` at startup

## CLI

- [x] Real REST calls against `gateway.port` from config (no more `not implemented yet` stubs) — [`cli/src/index.ts`](../packages/cli/src/index.ts), [`cli/src/client.ts`](../packages/cli/src/client.ts)
- [x] `midnite add <prompt>` → `POST /tasks`
- [x] `midnite list [--status]` → `GET /tasks`
- [x] `midnite move <id> <status>` → `PATCH /tasks/:id/status`
- [x] `midnite serve` → boots the gateway in-process (`@midnite/gateway/bootstrap` → `startGateway()`)

## Done criteria

- [x] Two terminals: `midnite serve` in one, `midnite add "buy milk" && midnite list` in another — task appears
- [ ] WS client (e.g. `wscat`) receives a `task.created` event when `midnite add` runs — **not met** (no task WS broadcast; see above)
