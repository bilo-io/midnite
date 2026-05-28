# Phase 1 — Board you drive by hand

> Gateway + SQLite store + REST/WS + CLI `add` / `list` / `move`. No agents yet. Proves the data model and live updates.

## Gateway

- [ ] Drizzle schema for `tasks` and `task_events` tables (see [`packages/shared/src/task.ts`](../packages/shared/src/task.ts))
- [ ] Better-sqlite3 connection + drizzle migrations (`drizzle/0000_init.sql`)
- [ ] `TasksModule` with a `TasksService` (in-memory backed by drizzle) and a `TasksController`
  - [ ] `POST /tasks` — create a task in `backlog`
  - [ ] `GET /tasks` — list, optional `?status=`
  - [ ] `PATCH /tasks/:id` — move status / update title
  - [ ] `DELETE /tasks/:id` — abandon
- [ ] WebSocket gateway pushing `task.created` / `task.updated` / `task.deleted` events
- [ ] Config loader (`MidniteConfigModule`) reading `midnite.json` at startup

## CLI

- [ ] Replace `not implemented yet` stubs with real REST calls (point at `gateway.port` from config)
- [ ] `midnite add <title>` → `POST /tasks`
- [ ] `midnite list [--status]` → `GET /tasks`
- [ ] `midnite move <id> <status>` → `PATCH /tasks/:id`
- [ ] `midnite serve` → spawn the gateway (`packages/gateway/dist/main.js`)

## Done criteria

- [ ] Two terminals: `midnite serve` in one, `midnite add "buy milk" && midnite list` in another — task appears
- [ ] WS client (e.g. `wscat`) connected to `ws://localhost:7777` receives a `task.created` event when `midnite add` runs
