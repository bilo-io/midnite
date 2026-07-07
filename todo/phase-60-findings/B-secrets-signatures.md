# Phase 60 Theme B — Secrets, signatures & crypto paths audit

**Date:** 2026-07-07 · **Scope:** gateway (`packages/gateway`) + `shared` contracts · **Method:** encrypted-at-rest column inventory vs `CryptoService`; signature/HMAC path review (inbound Phase 46, outbound Phase 44, Claude-hook, bearer/service tokens); leak-surface sweep (logs, error responses, spawn-env scrub, config/health endpoints). Read-only except the two quick-win fixes below (per the Section-I rule: HIGH + effort-S may be fixed inline).

## Summary

| # | Area | Severity | Status |
|---|------|----------|--------|
| B-1 | Workflow `$env` exposes the gateway master secrets to `{{expr}}` (persisted + broadcast + exfiltratable) | **P1** (P0-adjacent) | ✅ **Fixed in this PR** |
| B-2 | Spawn-env scrub still default-**off** → every spawned agent inherits `MIDNITE_SECRET_KEY` / JWT / auth token | **P1** | 📋 Documented (default flip = behavior change) |
| B-3 | Webhook + inbound-source HMAC secrets fall back to **plaintext-at-rest** when `MIDNITE_SECRET_KEY` unset (fail-open) | P2 | 📋 Documented |
| B-4 | `team_invites.token` stored plaintext (every other bearer token is hashed) | P3 | 📋 Documented |
| B-5 | OAuth token-exchange **error-response body** logged at error level | P3 | 📋 Documented |
| B-6 | Terminal-WS `verifyToken` uses plain `!==` (not timing-safe) | P3 | 📋 Documented |
| B-7 | Stale schema comment: `llm_providers.api_key` "stored plaintext" (it's encrypted) | P3 | ✅ **Fixed in this PR** |
| B-8 | `CryptoService` primitive (AES-256-GCM, fail-closed) | — | ✅ Verified sound |
| B-9 | Inbound HMAC (Phase 46): raw-body + `timingSafeEqual` + length-check | — | ✅ Verified safe |
| B-10 | Claude-hook `x-midnite-hook-secret`: per-session, hashed, timing-safe, correctly not rotated on reattach | — | ✅ Verified safe |
| B-11 | Outbound signing (Phase 44) + bearer/service tokens (timing-safe / hashed) | — | ✅ Verified safe |
| B-12 | Error responses (generic 500, no stack/secret) + health/config endpoints (no env exposure) | — | ✅ Verified safe |
| B-13 | Encrypted-vs-hashed appropriateness across all secret columns; prior `llm_providers.apiKey` plaintext concern | — | ✅ Verified correct / not present |

Two actionable items were **fixed inline** (B-1 HIGH+S, B-7 doc). Two real gaps (B-2, B-3) require behavior changes and are logged for the remediation backlog (Theme M). The core crypto + signature machinery is sound.

---

## B-1 — Workflow `$env` exposes the gateway master secrets — P1 (P0-adjacent) — ✅ FIXED

**Location:** `packages/gateway/src/workflows/engine/workflow-engine.service.ts` (`$env` binding in the per-node `ExpressionContext`).

**The hole (before):** the expression context bound the **entire** process env:
```ts
const context: ExpressionContext = { $json: input, $node: nodeContext, $env: process.env };
```
`$env` is resolvable in any `{{expr}}` node param, and a resolved value is (1) persisted as the node run's `output`, (2) broadcast over WS to run subscribers, and (3) exfiltratable via an `http.request` node's URL/body. So a workflow author (member) could set an HTTP node param to `{{$env.MIDNITE_SECRET_KEY}}` and read the gateway's **master encryption key** — which decrypts every stored provider key + workflow-credential blob at rest — plus the JWT signing secret and bearer auth token.

**Repro (before):** create a workflow with an `http.request` node whose body is `{"k":"{{$env.MIDNITE_SECRET_KEY}}"}`, run it, read the node output (persisted + broadcast) → the master key is disclosed.

**The fix:** `$env` now resolves through `WorkflowEngine.safeEnv()`, a copy of `process.env` with the gateway's own secret env vars removed — reusing `gatewaySecretEnvNames(config)` (the *same* list the Phase-50 spawn-env scrub uses, now extracted to a pty-free lib `config/gateway-secret-env.ts` so the two paths can't drift). Ordinary env vars (`{{$env.PATH}}`, deployment vars) still resolve; only `MIDNITE_SECRET_KEY`, the configured auth-token env, JWT-secret env, and workflows-key env are stripped. Test: `workflow-engine.expression.spec.ts` — a non-secret env var still resolves; `{{$env.MIDNITE_SECRET_KEY}}` never surfaces the value anywhere in the run.

