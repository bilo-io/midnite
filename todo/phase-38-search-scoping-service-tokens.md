# Phase 38 — Search Scoping + Service Tokens

> Two independent production-readiness tracks that close gaps left by Phase 35 (RBAC) and the CI/CD integration story. Neither changes user-facing behaviour for single-user deployments; both are critical for multi-user correctness and automation.

> **Theme A** fixes the search leakage acknowledged in Phase 35 §6: `GET /search` currently returns results across team boundaries because the FTS5 `search_index` has no `team_id` column. **Theme B** adds machine-readable API tokens so CI/CD pipelines, scripts, and third-party integrations can call the gateway without a user session.

> **Scope guardrails (CLAUDE.md).** Search scoping is a pure repository + service concern — the `SearchQuery` schema (shared, URL params) is unchanged; scope is derived server-side from `@CurrentUser()`. Service tokens follow the same controller → service → repository layering; token generation is in the service layer, never in the controller. No new cross-package types except what's added to `shared`.

---

## Theme A — Search index scoping — **S–M**

### A1. Migration: add `team_id` column to FTS5 index — **S**
- [x] FTS5 virtual tables cannot be ALTERed; drop + recreate in forward-only migration `0054_search_index_team_id`. The backfill in `SearchService.onApplicationBootstrap` repopulates the empty table on startup (existing behaviour, unchanged).

### A2. Update `IndexDoc` + mapper functions — **S**
- [x] Add `teamId?: string | null` to `IndexDoc` type in `search/lib/index-mappers.ts`.
- [x] Add `teamId?: string` to `ProjectSchema` in `shared/src/project.ts` and `WorkflowSummarySchema` in `shared/src/workflow.ts` (already on `WorkflowSchema`).
- [x] Update mapper functions: `taskToIndexDoc` (has `t.teamId`), `projectToIndexDoc` (has `p.teamId`), `workflowToIndexDoc` (extend Pick to include `teamId`) → pass through. `memoryToIndexDoc`, `noteToIndexDoc`, `councilToIndexDoc` → `teamId: null` (these are personal, unscoped entities).

### A3. Update `SearchIndexService` SQL — **S**
- [x] `upsert` and `upsertMany`: include `team_id` in INSERT.
- [x] `query`: accept optional `teamId?: string | null`; add WHERE clause `(team_id IS NULL OR team_id = :teamId)` when caller is authenticated. When no teamId provided (unauthenticated / legacy): return only `team_id IS NULL` results.

### A4. Update `SearchService` + `SearchController` — **S**
- [x] `SearchService.search(query, scope?: { teamId: string | null })` — passes scope to `index.query`.
- [x] `SearchController.search`: inject `@CurrentUser() user?: { teamId?: string | null }` (optional — legacy static-token path has no user); pass `{ teamId: user?.teamId ?? null }` to service.
- [x] `SearchService.reindex()`: domain services already return entities with `teamId` after the shared-type update — mappers auto-include it.
- [x] Remove the dev-mode `_warning` field (Phase 35 §6 placeholder) — scoping is now real.

### A5. Tests — **S**
- [x] `search-index.service.spec.ts`: upsert a task with `teamId = 'team-A'`; query with `teamId = 'team-B'` returns nothing; query with `teamId = 'team-A'` returns the task; query with `teamId = null` returns only null-scoped entities.

---

## Theme B — Service account tokens — **M**

### B1. Shared types — **S**
- [x] New `packages/shared/src/service-token.ts`: `ServiceTokenSchema` (id, name, prefix, teamId?, createdBy?, lastUsedAt?, expiresAt?, createdAt), `CreateServiceTokenRequestSchema` (name, expiresAt?), `CreateServiceTokenResponseSchema` (token + secret), list response. Barrel-exported.

### B2. Migration + DB schema — **S**
- [x] Migration `0055_service_tokens`: table `service_tokens` (`id`, `name`, `token_hash` TEXT NOT NULL, `prefix` TEXT NOT NULL, `team_id`, `created_by`, `last_used_at`, `expires_at`, `revoked_at`, `created_at`). Index on `token_hash` (lookup by hash on every request).

### B3. `ServiceTokensRepository` — **S**
- [x] `insert`, `findByHash(hash)`, `list(teamId?)`, `revoke(id)`, `touchLastUsed(id)`.

### B4. `ServiceTokensService` — **S**
- [x] `create(name, opts?)`: `crypto.randomBytes(32)` → hex → `mnt_<hex>` prefix; SHA-256 hash for storage; return `{ token: ServiceToken, secret: 'mnt_<hex>' }`. Secret returned ONCE — never stored.
- [x] `validate(raw)`: hash → `findByHash` → check `revoked_at IS NULL` + `expires_at` → `touchLastUsed` → return token. Returns `null` on invalid.
- [x] `list(teamId?)`, `revoke(id)`.

### B5. `ServiceTokensController` + `ServiceTokensModule` — **S**
- [x] Routes: `POST /service-tokens`, `GET /service-tokens`, `DELETE /service-tokens/:id`.
- [x] Module wires repository + service + controller; registered in `AppModule`.

### B6. Auth guard integration — **S**
- [x] `GatewayAuthGuard`: after JWT attempt, before static-bearer check, try `serviceTokens.validate(bearer)`. On success, sets `req.user = { id: token.createdBy ?? 'service', teamId: token.teamId ?? null, isServiceToken: true }`. If `ServiceTokensService` is unavailable (`@Optional`), falls through gracefully.

### B7. Web — Settings → API Tokens page — **S–M**
- [x] `app/(main)/settings/api-tokens/page.tsx`: list tokens (name, prefix, lastUsedAt, expiresAt, createdAt) + create button + revoke button per row.
- [x] Create modal: name field + optional expiry date; shows the secret ONCE after creation (copy-to-clipboard, dismiss warning).
- [x] API client functions in `lib/api.ts`: `listServiceTokens`, `createServiceToken`, `revokeServiceToken`.
- [x] Settings sidebar entry: "API Tokens" with key icon.

---

## Verification

- [x] Two users in different teams. User A searches for a task they own; User B's team tasks are absent from results. Legacy tasks (`team_id = null`) appear for both.
- [x] Create a service token via `POST /service-tokens`. Use it as `Authorization: Bearer mnt_<secret>` to call `GET /tasks` — returns 200 with the token owner's team-scoped tasks. Pass it to a `GET /search?q=foo` — returns scoped results.
- [x] Revoke the token via `DELETE /service-tokens/:id`. The same bearer now returns 401.
- [x] `moon run :typecheck` · `moon run gateway:test` · `moon run web:test` green.

---

## Out of scope

- **Per-token scopes / permissions** — tokens inherit the creating user's role. Fine-grained per-token permissions (read-only, specific resources) are a future hardening phase.
- **Token rotation** — a `POST /service-tokens/:id/rotate` endpoint that revokes and re-issues. Deferred; users can revoke + create a new one.
- **Search on memories/notes/councils with user-level scoping** — these entities have no `team_id`; they remain globally visible to all authenticated users. Adding per-user ownership to personal entities is a later phase.
