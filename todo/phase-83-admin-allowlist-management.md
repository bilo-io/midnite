# Phase 83 — Runtime-editable access allowlist + admin management UI

> **Builds on** the login allowlist (`gateway.auth.allowlist`, the "Phase 71" access-gate enforced in [`users.service.ts`](../packages/gateway/src/users/users.service.ts)), **[Phase 72](phase-72-sso-go-live-operator-config.md)** (operator config moved to the gitignored `.midnite/operator.json`), and **[Phase 73](phase-73-admin-console.md)** (the `@midnite/admin` operator console). It also builds on the **auth-hardening** change (PR TBD) that added **domain-pattern** allowlist entries (`@example.com`) to the shared schema + enforcement, and forced JWT auth on in packaged desktop builds.

> **Why now.** With packaged builds forcing auth on and gating access by allowlist, the allowlist becomes the *only* control over who gets in — but today it's **immutable, deploy-time file config**: an operator can only change who's allowed by hand-editing `~/.midnite/operator.json` and restarting the gateway. There is no read or write API and no UI. This phase makes the allowlist a **runtime-editable store** with operator-gated endpoints and an admin page, so access can be managed without a redeploy.

> **Scope guardrails (CLAUDE.md).** `admin` stays a pure client of `{shared, ui, shell}` over HTTP — never gateway internals; new contracts live in `shared`. `ui` stays a translation-agnostic leaf. **Out of scope:** the **operators** list (`gateway.auth.operators`) stays file-only, deploy-time policy — admins are specific people, deliberately not runtime-editable here (a later phase may revisit); self-service invites/signup flows; per-team allowlists (this is the platform-wide login gate only).

> Effort tags: **S** small · **M** medium · **L** large. Natural order: **A** (mutable store + reconciliation) is the load-bearing decision and runs first; **B** (endpoints + contracts) and **C** (admin UI) follow; **D** (tests/docs) closes out.

---

## Current state (what exists to build on)

- **The allowlist is a boot-time immutable `ReadonlySet`** — built once in the [`UsersService`](../packages/gateway/src/users/users.service.ts) constructor from `config.gateway.auth.allowlist`, split into exact-email + `@domain` sets, enforced by `assertAllowlisted()` across register / password login / SSO provision. Empty ⇒ no restriction. There is **no write path** — the only way to change it is to edit the file and restart.
- **The source is a gitignored file** — `.midnite/operator.json` (`$MIDNITE_OPERATOR_CONFIG`), deep-merged into `gateway.auth` by [`config-loader.ts`](../packages/shared/src/config-loader.ts). `midnite.json` is forbidden from carrying `gateway.auth.*` (fails boot). So the allowlist is **operator-owned, secret-adjacent policy**, not user config.
- **No allowlist API exists** — grep confirms no `@Post`/`@Patch`/`@Delete` writes it; the only admin write today is `POST /admin/backup`. The admin console's operator surface ([`admin.controller.ts`](../packages/gateway/src/admin/admin.controller.ts)) is read-only + backup, all `@RequiresOperator`.
- **The admin console is a static-export Next.js App Router app** — fixed nav rail ([`lib/nav-config.ts`](../packages/admin/lib/nav-config.ts)), a zod-validated fetch client ([`lib/api.ts`](../packages/admin/lib/api.ts)), react-query, and a CRUD pattern to mirror in [`components/team-manager.tsx`](../packages/admin/components/team-manager.tsx) (create form + per-row delete-with-confirm + query invalidation). It gates on operator status by probing `GET /admin/overview` ([`operator-gate.tsx`](../packages/admin/components/operator-gate.tsx)).
- **Domain patterns are already understood end-to-end** — `AllowlistEntrySchema` in [`config.ts`](../packages/shared/src/config.ts) validates `email | @domain`; `assertAllowlisted` matches either. The UI + store just need to preserve and surface that distinction.

---

## Theme A — Mutable allowlist store + config reconciliation — **M**

The core decision: where the runtime allowlist lives, and how it reconciles with the immutable file entries.

