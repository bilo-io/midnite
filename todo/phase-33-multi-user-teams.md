# Phase 33 — Multi-user & teams

> midnite today is a **single-user tool** — a static bearer token guards the gateway, every task/repo/workflow belongs to whoever holds the token, and the agent pool has no user concept at all. Phase 33 turns it into a **shared platform**: real user identities with password auth, JWT sessions replacing the static token, teams with membership roles, ownership tracking on every entity, per-user agent concurrency caps, and an audit log. Nothing enforces row-level read/write restrictions yet (that's Phase 34 RBAC) — Phase 33 **adds the columns and the identity layer**; the policy engine comes after.

> **Scope guardrails (CLAUDE.md).** User and team modules follow the same controller → service → repository layering as the rest of the gateway — business rules in the service, Drizzle-only queries in the repository, thin controllers. JWT issuance + validation is a new `jwt.service.ts` inside the existing `auth/` module; the guard upgrade stays backward-compatible during rollout (accepts both old bearer token *and* JWT while both may exist in dev). New DB columns (`created_by`, `team_id`) on tasks/repos/workflows/sessions are additive — forward-only migrations, nullable with a backfill path; existing services only need a write-path change (set `createdBy` on create). `shared` is the contract: all new schemas live there; `cli`/`web` stay pure clients. Cross-cutting field changes (every table gets `created_by`) are one migration, not five.

> Effort tags: **S** small · **M** medium · **L** large. Themes ordered **A → B → C/D/E** (identity gates everything). Every box starts unchecked — this is net-new work.

---

## Theme A — User identity & JWT auth — **M**

Replace the static env-var bearer token with proper user identities and JWT sessions. Theme A is the prerequisite — nothing in B–E can ship without it.

### A1. User entity + DB migration — **S–M** ✅ DONE
- [x] Add `users` table to [`db/schema.ts`](../packages/gateway/src/db/schema.ts): `id` (UUIDv7), `email` (unique, indexed), `name`, `password_hash`, `created_at`, `updated_at`. Forward-only migration. No triggers, no FKs to external domains.
- [x] `UsersRepository` ([`users/users.repository.ts`](../packages/gateway/src/users/users.repository.ts)): `create`, `findByEmail`, `findById`, `updateProfile`, `updatePassword`. Drizzle only.
- [x] Shared type `User` (public shape — no `passwordHash`) + `CreateUserRequest` / `UpdateUserRequest` zod schemas in [`packages/shared/src/user.ts`](../packages/shared/src/user.ts); barrel export; typed client stub.

### A2. Password auth — `POST /auth/login` + `POST /auth/register` — **S–M** ✅ DONE
- [x] `UsersService` ([`users/users.service.ts`](../packages/gateway/src/users/users.service.ts)): `register(email, name, password)` hashes with **bcrypt** (12 rounds) before persisting; `validateCredentials(email, password)` uses a timing-safe compare. On first-boot with no users, a seeded admin is created from config/env if `MIDNITE_ADMIN_EMAIL`+`MIDNITE_ADMIN_PASSWORD` are set — allows bootstrapping a fresh instance without a UI.
- [x] `AuthController` thin routes: `POST /auth/register` → 201 + `User`; `POST /auth/login` → 200 + `{ accessToken, refreshToken, user }`. Input validated with `ZodValidationPipe` against shared schemas. Rate-limit register (5 per IP/hour) to deter enumeration.

### A3. JWT issuance + validation — **M** ✅ DONE
- [x] `JwtService` ([`auth/jwt.service.ts`](../packages/gateway/src/auth/jwt.service.ts)): issues **HS256 access tokens** (15 min TTL) and **refresh tokens** (7 day TTL, stored as a hash in `refresh_tokens` table — id, user_id, token_hash, expires_at, revoked). `POST /auth/refresh` exchanges a valid refresh token for a new pair; `POST /auth/logout` revokes the refresh token.
- [x] Config additions to `GatewayAuthConfigSchema` in [`packages/shared/src/config.ts`](../packages/shared/src/config.ts): `jwt.secret` (env `MIDNITE_JWT_SECRET`, required when using JWT mode), `jwt.accessTtlSeconds` (default 900), `jwt.refreshTtlDays` (default 7).
- [x] `refresh_tokens` table in [`db/schema.ts`](../packages/gateway/src/db/schema.ts) — forward-only migration.

### A4. Upgrade the auth guard to validate JWT — **S–M** ✅ DONE (WS deferred)
- [x] [`gateway-auth.guard.ts`](../packages/gateway/src/auth/gateway-auth.guard.ts) currently validates a static bearer token from env (`MIDNITE_AUTH_TOKEN`) via [`lib/auth-policy.ts`](../packages/gateway/src/auth/lib/auth-policy.ts). Upgrade: if `jwt.secret` is configured, validate the `Authorization: Bearer <jwt>` header as a JWT and attach the decoded `userId` to the request. The static bearer path remains as a fallback (dev/script use) so existing single-user setups continue to work without migration. Add a `@CurrentUser()` decorator that reads `req.user` for controllers to consume.
- [ ] WS connections: pass the JWT as a query param on the upgrade URL (`?token=<jwt>`) — the WS gateway validates it at connection time; per-session one-time tokens (`/hooks/:taskId/:event`) remain unaffected.

### A5. Web login + register pages — **M** ✅ DONE
- [x] `app/(auth)/login/page.tsx` — email + password form; on success stores the access token in memory (React context) and the refresh token in an **httpOnly cookie** (`__midnite_rt`); redirects to `/`.
- [x] `app/(auth)/register/page.tsx` — name/email/password form; redirects to login on success. Behind a config flag (`NEXT_PUBLIC_REGISTRATION_OPEN=true`) so deployments can lock registration once seeded.
- [x] `hooks/use-current-user.ts` — wraps the current `User` from auth context; returns `null` for unauthenticated (triggers redirect to `/login`). Used in the root layout to gate the app.
- [x] `components/user-nav.tsx` — profile avatar + name dropdown in the nav bar (links to profile settings, logout).

### A6. CLI auth commands — **M** ✅ DONE
- [x] `midnite login` ([`cli/src/index.ts`](../packages/cli/src/index.ts)): prompts for email + hidden password; calls `POST /auth/login`; stores the JWT in `~/.config/midnite/auth.json`. Existing `--token` flag and `MIDNITE_AUTH_TOKEN` env continue to work.
- [x] `midnite logout` — revokes session on gateway, deletes `~/.config/midnite/auth.json`.
- [x] `midnite whoami` — reads the stored token, calls `GET /auth/me`, prints `User { id, email, name }`.
- [x] `auth-store.ts` ([`cli/src/lib/auth-store.ts`](../packages/cli/src/lib/auth-store.ts)) — read/write/clear stored tokens; `resolveToken()` priority: stored JWT > env > `--token` flag. `preAction` hook resolves token once before any command runs.

---

## Theme B — Teams & membership — **M**

Teams let multiple users share a workspace. A team has a slug, roles (owner / admin / member / viewer), and invite tokens for onboarding.

### B1. Team + membership tables — **S** ✅ DONE
- [x] Add `teams` table ([`db/schema.ts`](../packages/gateway/src/db/schema.ts)): `id`, `slug` (unique), `name`, `created_by`, `created_at`. Add `team_memberships`: `team_id`, `user_id`, `role` (`owner` | `admin` | `member` | `viewer`), `joined_at`. Migration `0047_teams`. The creating user is automatically assigned `owner`.
- [x] Add `team_invites`: `id`, `team_id`, `invited_by`, `email` (optional), `token` (unique), `role`, `expires_at`, `accepted_at`, `created_at`.
- [x] `TeamsRepository`: insert/findById/findBySlug/listByUser/update/delete; insertMember/findMember/listMembers/setRole/removeMember; insertInvite/findInviteByToken/listInvites/acceptInvite/revokeInvite. Drizzle only.

### B2. Team CRUD endpoints — **S–M** ✅ DONE
- [x] `TeamsService` + `TeamsController` ([`teams/`](../packages/gateway/src/teams/)): `POST /teams` (create, sets owner); `GET /teams/:id`; `GET /teams` (my teams); `PATCH /teams/:id` (rename — owner/admin); `DELETE /teams/:id` (owner only, cascades membership). Role rank: owner>admin>member>viewer.
- [x] Shared `Team` + `TeamMember` + `TeamWithMembers` types + `CreateTeamRequest`/`UpdateTeamRequest`/`SetMemberRoleRequest` in [`packages/shared/src/team.ts`](../packages/shared/src/team.ts).

### B3. Invite token flow — **S** ✅ DONE
- [x] `POST /teams/:id/invites` (admin+): creates an invite token. Optional `email` and `expiresInDays` (default 7).
- [x] `GET /invites/:token` (unauthenticated): returns invite metadata without accepting.
- [x] `POST /invites/:token/accept` (authenticated): validates expiry, adds user as member, marks `accepted_at`.
- [x] `GET/DELETE /teams/:id/invites` (admin+): list + revoke outstanding invites.

### B4. Web team UI — **M**
- [ ] `app/(main)/settings/team/page.tsx` — team switcher dropdown in the nav (current team + "Create team" option); links to team settings.
- [ ] `app/(main)/settings/team/[teamId]/page.tsx` — team name, member list (avatar + name + role chip), invite member (copy-to-clipboard token link), remove member, change role. Guarded: only admins/owners see management controls.
- [ ] `app/(auth)/invite/[token]/page.tsx` — invite acceptance page: shows team name + inviting user, "Accept invitation" button (calls `/invites/:token/accept`, then redirects to the board). Works for logged-in users; redirects to login+return if not authenticated.

---

## Theme C — Resource ownership — **M**

Add `created_by` (userId) and optional `team_id` to every entity that will eventually be scoped. This phase is **additive only** — read/write restrictions (who can see or modify what) are deferred to Phase 34.

### C1. Schema additions + migrations — **S–M** ✅ DONE
- [x] Migration `0048_resource_ownership`: adds `created_by TEXT` and `team_id TEXT` to `tasks`, `repos`, `workflows`. Nullable — no zero-downtime risk.
- [x] Indexes: `tasks_created_by_idx`, `tasks_team_id_idx`, `repos_created_by_idx`, `workflows_created_by_idx`.

### C2. Backfill: auto-create personal workspace on registration — **S** ✅ DONE
- [x] `UsersService.register` calls `TeamsService.createTeam` after user insert; creates a personal team (`slug = personal-<userId>`, `name = "<Name>'s workspace"`) with the user as `owner`. `@Optional()` injection so unit tests don't need the full module graph.

### C3. Write-path: set `createdBy` on create — **S** ✅ DONE
- [x] `TasksService.createFromPrompt`, `ReposService.create`, `WorkflowsService.create` accept `createdBy?: string` and persist it as `created_by`. Controllers pass `user?.userId` from `@CurrentUser()`. Null on the legacy static-token path — no regression.

### C4. Read-path: expose ownership on response shapes — **S** ✅ DONE
- [x] Extended shared `Task`, `Repo`, `Workflow` types with `createdBy?: string` and `teamId?: string`. Mapped in `toRepo()` and `hydrateWorkflow()`. All existing consumers ignore the new optional fields.

---

## Theme D — Agent isolation & audit log — **M**

Bind task execution to its owner's context and start recording who does what.

### D1. Per-user concurrency cap — **S–M**
- [ ] `AgentPoolService` ([`pool/agent-pool.service.ts`](../packages/gateway/src/pool/agent-pool.service.ts)) tracks active slot counts per `userId` in addition to the global pool size. New config key: `pool.perUserMaxSlots` (default: same as global `maxSlots`, effectively unlimited until set). The scheduler's tick ([`agent-pool-scheduler.service.ts`](../packages/gateway/src/pool/agent-pool-scheduler.service.ts)) skips a task if the owner's per-user cap is already full — emits a `task.waiting` event (not an error; the task retries next tick).
- [ ] Config addition to `MidniteConfig` in [`packages/shared/src/config.ts`](../packages/shared/src/config.ts): `pool.perUserMaxSlots?: number`.

### D2. Task execution bound to owner context — **S**
- [ ] The PTY spawner ([`terminal/spawner/`](../packages/gateway/src/terminal/spawner/)) injects `MIDNITE_USER_ID=<ownerId>` into the spawned Claude Code session's env — so the hook callbacks at `POST /hooks/:taskId/:event` can be validated against the task's `created_by`. No behavioural change for tasks without a `created_by`.

### D3. `audit_log` table — **S**
- [ ] New table in [`db/schema.ts`](../packages/gateway/src/db/schema.ts): `id` (UUIDv7), `entity_type` (`task` | `repo` | `workflow` | `user` | `team`), `entity_id`, `user_id` (nullable — system actions have no user), `action` (e.g. `task.created`, `task.status_changed`, `user.login`, `team.member_added`), `payload` (JSON, nullable), `created_at`. Indexed on `(entity_type, entity_id)` and `(user_id, created_at)`.
- [ ] `AuditService` ([`audit/audit.service.ts`](../packages/gateway/src/audit/audit.service.ts)) — a `@Global()` service (like `SearchIndexService`) with a single `record(entry)` method; fire-and-forget (doesn't throw). Injected into domain services.

### D4. Key audit events — **S**
- [ ] Write audit entries on: `task.created`, `task.status_changed` (with `from`/`to` in payload), `task.deleted`; `user.registered`, `user.login`, `user.logout`; `team.created`, `team.member_added`, `team.member_removed`, `team.member_role_changed`; `workflow.run_started`, `workflow.run_completed`.
- [ ] `GET /audit` (owner/admin only — enforced by role check in the controller): paginated, filterable by `entityType`, `entityId`, `userId`, `action`, date range. Returns `AuditEntry[]` (shared type).

---

## Theme E — Admin & profile UI — **S**

The settings surface for identity and team management.

### E1. User profile page — **S**
- [ ] `app/(main)/settings/profile/page.tsx`: display name + email (read-only); change display name; change password (requires current password, calls `PATCH /users/me/password`); avatar initial/placeholder (no upload in Phase 33 — deferred).

### E2. Team settings + member management — **S**
- [ ] `app/(main)/settings/team/[teamId]/page.tsx` (B4 is the team page — merge E2 into B4 rather than splitting across two files): rename team (admin+); "Danger zone" delete-team section (owner only, with confirmation dialog); member list with inline role-picker (admin+) and remove-member button (admin+). New invite-token entry: enter optional email label → generate token → "Copy link" button.

### E3. Invite token acceptance — **S**
- [ ] Handled by `app/(auth)/invite/[token]/page.tsx` from B4 — Theme E adds an explicit "Invitations" section in the team settings page showing outstanding (unexpired) tokens with the ability to revoke them.

---

## Out of scope (named, not built here)

- **Row-level RBAC enforcement** — Phase 33 adds ownership columns but does *not* filter reads or restrict writes based on `team_id`/`created_by`. Visibility rules ("team members see only their team's tasks") land in Phase 34.
- **OAuth / SSO** — email+password is the auth mechanism for Phase 33. OAuth (GitHub, Google) and SAML/OIDC are enterprise concerns, deferred.
- **Email delivery** — invites use shareable tokens, not email sends. No email infrastructure (SMTP, SendGrid) in Phase 33.
- **Per-user billing / quotas** — `perUserMaxSlots` is a concurrency cap, not a usage-billing model.
- **Avatar uploads** — profile image upload is deferred (requires file-storage infrastructure).
- **Multi-instance / multi-tenant deployment** — Phase 33 is single-instance, multiple users.
- **Audit log UI (full)** — `GET /audit` is the endpoint; a polished audit-log page in the web UI is deferred.

---

## Files this phase touches (map)

- **shared:** new [`user.ts`](../packages/shared/src/user.ts), [`team.ts`](../packages/shared/src/team.ts), [`audit.ts`](../packages/shared/src/audit.ts); new `LoginRequest`/`RegisterRequest`/`AuthTokens` schemas; extend `Task`, `Repo`, `Workflow` with `createdBy?`/`teamId?` in their respective files; `GatewayAuthConfigSchema` + pool config additions in [`config.ts`](../packages/shared/src/config.ts); barrel + typed API client methods.
- **gateway — DB:** `users`, `teams`, `team_memberships`, `team_invites`, `refresh_tokens`, `audit_log` tables in [`db/schema.ts`](../packages/gateway/src/db/schema.ts); `created_by`/`team_id` columns on tasks/repos/workflows/sessions; forward-only migrations in [`db/migrations/`](../packages/gateway/src/db/migrations/).
- **gateway — auth:** [`auth/jwt.service.ts`](../packages/gateway/src/auth/jwt.service.ts) (new); [`auth/gateway-auth.guard.ts`](../packages/gateway/src/auth/gateway-auth.guard.ts) + [`auth/lib/auth-policy.ts`](../packages/gateway/src/auth/lib/auth-policy.ts) (upgrade to JWT + static-bearer fallback); [`bootstrap.ts`](../packages/gateway/src/bootstrap.ts) (seed admin user on first boot).
- **gateway — users:** new [`users/users.module.ts`](../packages/gateway/src/users/users.module.ts), [`users.controller.ts`](../packages/gateway/src/users/users.controller.ts), [`users.service.ts`](../packages/gateway/src/users/users.service.ts), [`users.repository.ts`](../packages/gateway/src/users/users.repository.ts).
- **gateway — teams:** new [`teams/teams.module.ts`](../packages/gateway/src/teams/teams.module.ts), [`teams.controller.ts`](../packages/gateway/src/teams/teams.controller.ts), [`teams.service.ts`](../packages/gateway/src/teams/teams.service.ts), [`teams.repository.ts`](../packages/gateway/src/teams/teams.repository.ts).
- **gateway — audit:** new [`audit/audit.module.ts`](../packages/gateway/src/audit/audit.module.ts), [`audit.service.ts`](../packages/gateway/src/audit/audit.service.ts), [`audit.repository.ts`](../packages/gateway/src/audit/audit.repository.ts), [`audit.controller.ts`](../packages/gateway/src/audit/audit.controller.ts).
- **gateway — existing services:** [`tasks/tasks.service.ts`](../packages/gateway/src/tasks/tasks.service.ts) (set `createdBy`, record audit events); [`pool/agent-pool.service.ts`](../packages/gateway/src/pool/agent-pool.service.ts) (per-user slot tracking); [`pool/agent-pool-scheduler.service.ts`](../packages/gateway/src/pool/agent-pool-scheduler.service.ts) (per-user cap check); [`terminal/spawner/`](../packages/gateway/src/terminal/spawner/) (inject `MIDNITE_USER_ID` env); [`app.module.ts`](../packages/gateway/src/app.module.ts) (register new modules).
- **web:** new `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`, `app/(auth)/invite/[token]/page.tsx`; new `app/(main)/settings/profile/page.tsx`, `app/(main)/settings/team/[teamId]/page.tsx`; new `components/user-nav.tsx`; new `hooks/use-current-user.ts`; auth context in `app/layout.tsx`; update `lib/api.ts` (attach JWT, refresh-token rotation).
- **cli:** new [`cli/src/commands/login.ts`](../packages/cli/src/commands/login.ts), [`logout.ts`](../packages/cli/src/commands/logout.ts), [`whoami.ts`](../packages/cli/src/commands/whoami.ts); new [`cli/src/lib/auth-store.ts`](../packages/cli/src/lib/auth-store.ts).
- **Docs:** update [`CLAUDE.md`](../CLAUDE.md) (JWT auth model, team scoping, audit log); append to [`done.md`](done.md) as slices land.

---

## Verification

- [ ] `POST /auth/register` creates a user; `POST /auth/login` returns a short-lived JWT + refresh token; a subsequent request with the JWT reaches a guarded endpoint; after `POST /auth/logout` the refresh token is rejected.
- [ ] The static bearer token (`MIDNITE_AUTH_TOKEN`) still works on a single-user setup with no JWT configured — no regression for existing local users.
- [ ] `midnite login` stores the JWT; `midnite whoami` prints the user; `midnite logout` clears it. Existing CLI commands (`midnite add`, `midnite list`) pass the stored JWT automatically.
- [ ] Create a team, invite a second user via the shareable link, accept the invite — second user appears in the member list with the assigned role; owner can remove them or change their role.
- [ ] A new task created while authenticated has `createdBy` set to the creating user's id; the field is returned in `GET /tasks`. Tasks created before Phase 33 (null `created_by`) are unaffected and still list/run normally.
- [ ] With `pool.perUserMaxSlots = 1`, a second concurrent task for the same user does **not** start until the first finishes — it waits and starts automatically on the next tick. Other users are unaffected.
- [ ] Key actions appear in `GET /audit` with the correct `userId`, `action`, and `entityId`: task created, task status changed, user login, team member added.
- [ ] The web login page redirects to `/` on success and back to `/login` on bad credentials. The team settings page shows the invite link; accepting it via a second browser session adds the user.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across the graph; `moon ci` green.

---

## Decisions / open questions

1. **Password hashing algorithm** *(recommend: bcrypt, 12 rounds).* bcrypt is well-understood, broadly supported, and fast enough at 12 rounds for interactive logins (~300 ms). argon2 is stronger but adds a native dep and build complexity. Revisit if a security audit flags bcrypt.
2. **JWT storage in the web client** *(recommend: access token in memory + refresh token in httpOnly cookie).* localStorage is XSS-readable; httpOnly cookies are not. The access token in React context is lost on a hard reload — the `/auth/refresh` call on app mount restores it from the cookie silently.
3. **Invite mechanism** *(settled in brainstorm: shareable token, no email).* A UUIDv7 invite token generates a shareable URL. No SMTP infrastructure needed. Open invites (no `email` field set) let anyone with the link join up to the expiry; scoped invites (with email) add an extra check at accept time.
4. **Personal workspace backfill** *(recommend: auto-create on first JWT login).* When a single-user instance upgrades to Phase 33, the first login creates a personal team and backfills all orphaned tasks to `created_by = thisUser`. If multiple users register concurrently before any login, the backfill targets only tasks with `created_by = null` — subsequent users start with a clean slate. Document the bootstrap procedure in the README.
5. **Static bearer token coexistence** *(open).* The guard accepts both JWT and static bearer during the transition period. Should the static bearer be deprecated with a config warning once a user exists, or left indefinitely for script/CI use? Recommend: emit a startup warning ("static bearer token is set but a user exists — consider switching to JWT") without hard-removing the path; clean removal is Phase 34.
6. **Team switcher UX** *(open).* Does a task created in "personal workspace" automatically move to "team workspace" when you switch teams, or do the two scopes stay independent? Phase 33 only shows the current user's personal team — `team_id` on tasks is populated optionally at create time. Full team-scope filtering is Phase 34; the switcher in Phase 33 sets context for *new* creates only.
7. **Per-user concurrency default** *(open).* `perUserMaxSlots` defaults to the global `maxSlots` (effectively unlimited) so existing single-user behaviour is unchanged. A sensible per-user default for multi-user deployments is 2–3 — document this in the config schema docs rather than hardcoding.
