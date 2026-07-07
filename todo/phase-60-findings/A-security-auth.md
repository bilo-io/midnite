# Phase 60 Theme A — Auth, transport & headers audit

**Date:** 2026-07-07 · **Scope:** gateway perimeter — rate-limiting posture, HTTP security headers + CORS, and token/session lifecycle · **Method:** three parallel static audits over `packages/gateway` + `packages/shared`, guard/hook registration traced precisely.

## Summary

| # | Area | Severity | Status |
|---|------|----------|--------|
| A-1 | Static bearer token bypasses **all** `@RequiresRole` (RBAC) checks; remotely reachable | **HIGH** | 📋 Documented — needs a threat-model decision |
| A-2 | No per-account login lockout/backoff — `POST /auth/login` brute-forceable | **HIGH** | 📋 Documented — needs design |
| A-3 | Missing HTTP security headers (`nosniff`, frame-options, referrer-policy) | MED | ✅ **Fixed in this PR** |
| A-4 | Rate-limit guard default-off (`max: 0`) — inert out of the box | MED | 📋 Recommendation (default flip deferred — see below) |
| A-5 | Service tokens carry no scopes — inherit creator's full role | MED | 📋 Documented — needs a schema column + scope guard |
| A-6 | No refresh-token reuse detection / family revocation on replay | MED | 📋 Documented |
| A-7 | Terminal session token: non-constant-time compare | MED | ✅ **Fixed in this PR** |
| A-8 | Terminal token map: no active TTL sweep (lazy cleanup only) | MED | 📋 Documented |
| A-9 | `refresh_tokens.deleteExpired` is dead code — stale rows accumulate | LOW/MED | 📋 Documented |
| A-10 | CORS posture | — | ✅ Verified sound |

Two quick-wins applied (A-3 security headers, A-7 timing-safe terminal compare). The two HIGH findings (A-1 static-token RBAC bypass, A-2 login brute-force) are the top priorities but both require a decision/design rather than a zero-risk flip, so they're documented for a dedicated follow-up. CORS is already correctly configured.

---

## A-1 — Static bearer token bypasses all RBAC — HIGH — 📋 DECISION NEEDED

**Chain:** `auth/gateway-auth.guard.ts:91` — the legacy static-token path authenticates (`isValidBearer(authHeader, this.token) → return true`) **without setting `req.user`** (unlike the JWT path `:71` and service-token path `:82`). Then `auth/role.guard.ts:49-51` — the global `RoleGuard` — treats an unset `req.user` as "skip role enforcement": `if (!user) return true`. Net: a request carrying the static token **passes every `@RequiresRole(...)` route** (admin-only repos/portability/guardrails/ws-settings/approvals, plus all task/workflow/chat/milestone/idea mutations) with owner-equivalent, cross-team access.

**Remotely reachable:** the static-token branch has **no loopback gate**. It's active whenever `MIDNITE_AUTH_TOKEN` (config `gateway.auth.tokenEnv`) resolves — regardless of bind host. The boot fail-closed check (`bootstrap.ts` `assertAuthForHost`) only *requires a token to exist* on a non-loopback bind; it doesn't confine the static path to loopback. So the exact recommended prod config (bind `0.0.0.0` + static token) yields a remotely-reachable endpoint where one shared secret bypasses all RBAC.

**Secondary effect:** unset `req.user` ⇒ `@CurrentUser()` reads as "no team". `service-tokens.controller.ts:26-28` then resolves `teamId = null` → lists/mints service tokens **across every team** (cross-tenant leak).

**Why not fixed here:** this is a threat-model decision, not a mechanical fix. A static token may be *intended* as the self-host superuser key — in which case the fix is to attach an explicit admin principal in the static-token branch (so `RoleGuard` *evaluates* it as authorized rather than *skipping* enforcement) and confine cross-team reads. Alternatively, gate the whole static path to `isLoopbackHost(config.gateway.host)` so it matches the "dev/scripts fallback" framing. Either changes behavior for existing single-user/self-host deployments, so it needs an explicit call.

**Recommended fix (follow-up):** in the static-token branch, set a synthetic `req.user` marked as a full-access/superuser identity that `RoleGuard` recognizes; **and** change `role.guard.ts:51` to *fail closed* for routes that declare `@RequiresRole` when no principal is resolved (routes without `@RequiresRole` stay unaffected). Confine the static path to loopback unless an explicit "static token is a remote admin key" opt-in is set.