- [ ] **Add an `allowlist_entries` table** (Drizzle schema + forward migration) — columns: `id` (UUIDv7), `value` (lower-cased email or `@domain`), `kind` (`'email' | 'domain'`, derived on write), `note` (optional), `createdBy` (operator userId), `createdAt`. Unique on `value`.
- [ ] **Define the effective allowlist as `file ∪ db`** — the file entries (`config.gateway.auth.allowlist`) remain the **seed / floor** an operator can't delete from the UI (they're the deploy baseline); DB entries layer on top and *are* editable. Surface each entry's `source` (`'config' | 'db'`) so the UI can show config entries as read-only. Decision to confirm below (§1).
- [ ] **Move enforcement behind an `AllowlistService`** — `UsersService.assertAllowlisted` today reads a constructor-frozen set; replace with an injected `AllowlistService.isAllowed(email)` that computes against the live effective set (config ∪ db), re-reading the DB per check (or a cache invalidated on write). Keeps `UsersService` behaviour identical when the DB table is empty (⇒ file-only, exactly today's semantics).
- [ ] **Backfill / no-op on empty** — a fresh DB has no rows ⇒ effective = file entries ⇒ zero behaviour change from the auth-hardening baseline.

## Theme B — Operator-gated endpoints + shared contracts — **M**

- [ ] **Shared schemas** ([`packages/shared`](../packages/shared/src)) — `AllowlistEntry` (`{ id, value, kind, source, note?, createdAt }`), list/create/delete request+response shapes, reusing `AllowlistEntrySchema` for validation. Add to the typed surface the admin client parses against.
- [ ] **`GET /admin/allowlist`** — `@RequiresOperator`; returns effective entries with `source`.
- [ ] **`POST /admin/allowlist`** — `@RequiresOperator`; body `{ value, note? }`, validated as email-or-domain, lower-cased, dedup vs config + db; 409 on duplicate, 400 on malformed. Audit via [`AuditService`](../packages/gateway/src/audit).
- [ ] **`DELETE /admin/allowlist/:id`** — `@RequiresOperator`; removes a **db** entry only (config entries are not deletable → 409/422 with a clear message). Audited.
- [ ] **Thin controller, logic in the service** — mirror the layering rule; controller decodes/encodes only.

## Theme C — Admin “Access” management page — **M**

- [ ] **New route** `app/(main)/access/page.tsx` + nav entry in [`nav-config.ts`](../packages/admin/lib/nav-config.ts) (`AdminNavId` union) + an icon (`ShieldCheck`/`UserCheck`) in `app-shell-client.tsx`.
- [ ] **`components/access-manager.tsx`** modelled on [`team-manager.tsx`](../packages/admin/components/team-manager.tsx) — a list (email vs `@domain` chip, `source` badge — “config” entries read-only), an **add** form (single input accepting an email or `@domain`, inline validation + error), and **remove-with-confirm** on db entries only ([`confirm-dialog.tsx`](../packages/admin/components/confirm-dialog.tsx)). react-query list + mutations with invalidation; `ErrorState`/`EmptyState`/`LoadingRows` reuse.
- [ ] **api.ts helpers** — `getAllowlist` / `addAllowedEntry` / `removeAllowedEntry` in [`lib/api.ts`](../packages/admin/lib/api.ts), parsing against the shared schemas.
- [ ] **Empty-state copy** makes the “empty ⇒ everyone” semantics explicit (an empty allowlist opens sign-up) so an operator never clears it by accident thinking it locks down.

## Theme D — Tests & docs — **S**

- [ ] **Gateway** — `AllowlistService` unit (effective = config ∪ db; email + domain; empty ⇒ open); controller specs for 200/400/409/403 + config-entry-not-deletable; migration/repository integration on `:memory:` SQLite.
- [ ] **Admin** — `access-manager` RTL (add validation, config entries read-only, remove-confirm), api-client parse.
- [ ] **Docs** — extend [`docs/ADMIN.md`](../docs/ADMIN.md) + [`docs/SSO.md`](../docs/SSO.md): the allowlist is now runtime-editable via the console; file entries are the immutable floor; operators list stays file-only.

## Files this phase touches

| Area | Files |
|------|-------|
| Shared | `packages/shared/src/config.ts` (reuse `AllowlistEntrySchema`), new allowlist contract + client types |
| Gateway | `db/schema.ts` + migration, new `allowlist/` module (service, controller, repository), `users/users.service.ts` (delegate to `AllowlistService`) |
| Admin | `app/(main)/access/page.tsx`, `components/access-manager.tsx`, `lib/api.ts`, `lib/nav-config.ts`, `components/app-shell-client.tsx` |
| Docs | `docs/ADMIN.md`, `docs/SSO.md` |

## Verification

- [ ] With an empty DB table, login/register/SSO behave exactly as file-only today (regression on Phase 71 specs).
- [ ] An operator can add `@ekko.earth` (or a single email) in the console and a matching address logs in **without a gateway restart**.
- [ ] Removing a db entry blocks that address on the next login attempt; config-seeded entries cannot be removed via the UI.
- [ ] Non-operators get 403 on all `/admin/allowlist` routes; the page shows the “not an operator” gate.
- [ ] Malformed entries (`ekko.earth`, `not an email`) are rejected with a clear message; duplicates 409.

## Decisions / open questions

1. **Config entries: floor or seed?** **Recommendation:** treat `config.gateway.auth.allowlist` as an **immutable floor** (union with DB, not deletable via UI) — the deploy baseline stays authoritative and an operator can’t lock themselves out by clearing the DB. Alternative: one-time seed the DB from config then ignore the file (simpler model, but drifts from the file and complicates the “operator.json is the source of truth” story). *Needs user confirm.*
2. **Operators list editable too?** Recommendation: **no** — keep `operators` file-only this phase (admins are deliberately deploy-time). Revisit only if operator churn becomes real.
3. **Cache vs per-check DB read.** Recommendation: read-through cache in `AllowlistService` invalidated on write — logins are infrequent enough that even a per-check query is fine; pick whichever keeps the service simplest.
