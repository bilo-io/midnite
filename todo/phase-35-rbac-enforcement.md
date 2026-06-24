# Phase 35 — RBAC Enforcement

> Phase 33 ([phase-33-multi-user-teams.md](phase-33-multi-user-teams.md)) adds user identities, JWT sessions, team membership, and ownership columns (`created_by`, `team_id`) on every entity — but **defers enforcement**: reads return all rows, writes are ungated. Phase 35 closes that gap. It wires the ownership columns into actual **read filters** (scoped list queries), **write guards** (role-checked mutations), **live event routing** (WS broadcasts reach only team members), and **notification targeting** (dispatches go to the right audience). The result: user A cannot see, modify, or receive events for user B's private tasks — multi-user is correctness, not just cosmetic.

> **Dependency:** Phase 35 requires Phase 33 to be shipped — the `users`, `teams`, and `team_memberships` tables, the `created_by`/`team_id` columns on all entities, the JWT guard, and the `@CurrentUser()` param decorator must all exist before this phase starts. Do not interleave.

> **Scope guardrails (CLAUDE.md).** Scoping is a service + repository concern — controllers stay thin (inject `@CurrentUser()`, pass to service). Repositories gain an optional `TeamScope` param and add WHERE clauses; they do not grow business rules. The `RoleGuard` is a NestJS guard in `auth/`; role-resolution (read team membership) lives in `TeamsService` (Phase 33), not duplicated here. Search index scoping (adding `team_id` to the FTS5 table) is deliberately deferred — it is a standalone migration effort and does not block read/write correctness. The scheduler's ready-task pool remains global — team isolation is a read/write concern, not a scheduling one.

> Effort tags: **S** small · **M** medium · **L** large. Themes are ordered **A → B → D/E** (scoped reads land before write guards; WS + notifications are independent once A is stable). Every box starts unchecked — this is net-new work.

---

## Current baseline (what Phase 33 leaves behind)

- `tasks`, `repos`, `workflows`, `sessions` all have `created_by TEXT` (nullable) and `team_id TEXT` (nullable) columns, populated on creates after Phase 33 ships.
- `team_memberships` table holds `(team_id, user_id, role)` — used to check roles in Theme B.
- `@CurrentUser()` param decorator is wired in `auth/` — controllers can inject `{ id: string; teamId: string | null }` from the JWT payload.
- No WHERE clauses on any list query today — everything is still returned globally.

---

## Theme A — Scoped list queries — **M**

Gate every entity list to the requesting user's personal + team scope. **403 on denied reads is wrong** (leaks entity existence); **silent omit** is correct — a resource outside your scope simply isn't in the list.