## A-2 — No per-account login lockout/backoff — HIGH — 📋 DESIGN NEEDED

`users/users.service.ts:72-78` (`validateCredentials`, route `auth.controller.ts:50`) does a bare `bcrypt.compare` and throws on mismatch — **no failed-attempt counter, no lockout, no backoff** anywhere in `users/` or `auth/`. With the rate-limit guard default-off (A-4), `POST /auth/login` can be hammered with zero throttling; the only friction is bcrypt cost 12 (a CPU cost per attempt, also a mild DoS amplifier). Even with the guard enabled it's per-IP only — a rotated-IP or few-IP-many-account spray isn't meaningfully bounded, and there's no notion of "N failures for this email."

**Fix (follow-up):** a per-email failed-attempt counter with exponential backoff / temporary lockout (+ optional small artificial delay on failure) in `validateCredentials`. Needs a design decision (attempt-state storage, lockout window, locked-account UX), so not a zero-risk change.

## A-3 — Missing HTTP security headers — MED — ✅ FIXED

The gateway set **no** security response headers (no `@fastify/helmet`, no header hook). It serves same-origin HTML (the web export at `/`) and **user-uploaded media** (`/uploads/*`), so the headers are applicable, not moot. Highest concern: without `X-Content-Type-Options: nosniff`, a browser could MIME-sniff a disguised HTML/JS upload served from `/uploads/*` into executable content in the gateway origin (stored XSS).