Rated P1 rather than P0 only because it requires workflow-authoring privilege (not an unauthenticated actor); the blast radius (the master key) is P0-scale, hence the inline fix.

## B-7 — Stale `llm_providers.api_key` schema comment — P3 — ✅ FIXED

**Location:** `packages/gateway/src/db/schema.ts` (llm_providers comment).

The comment stated the api_key "is stored plaintext". The current code **encrypts** it via `CryptoService` (fail-closed — `provider-credentials.repository.ts` calls `crypto.encrypt`, which throws when the key is unset, so a keyless write is rejected, never persisted plaintext; a boot pass re-encrypts legacy plaintext rows). A future dev could "restore" the plaintext behaviour the comment describes. Corrected the comment to match the code.

---

## B-2 — Spawn-env scrub is default-off → agents inherit the gateway's master secrets — P1 — 📋

**Location:** `packages/shared/src/config.ts:406` (`scrubSpawnEnv: z.boolean().default(false)`); `packages/gateway/src/terminal/terminal.service.ts` (agent/managed-run spawn builds env from `fullEnv()` and only scrubs `if (this.config.guardrails.scrubSpawnEnv)`).

**Observed:** the flag defaults **false**, so the **agent / managed-run spawn path** (the primary autonomous execution path) hands every spawned Claude Code process the gateway's full env — including `MIDNITE_SECRET_KEY` (decrypts all secrets at rest), the JWT signing secret, and the bearer auth token. A prompt-injected or misbehaving agent can `env | grep -E 'MIDNITE|SECRET|TOKEN|JWT'` and exfiltrate them. (The **interactive** shell path is safe by default — it applies `scrubSecretEnv()` unless `terminal.inheritSecrets`; only the agent path is exposed.)

**Repro:** default config → run a task whose agent prints its env → master key + auth token + JWT secret are present.