### A1. `TeamScope` type + repository pattern — **S**
- [x] Define `TeamScope = { userId: string; teamId: string | null }` in [`packages/shared/src/team.ts`](../packages/shared/src/team.ts). Used as the single scoping token passed from controller → service → repository; never carries role (that's for write guards).
- [x] Repository WHERE-clause pattern: `(created_by = :userId) OR (team_id IS NOT NULL AND team_id = :teamId)`. A user sees their own personal tasks + all tasks scoped to their current team. A user with no team (`teamId = null`) sees only their own. Existing rows with `created_by = null` remain globally visible (legacy single-user data — see Decision §1).

### A2. Tasks list scoping — **S**
- [x] `TasksRepository.listTasks(status?, projectId?, scope?: TeamScope)` — add optional `scope` param; when present, wrap the existing WHERE with the pattern from A1. `listReadyTodoTasks()` stays **unscoped** (scheduler is global — see Decision §2). `getTask(id, scope?)` returns 404 (not 403) when the task exists but is outside scope.
- [x] `TasksService.listTasks(status?, projectId?, scope?)` passes scope through. `TasksController.list()` injects `@CurrentUser()` and builds the scope; existing callers without a user context (health checks, tests with static token) pass `scope = undefined` → no filter (backward compat).

### A3. Repos list scoping — **S**
- [x] `ReposRepository.list(scope?: TeamScope)` — add optional scope; same WHERE pattern. `getById` / `getByName` gain an optional scope check and return `undefined` (→ 404) when out of scope.
- [x] `ReposService` and `ReposController` updated accordingly.

### A4. Workflows list scoping — **S**
- [x] `WorkflowsRepository.listWorkflowRows(scope?: TeamScope)` — optional scope; same pattern. `listScheduledEnabledRows()` stays **unscoped** (the scheduler runs all scheduled workflows regardless of team — same principle as A2). `getWorkflowRow(id, scope?)` returns `undefined` when out of scope.
- [x] `WorkflowsService` and `WorkflowsController` updated accordingly.

### A5. Scoping tests — **S**
- [x] Integration tests (`:memory:` SQLite): seed two users in different teams, create tasks for each, assert each user's list returns only their own + team items. Cross-team task is absent. Legacy null-`created_by` task appears for both (Decision §1 policy enforced here).

---

## Theme B — Role-based write guards — **M**

Enforce team roles on mutation routes. **403** is correct for denied writes (unlike reads).

### B1. `RoleGuard` + `@RequiresRole()` decorator — **M**
- [x] `RoleGuard` ([`auth/role.guard.ts`](../packages/gateway/src/auth/role.guard.ts)) — a NestJS `CanActivate` guard: reads `@CurrentUser()` from the request, calls `TeamsService.getMembership(userId, teamId)` to resolve the role, compares against the `@RequiresRole(minRole)` metadata. Role hierarchy: `viewer < member < admin < owner`. If the user has no team (`teamId = null`) or is not a member of the resource's team, return 403. Exempt: routes without `@RequiresRole` are unaffected.
- [x] `@RequiresRole(role: TeamRole)` decorator (`auth/decorators/require-role.decorator.ts`) — sets NestJS route metadata; consumed by `RoleGuard`.
- [x] Register `RoleGuard` as a **route-level guard** (not global) — it must be applied explicitly so existing un-teamed routes (health, hooks, static-token paths) are untouched.

### B2. Write guard application — **S–M**
- [x] **Tasks:** `POST /tasks` → `member+`; `PATCH /tasks/:id` → `member+`; `DELETE /tasks/:id` → `admin+`; all sub-resource mutations (links, dependencies, check, breakdown, bulk) → `member+`.
- [x] **Repos:** `POST /repos` → `member+`; `PATCH /repos/:id` → `admin+`; `DELETE /repos/:id` → `admin+`.
- [x] **Workflows:** `POST /workflows` → `member+`; `PATCH /workflows/:id` → `admin+`; `DELETE /workflows/:id` → `admin+`; `POST /workflows/:id/run` → `member+`; `POST /workflows/:id/duplicate` → `member+`; `POST /workflows/:id/webhook/rotate` → `admin+`.
- [x] **Teams:** already enforced at the service layer via `InsufficientTeamRoleError` (Phase 33); `requireAuth()` in the controller gates on authentication.
- [x] Role resolution is **cached per request** (a single `getMembership` call at guard time, result stored on `req`) — not re-queried per-field.

### B3. Ownership check helper — **S**
- [x] `OwnershipService` ([`auth/ownership.service.ts`](../packages/gateway/src/auth/ownership.service.ts)) — a small, injectable helper: `isOwner(entityCreatedBy, userId)` and `resolveRequiredRole(entityCreatedBy, requestingUserId, baseRole)` (promotes `baseRole` to `admin` when the entity is owned by someone else). Used by task/repo/workflow services on update routes so the "own vs others' item" distinction stays out of controllers.

---

## Theme D — WebSocket event scoping — **M**

The gateway currently broadcasts `task.updated`, `task.created`, `task.deleted`, `workflow.run.*`, and pool events to **all connected clients**. With multiple users, this leaks private tasks across team boundaries. Fix: track each WS connection's user + team context; filter broadcasts to eligible recipients.

### D1. Per-connection user context — **S–M**
- [ ] At WS handshake time, extract the JWT from the query param (`?token=<jwt>`, Phase 33 convention) and decode it to `{ userId, teamId }`. Store on the socket instance as `client.data.userId` / `client.data.teamId`. Reject the handshake (close with 4001) if the token is missing or invalid — unauthenticated WS is no longer allowed once JWT mode is active (legacy static-token bearer is still accepted during transition, producing `userId = null`).
- [ ] Add a `ConnectionRegistry` ([`ws/connection-registry.ts`](../packages/gateway/src/ws/connection-registry.ts)) — a lightweight in-memory map of `teamId → Set<Socket>` and `userId → Set<Socket>` maintained on connect/disconnect. Used by broadcast helpers.

### D2. Scoped broadcast helpers — **S**
- [ ] `WsBroadcast` service ([`ws/ws-broadcast.service.ts`](../packages/gateway/src/ws/ws-broadcast.service.ts)): `toTeam(teamId, event, payload)` — sends to all sockets in `ConnectionRegistry[teamId]`; `toUser(userId, event, payload)` — sends to that user's sockets only; `toAll(event, payload)` — retained for system-level events (health, gateway restart). Replace the raw `server.emit()` calls in existing gateways with `WsBroadcast` calls.
- [ ] **Task events** (`tasks.gateway.ts`): `task.created`, `task.updated`, `task.deleted` → `toTeam(task.teamId ?? LEGACY_TEAM, ...)`. Tasks with `teamId = null` (legacy) remain broadcast to all (`toAll`) to preserve single-user backward compat.
- [ ] **Workflow events** (`workflows.gateway.ts`): `workflow.run.started`, `workflow.run.completed`, `workflow.run.failed` → `toTeam(workflow.teamId ?? LEGACY_TEAM, ...)`.
- [ ] **Pool events** (agent slot counts, `pool.gateway.ts`) remain `toAll` — slot state is global, not team-scoped (Decision §2).

### D3. Tests — **S**
- [ ] Integration test: two WS clients connected with different team JWTs; a task update in team A does not arrive at team B's connection. Legacy (`teamId = null`) task update arrives at both.

---

## Theme E — Notification scoping — **S**

Notifications are currently a global list and a global dispatcher. Scope both to team.

### E1. `NotificationsService.list()` scoping — **S**
- [ ] Add `scope?: TeamScope` to `NotificationsRepository.list(limit, offset, scope?)` — WHERE clause mirrors Theme A: `(user_id = :userId) OR (team_id = :teamId)`. `NotificationsController.list()` injects `@CurrentUser()` and builds scope.
- [ ] Add `team_id TEXT` column to the `notifications` table (forward-only migration, nullable). `notification_team_idx` index on `(team_id, created_at desc)`.

### E2. `NotificationDispatcher` targeting — **S**
- [ ] `NotificationDispatcher` currently calls `server.emit(...)` globally. Replace with `WsBroadcast.toTeam()` / `WsBroadcast.toUser()` (from Theme D2). Callers that create notifications pass `teamId` alongside the existing payload — most already have the entity in hand; it's a one-line addition.
- [ ] System notifications (gateway startup, health warnings) remain `toAll` with `teamId = null`.

---

## Out of scope (named, not built here)

- **Search index scoping** — adding `team_id` to the FTS5 `search_index` table and updating all mappers is a standalone migration effort; `/search` returns unscoped results until a future phase. Document the limitation in the search endpoint's response (a `_warning: "results not team-scoped"` field in dev mode).
- **Super-admin role** — a gateway-level admin that bypasses team checks is useful for self-hosted ops but not required for correctness; deferred.
- **Cross-team task sharing** — explicitly sharing a single task with another team (ACL-style) is beyond team-level granularity; deferred.
- **Per-task ACLs** — row-level permissions finer than team membership are a later concern.
- **Scheduler team isolation** — the agent pool runs all ready tasks regardless of which team owns them; per-team pool quotas (pool.perUserMaxSlots from Phase 33) are the concurrency lever, not team isolation.

---

## Files this phase touches (map)

- **shared:** `TeamScope` type in [`team.ts`](../packages/shared/src/team.ts); `TeamRole` hierarchy constant; extend `Task`, `Repo`, `Workflow` list-request types with optional scope param; update typed API client methods.
- **gateway — auth:** new [`auth/role.guard.ts`](../packages/gateway/src/auth/role.guard.ts), [`auth/role.decorator.ts`](../packages/gateway/src/auth/role.decorator.ts), [`auth/ownership.service.ts`](../packages/gateway/src/auth/ownership.service.ts); update [`auth/auth.module.ts`](../packages/gateway/src/auth/auth.module.ts) to export new pieces.
- **gateway — WS:** new [`ws/connection-registry.ts`](../packages/gateway/src/ws/connection-registry.ts), [`ws/ws-broadcast.service.ts`](../packages/gateway/src/ws/ws-broadcast.service.ts); update [`tasks/tasks.gateway.ts`](../packages/gateway/src/tasks/tasks.gateway.ts), [`workflows/workflows.gateway.ts`](../packages/gateway/src/workflows/workflows.gateway.ts), pool gateway (WS handshake + scoped broadcast).
- **gateway — tasks:** [`tasks/tasks.repository.ts`](../packages/gateway/src/tasks/tasks.repository.ts) (scope param + WHERE); [`tasks/tasks.service.ts`](../packages/gateway/src/tasks/tasks.service.ts) (pass scope, ownership check); [`tasks/tasks.controller.ts`](../packages/gateway/src/tasks/tasks.controller.ts) (`@CurrentUser()` + `@RequiresRole` decorators).
- **gateway — repos:** [`repos/repos.repository.ts`](../packages/gateway/src/repos/repos.repository.ts) (scope param); [`repos/repos.service.ts`](../packages/gateway/src/repos/repos.service.ts); [`repos/repos.controller.ts`](../packages/gateway/src/repos/repos.controller.ts).
- **gateway — workflows:** [`workflows/workflows.repository.ts`](../packages/gateway/src/workflows/workflows.repository.ts) (scope param); [`workflows/workflows.service.ts`](../packages/gateway/src/workflows/workflows.service.ts); [`workflows/workflows.controller.ts`](../packages/gateway/src/workflows/workflows.controller.ts).
- **gateway — notifications:** [`notifications/notifications.repository.ts`](../packages/gateway/src/notifications/notifications.repository.ts) (scope + `team_id` column); [`notifications/notifications.service.ts`](../packages/gateway/src/notifications/notifications.service.ts); `NotificationDispatcher` (wherever it lives — update to use `WsBroadcast`); forward-only migration adding `team_id` to `notifications`.
- **gateway — DB:** forward-only migration: `team_id` column + index on `notifications`; no other schema changes (task/repo/workflow `team_id` columns exist from Phase 33).
- **Docs:** append to [`done.md`](done.md) as slices land; update [`CLAUDE.md`](../CLAUDE.md) (RBAC model, scoped queries, WS broadcast helper).

---

## Verification

- [ ] User A and User B are members of different teams. User A's tasks are **absent** from User B's `GET /tasks` response, and vice versa. A task with `team_id = null` (legacy) appears for both.
- [ ] A **viewer** attempting `POST /tasks` receives 403. A **member** creating a task succeeds. A **member** attempting to delete another member's task receives 403. An **admin** can delete any team task.
- [ ] A **member** attempting to change another member's role receives 403. An **admin** can change roles but cannot promote beyond their own role. The **owner** can demote admins.
- [ ] Two WS clients connected with different team JWTs: a task update in team A does **not** arrive at team B's socket. A legacy (`teamId = null`) task update arrives at both (backward compat).
- [ ] `NotificationsService.list()` for user A returns only notifications scoped to user A or their team. User B's team notifications are absent.
- [ ] A task creation by a user with no team (static-token legacy path) still works — `scope = undefined`, no WHERE filter applied, full backward compat.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across the graph; `moon ci` green. (Run web tests from the **primary checkout**, not a `.git` worktree.)

---

## Decisions / open questions

1. **Legacy null-`created_by` / null-`team_id` rows** *(recommend: globally visible until migrated).* Tasks created before Phase 33 have `created_by = null` and `team_id = null`. Rather than silently hiding them, they remain visible to all authenticated users — clearly a transitional state. A one-time admin action (`POST /admin/backfill-ownership`) assigns them to the first registered user (Phase 33's backfill). Document this in the migration guide.
2. **Scheduler team isolation** *(settled: pool stays global).* The ready-task scheduler runs all unblocked `todo` tasks regardless of team ownership. Per-team throughput fairness (e.g. max N concurrent slots per team) is a separate scheduling concern, not an RBAC concern. Deferred.
3. **Soft vs. hard enforcement on reads** *(settled: silent omit).* Out-of-scope entities are simply absent from list results — no 403, no `"hidden": true` marker. This is the standard REST convention and avoids leaking entity existence. `getById` returns 404 (not 403) for the same reason.
4. **WS legacy fallback** *(open).* During the Phase 33 → Phase 35 transition window, some clients may connect without a JWT (using the old static bearer). Recommend: accept the static bearer on WS handshake with `userId = null`, `teamId = null` — broadcasts to these sockets treat them as a single-user session and send all events (old behavior). Remove this fallback once Phase 33 is fully rolled out.
5. **Role caching per request** *(settled: resolve once at guard time, store on `req`).* `RoleGuard` calls `TeamsService.getMembership()` once and stores the result; downstream services read from `req.memberships` rather than querying again. Avoids N+1 membership lookups per request.
6. **Search scoping gap** *(acknowledged, not fixed here).* The FTS5 `search_index` table has no `team_id` column; `/search` results are unscoped in Phase 35. In dev mode, the search response includes `_warning: "results not team-scoped"` as a machine-readable signal. Fix is Phase 36 or a standalone search-hardening phase.