**Fix (applied):** a global Fastify `onRequest` hook (`bootstrap.ts`) applies three cheap, behavior-safe headers via `lib/security-headers.ts`:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN` (clickjacking guard for the authed UI)
- `Referrer-Policy: no-referrer`

**Deliberately omitted** (documented, not applied): a `Content-Security-Policy` (must be tuned to the Next static export's inline scripts/styles or it breaks the UI) and `Strict-Transport-Security` (HSTS belongs at the TLS-terminating proxy, not this plain-HTTP loopback listener). Tests in `lib/security-headers.test.ts`.

## A-4 — Rate-limit guard default-off — MED — 📋 RECOMMENDATION (deferred)

`auth/rate-limit.guard.ts` is a per-IP fixed-window limiter registered globally as `APP_GUARD` **before** auth (`auth.module.ts:33`), so it throttles unauthenticated floods first — **but it's inert by default**: `canActivate` short-circuits when `max <= 0` (`:34`) and `config.ts:194` defaults `max: 0`. Coverage when enabled: covers `/auth/*`, `/service-tokens`, and (deliberately) `POST /integrations/inbound/:id`; **exempts** `/health*` and `/hooks/*` (`auth-policy.ts:48-56`), and does **not** cover the WS upgrade (`getType() !== 'http'`) or Fastify-native routes (`/uploads/*`, web static — outside `APP_GUARD`).

**Recommendation:** ship a conservative non-zero default (e.g. `max: 300` per 60s window) at `config.ts:194` — ~5 req/s per IP, well above any legitimate single-user/CLI/browser client, capping blind floods and token brute-forcing (health + hooks already exempt).

**Why not applied here:** flipping a default-**off** DoS control to default-**on** is a behavior change I can't verify against the real app in this audit (a burst on initial board load across many widgets could plausibly approach the ceiling; the WS live-update path is exempt but REST query-invalidations aren't). Per the iteration's scoping (behavior-changing → document, don't flip), left as the top rate-limit recommendation for an operator decision. Note it does **not** solve A-2 (per-IP ≠ per-account).

## A-5 — Service tokens have no scopes — MED — 📋 DOCUMENTED

`shared/src/service-token.ts:12-22` + `db/schema.ts:1275-1292` have **no scope column**. `gateway-auth.guard.ts:79-89` maps a validated service token to `req.user = { userId: st.createdBy, teamId: st.teamId }`, so a token created by an owner **acts with owner privileges** on every role-gated route — a CI/script key is indistinguishable from a full human admin. Least-privilege is impossible.
**Good parts:** service tokens are hashed at rest (SHA-256, `service-tokens.service.ts:48-50`), lookups filter `revoked_at IS NULL` + check expiry, and revocation works.
**Fix (follow-up):** add a `scopes` column, embed scopes in the record, enforce per-route (a scope guard or extended `RoleGuard`).

## A-6 — No refresh-token reuse detection — MED — 📋 DOCUMENTED

`auth/jwt.service.ts:94-104` rotates correctly (single-use: revokes the presented row, issues fresh). But replaying an already-revoked token just throws `RefreshTokenRevokedError` (`refresh-tokens.repository.ts:14-19` filters `revokedAt IS NULL`) — it does **not** revoke the user's whole token family. A stolen-then-used token lets an attacker's chain persist silently (OWASP refresh-rotation reuse-detection gap).
**Fix (follow-up):** on a refresh presenting a token that hashes to a *revoked* row (look up without the `revokedAt IS NULL` filter, or track a family/generation id), call `revokeAllForUser` and force re-auth.

## A-7 — Terminal token non-constant-time compare — MED — ✅ FIXED

`terminal/terminal.service.ts:215` (`verifyToken`) compared with plain `!==`. Both sides are random UUIDs and the token is single-use + in-memory, so practical timing risk is low, but it was inconsistent with the codebase's timing-safe token compares.
**Fix (applied):** use `safeEqual` (`auth/lib/auth-policy.ts`, length-aware `timingSafeEqual`). Behavior-identical; existing `verifyToken` specs (wrong→false, correct→true, single-use) still pass.

## A-8 — Terminal token map: no active TTL sweep — MED — 📋 DOCUMENTED

The only removal from `terminal.service.ts`'s in-memory `tokens` map is the single-use delete inside `verifyToken`. A minted-but-never-attached token (client never connects, or connects to a different sessionId) **lingers past its 60s TTL** until a same-session re-mint overwrites it or the process restarts. Bounded by distinct session ids and unusable after expiry (the expiry check still applies), so it's a memory/hygiene leak, not an auth bypass.
**Fix (follow-up):** a periodic unref'd sweep (or purge-on-mint) dropping `Date.now() > expiresAt` entries.

## A-9 — `deleteExpired` is dead code — LOW/MED — 📋 DOCUMENTED

`auth/refresh-tokens.repository.ts:38-40` defines `deleteExpired(before)` but **nothing calls it** — no scheduler, cron, or boot hook. Expired/revoked `refresh_tokens` rows accumulate indefinitely (TTL 7 days). Unbounded growth of a table of hashed credential material; not directly exploitable.
**Fix (follow-up):** schedule `deleteExpired(new Date().toISOString())` periodically and/or at boot.

## A-10 — CORS — ✅ VERIFIED SOUND

`bootstrap.ts:117-119` + `lib/allowed-origin.ts:12-20`: origin validated by callback against `config.gateway.allowedOrigins` plus always-allowed loopback (any port). **No wildcard `*`**; `credentials` not set (defaults false) → **no dangerous wildcard+credentials combo**; unknown browser origins fail closed. Absent-Origin requests are allowed intentionally (CLI/server-to-server clients send none; the CSRF threat requires a browser Origin) — a documented, defensible choice. **WS parity is strong:** all six WS gateways (`terminal`/`tasks`/`workflows`/`ideas`/`approvals`/`notifications`) independently enforce `isAllowedOrigin` in `handleConnection` (close 1008 on mismatch) against the same allowlist — the common "WS bypasses CORS" gap is **not** present. No action.

---

## Confirmed done-right (call-outs)

Refresh tokens hashed + single-use rotated + server-side revoke on logout; JWT verify pins `algorithms: ['HS256']` (avoids alg-confusion); service tokens hashed/revocable/expiry-enforced; terminal tokens single-use + expiry-checked; inbound receiver HMAC-gated over raw body; the rate-limit guard runs before auth and deliberately keeps `/integrations/inbound/:id` throttled.

## Quick-wins applied in this PR

- **A-3** baseline security headers (`nosniff` / `X-Frame-Options` / `Referrer-Policy`) via a global hook + `lib/security-headers.ts` (tested).
- **A-7** terminal token constant-time compare (`safeEqual`).

## Logged as follow-ups (not in this PR)

- **A-1** static-token RBAC bypass (HIGH) — needs a threat-model decision; recommend a dedicated theme.
- **A-2** per-account login lockout/backoff (HIGH) — needs design.
- **A-4** conservative default `rateLimit.max` (MED) — operator decision.
- **A-5** service-token scopes · **A-6** refresh reuse-detection · **A-8** terminal TTL sweep · **A-9** wire `deleteExpired`.