**Suggested fix:** flip `scrubSpawnEnv` to default **true** (the scrub already exists and deliberately preserves the agent's own provider auth like `ANTHROPIC_API_KEY` + the re-injected `MIDNITE_*` hook wiring, so an agent still runs). This is a **behavior change** for deployments that (accidentally) rely on inherited gateway secrets, so it's logged rather than flipped inline. **Effort S** (one default + a test), but not a "no-behavior-change" quick win. Strong recommendation for the remediation theme.

## B-3 — Webhook + inbound-source HMAC secrets fail open to plaintext-at-rest — P2 — 📋

**Location:** `packages/gateway/src/.../managed-secret.ts:25-27`:
```ts
export function encryptSecret(crypto: CryptoService | undefined, raw: string): string {
  return crypto && crypto.isEnabled() ? crypto.encrypt(raw) : raw; // ← stores RAW when key unset
}
```
Unlike `llm_providers.api_key` and `workflow_credentials.data` (which **throw** when `MIDNITE_SECRET_KEY` is unset), a keyless gateway silently persists `webhooks.secret` (Phase 44) and `inbound_sources.secret` (Phase 46) as raw `whsec_…`/`insec_…` strings — contradicting the "encrypted at rest" contract the schema comments advertise.

**Repro:** boot with `MIDNITE_SECRET_KEY` unset → create an inbound source → `inbound_sources.secret` is plaintext in the DB. An attacker with DB-file/backup read access (the exact threat encryption-at-rest defends) reads the HMAC secret and forges a validly-signed inbound request → `createFromPrompt` → arbitrary task injection. Outbound `webhooks.secret` leak is lower impact (forge deliveries appearing to originate from the gateway).

**Suggested fix:** make `encryptSecret` fail-closed like the other two writers (throw when `crypto` is present but keyless), or gate webhook/source creation on `crypto.isEnabled()`. P2 (not P1): exploitation presupposes DB-read access **and** a keyless deployment. **Effort S.**

## B-4 — `team_invites.token` stored plaintext — P3 — 📋

**Location:** `packages/gateway/src/teams/teams.service.ts` (`token: randomUUID()`); lookup by raw-token equality in `teams.repository.ts`.

A bearer credential that grants team membership at a chosen role, stored raw while every other bearer token (service tokens, refresh tokens, workflow webhook tokens, hook secrets) is SHA-256 hashed. Single-use + expiring, so bounded, but a leaked DB lets an attacker accept outstanding invites. **Suggested fix:** hash on write, compare hashes (mirror `service_tokens`). **Effort S.**

## B-5 — OAuth token-exchange error body logged — P3 — 📋

**Location:** `packages/gateway/src/.../oauth.service.ts:141,173` — `this.logger.error({ provider, status, body }, 'Google/Slack token exchange failed')` logs the provider's raw error-response `body`. Low risk (it's the provider's response, not the outbound request carrying `client_secret`), but a provider that echoes request params on error could surface a secret into gateway logs. **Suggested fix:** log `status` only (or a redacted body). **Effort S.**

## B-6 — Terminal-WS `verifyToken` uses plain `!==` — P3 — 📋

**Location:** `packages/gateway/src/terminal/terminal.service.ts` (`verifyToken`): `if (entry.token !== token) return false;` — the only secret compare in the codebase that isn't constant-time. **Not P1** because the token is **single-use** (`this.tokens.delete(sessionId)` runs *before* the compare, so every attempt burns it — a timing side-channel needs repeated samples of a fixed secret) and a 122-bit `randomUUID()` with a short TTL. **Suggested fix (consistency/defense-in-depth):** route through the same `safeEqual`/`tokenMatches` helper used everywhere else. **Effort S.**

---

## Verified safe (no finding)

- **B-8 CryptoService** (`crypto.service.ts`): AES-256-GCM, per-value random 12-byte IV, 16-byte auth tag, `v1:base64(iv|tag|ct)` format; 32-byte key from hex/base64; **fail-closed** — `encrypt` throws when the key is unset (never a silent plaintext write), `decrypt` returns null; key lazily reloaded per call (rotation without restart). No KDF, but the key is a full 32-byte secret, so none is required.
- **B-9 Inbound HMAC (Phase 46):** HMAC over the **raw** captured body (`bootstrap.ts` `rawBody:true`; controller signs `request.rawBody`, never a re-serialized `req.body`); `safeEqual` = length-check + `timingSafeEqual`; per-source decrypted secret; missing header/sig/timestamp → early `false`. GitHub/Linear/generic all route through it; the generic recipe is timestamp-bound and matches the outbound signer.
- **B-10 Claude-hook auth:** secret in header (not URL), verified before body parse; per-session `randomBytes(24)` stored only as a SHA-256 hash; compare via `tokenMatches` (byte-length check + `timingSafeEqual`); **correctly not** re-minted on tmux reattach (the live process keeps its original env secret; the persisted hash survives restart).
- **B-11 Outbound + bearer:** Phase 44 delivery signs `sha256=hex(HMAC(secret, \`${ts}.${body}\`))` (timestamp-bound, per-webhook decrypted secret); redeliver re-signs the exact stored bytes; gateway bearer + workflow webhook token compares are `safeEqual`/`tokenMatches` (timing-safe). The notifications `WebhookChannel` sends unsigned by design (fire-and-forget sink behind the SSRF guard).
- **B-12 Error/endpoints:** no custom exception filter → Nest's built-in returns a generic `{statusCode:500,message:"Internal server error"}` with **no stack in the body regardless of NODE_ENV**; `HttpException` messages reference env-var *names*, never values; no "failed to decrypt `<value>`" pattern. `GET /health*`, `/environment`, `/setup/status`, `/approvals/guardrails` expose statuses/flags/env-var *names*, never values or `process.env`.
- **B-13 Storage appropriateness:** every replay-required secret (provider keys, workflow-credential blobs, HMAC signing secrets) uses reversible AES-GCM; every verify-only credential (passwords → bcrypt, all bearer/refresh/service/hook tokens → SHA-256) is hashed. The earlier-flagged `llm_providers.apiKey` plaintext-fallback **does not reproduce** on current `main` (encrypted + fail-closed; see B-7).
