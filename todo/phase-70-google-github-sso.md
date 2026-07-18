# Phase 70 — Google & GitHub SSO (sign in / sign up)

> [Phase 33](phase-33-multi-user-teams.md) landed the auth foundation — email+password login, HS256 JWT access+refresh tokens ([`auth/jwt.service.ts`](../packages/gateway/src/auth/jwt.service.ts)), refresh-token revocation, teams — and **explicitly deferred OAuth/SSO** as an "enterprise concern" ([phase-33:134](phase-33-multi-user-teams.md)). Meanwhile the workflow-credentials module already ships a **working authorization-code OAuth flow** ([`workflows/credentials/oauth.service.ts`](../packages/gateway/src/workflows/credentials/oauth.service.ts)) — encrypted CSRF `state` via the `@Global` [`CryptoService`](../packages/gateway/src/crypto/crypto.service.ts) (AES-256-GCM), per-provider token exchange, header-derived callback base. **Phase 70 gives users "Continue with Google / GitHub"** by lifting that *pattern* (not the class) into a dedicated `SsoService` in the auth module: it resolves or provisions a user, links the external identity, and issues the **same** JWTs `POST /auth/login` already does. No Firebase, no external IdP — midnite stays self-hosted and local-first.
>
> **Scope guardrails (CLAUDE.md).** `shared` is the contract: a new `LoginProviderSchema` (`google | github`) and SSO request/response schemas live in [`shared/src/user.ts`](../packages/shared/src/user.ts); `web`/`cli` speak only the typed client and **never** import gateway internals. The login SSO service lives in **`gateway/src/auth/`** (alongside `JwtService`) — it must **not** extend or import the workflow-vault `OAuthService` (that class is wired to `WorkflowCredentialsService` and writes vault rows; sharing the `@Global` `CryptoService` is fine, sharing the class is not). Login providers are a **separate enum** from the credential-vault `OAuthProvider` (`google | slack`) — don't overload it. Client secrets stay **env-name-only** (`clientSecretEnv`, mirroring `jwt.secretEnv`) — never inline a secret in config. The web layer keeps setting the `__midnite_rt` httpOnly cookie; the gateway must not set browser cookies. **Out of scope:** SAML / generic OIDC / enterprise IdPs, Slack or other social providers as *login*, MFA, org-domain auto-join, and identity **un**-linking UI beyond the minimum.
>
> Effort tags: **S** small · **M** medium · **L** large. **A** (contract) unblocks everything; **B** (persistence) and **C** (gateway flow) are the core and land in sequence (C needs B's linking); **D** (web UX) rides on C's endpoints; **E** (config + docs) can land in parallel with A; **F** (login hero) is an independent web-only visual layer that can land any time (it dresses the pages the D buttons live on). B+C+D form the auth core; F is the front-door polish.

---

## Current state (what exists to build on)

- **User auth** — [`auth/auth.controller.ts`](../packages/gateway/src/auth/auth.controller.ts): `POST /auth/{register,login,refresh,logout}` + `GET /auth/me`. Login = `users.validateCredentials` (bcrypt, 12 rounds) → resolve `primaryTeamId` → `jwtSvc.issueAccessToken(userId, email, teamId)` + `issueRefreshToken(userId)` → `AuthResponseSchema.parse({ accessToken, refreshToken, user })`. **The exact reuse point:** after resolving an OAuth identity, call the *same* issue pair.
- **JWT** — [`auth/jwt.service.ts`](../packages/gateway/src/auth/jwt.service.ts): HS256, secret from `process.env[config.gateway.auth.jwt.secretEnv]` (default `MIDNITE_JWT_SECRET`); **opt-in** (JWT disabled ⇒ login returns just `{ user }`). Refresh tokens are single-use (`consumeRefreshToken` revokes on consume), SHA-256 hashed in `refresh_tokens`.
- **User record** — [`db/schema.ts`](../packages/gateway/src/db/schema.ts) `users`: `{ id, email (unique), name, password_hash (NOT NULL), created_at, updated_at }`. **No external-identity field**, and `password_hash` is non-null — a pure-SSO user can't be inserted as-is (→ Theme B nullable migration).
- **Existing OAuth flow (pattern reference)** — [`workflows/credentials/oauth.service.ts`](../packages/gateway/src/workflows/credentials/oauth.service.ts): `buildAuthorizationUrl` / `handleCallback` / `encryptState` / `decryptState`. State = `crypto.encrypt(JSON.stringify(payload))` (GCM = confidentiality + integrity). **Gaps for login:** the embedded `nonce` is never stored/checked (no replay guard), no expiry in state, and `handleCallback` hard-writes a `workflow_credentials` row — all workflow-specific.
- **Crypto** — [`crypto/crypto.service.ts`](../packages/gateway/src/crypto/crypto.service.ts): `@Global`, AES-256-GCM, key from `MIDNITE_SECRET_KEY`, **fail-closed** (no key ⇒ `encrypt` throws). Reuse directly for state signing.
- **Config** — [`shared/src/config.ts`](../packages/shared/src/config.ts): `GatewayAuthConfigSchema` under `gateway.auth` (`jwt.secretEnv`, `tokenEnv`, `rateLimit`, …). `OAuthClientConfigSchema` (`{ clientId, clientSecretEnv, scopes }`, **no `redirectUri`**) lives under `workflows.oauth` — the vault's, not login's.
- **Web login** — [`app/(auth)/login/page.tsx`](../packages/web/app/(auth)/login/page.tsx): email+pw form → `useAuth().login()`. [`contexts/auth-context.tsx`](../packages/web/contexts/auth-context.tsx): access token **memory-only** (`setAccessToken`), refresh token as httpOnly `__midnite_rt` cookie set by the Next proxy route [`app/api/auth/login/route.ts`](../packages/web/app/api/auth/login/route.ts). `jwtEnabled` derived from 200/401 vs 503.
- **Shared auth schemas** — [`shared/src/user.ts`](../packages/shared/src/user.ts): `UserSchema`, `LoginRequestSchema`, `AuthResponseSchema` (`{ accessToken, refreshToken, user }` — **reuse as-is** for SSO success), `RefreshRequestSchema`.

---

## Theme A — Shared contract: login-provider enum + SSO schemas — **S**

The contract lands first so gateway and web agree on shapes. Everything new goes in `shared`, per the Golden Rule.

- [ ] `LoginProviderSchema = z.enum(['google', 'github'])` + `LoginProvider` type in [`shared/src/user.ts`](../packages/shared/src/user.ts) — **distinct** from the credential-vault `OAuthProviderSchema` (`google | slack`) so the two provider sets stay independent.
- [ ] `SsoStartParamsSchema` (`{ redirect?: string }` — the post-login web path to return to, defaulted + same-origin-validated on the web side) and, if we use the one-time-code handoff (Decision §3), `SsoExchangeRequestSchema` (`{ code }`) + response reusing `AuthResponseSchema`.
- [ ] Extend `UserSchema` with an **optional** `identities?: { provider: LoginProvider; email: string }[]` (or a lean `authProviders?: LoginProvider[]`) — optional so existing `UserSchema.parse` callers in `auth.controller.ts` stay valid, and so the settings UI can show "linked accounts".
- [ ] Typed API-client methods on the shared client for the SSO endpoints web/cli consume (start-URL builder + exchange), keeping web a pure HTTP client.
- [ ] Unit tests for the new schemas (enum, params validation, `AuthResponse` reuse).

---

## Theme B — Identity persistence: `user_identities` + nullable password — **M**

Link an external identity to a user, and let pure-SSO users exist. Consistent with the repo's "one concern per row, no cross-domain FK" convention (see the `user_preferences` sibling table).

- [ ] New `user_identities` table in [`db/schema.ts`](../packages/gateway/src/db/schema.ts): `{ id, userId, provider, providerUserId, email, createdAt }`, **unique index on `(provider, providerUserId)`**, index on `userId`. Forward-only Drizzle migration.
- [ ] Migration making `users.password_hash` **nullable** (Decision §2 — passwordless SSO users). Guard `validateCredentials`/password-login to **reject** password login for a null-hash user with a clear "use Google/GitHub to sign in" error (not a generic invalid-credentials leak).
- [ ] `UserIdentitiesRepository` (Drizzle-only, under `auth/` or `users/`): `findByProviderIdentity(provider, providerUserId)`, `insertIdentity(...)`, `listForUser(userId)`.
- [ ] `UsersService` gains `findOrCreateFromSso({ provider, providerUserId, email, name })`: (1) lookup by `(provider, providerUserId)` → existing user; (2) else **auto-link on verified email** (Decision §1) — match an existing `users.email` and insert the identity link; (3) else **provision** (Decision §4) — create the user (null password) **+ a team** mirroring `POST /auth/register`'s bootstrap, gated by the open-signup policy.
- [ ] Only trust **provider-verified** emails for auto-link (Google `email_verified`, GitHub primary+verified email) — an unverified provider email must not silently take over an existing account.
- [ ] Repository integration tests (real `:memory:` SQLite): unique-constraint on duplicate identity, link-by-email, provision path, null-hash password-login rejection.

---

## Theme C — Gateway SSO flow: `SsoService` + `SsoController` — **L**

The heart of the phase. A dedicated auth-module service that runs the authorization-code dance and issues our JWTs. Reuses `CryptoService` for state; **does not** touch the workflow `OAuthService`.

- [ ] `auth/sso.service.ts`: `buildAuthorizationUrl(provider, statePayload)` and `handleCallback(provider, code, state)`. State = `crypto.encrypt(JSON.stringify({ provider, nonce, redirect, exp }))`, decrypted + provider-matched on callback (mirroring the vault pattern).
- [ ] **State hardening beyond the vault flow (Decision §5):** a **single-use nonce store with a short TTL** (~10 min) — a small table (or bounded in-memory map) written at `start`, consumed+deleted at `callback`; reject replayed/expired/unknown nonces. Closes the replay gap the vault flow leaves open.
- [ ] **Google**: auth `https://accounts.google.com/o/oauth2/v2/auth` (scope `openid email profile`, `access_type=offline`); token `https://oauth2.googleapis.com/token`; **verify the `id_token`** (signature + `aud` + `email_verified`) rather than trusting the access token — resolve `sub` → `providerUserId`, `email`, `name`.
- [ ] **GitHub**: auth `https://github.com/login/oauth/authorize` (scope `read:user user:email`); token `https://github.com/login/oauth/access_token` (send `Accept: application/json`); then `GET https://api.github.com/user` + `GET /user/emails` → resolve `id` → `providerUserId`, **primary+verified** email, name.
- [ ] `auth/sso.controller.ts` (thin, `@Controller('auth/sso')`): `GET /auth/sso/:provider/start` (302 → provider consent, provider validated via `LoginProviderSchema`) and `GET /auth/sso/:provider/callback` → `handleCallback` → `usersService.findOrCreateFromSso` → `jwtSvc.issue{Access,Refresh}Token` → hand tokens to web (Decision §3: 302 to a web callback carrying a **one-time code**, not tokens-in-URL). Provider `error=` param handled → friendly redirect.
- [ ] **JWT-disabled guardrail:** when `!jwtSvc.enabled`, SSO endpoints return a clean 503 (consistent with login's degraded mode) rather than half-authenticating.
- [ ] Wire into `AuthModule`; register the new controller. Reuse the existing rate-limit + auth-policy exemptions so the SSO routes are reachable pre-auth (like `/auth/login`).
- [ ] Specs: service (state encrypt/decrypt round-trip, nonce single-use + expiry, provider identity resolution with mocked token/userinfo responses, `email_verified=false` rejection) + controller (unknown provider 400, provider `error` redirect, JWT-disabled 503, happy-path issue+redirect).

---

## Theme D — Web sign-in UI + callback handoff — **M**

"Continue with Google / GitHub" where users already sign in, completing the token handoff without leaking tokens into browser history.

- [ ] **Provider buttons** on [`app/(auth)/login/page.tsx`](../packages/web/app/(auth)/login/page.tsx) (and the register page) — plain links/anchors to `${gateway}/auth/sso/:provider/start?redirect=…`, styled with the existing button primitives; hidden when SSO isn't configured (surfaced via `/auth/me`-style capability or a `NEXT_PUBLIC_*` flag).
- [ ] **Web callback route** `app/api/auth/sso/callback/route.ts`: receives the gateway's one-time code, **exchanges it server-side** for `{ accessToken, refreshToken, user }`, sets the `__midnite_rt` httpOnly cookie **exactly like** [`app/api/auth/login/route.ts`](../packages/web/app/api/auth/login/route.ts) (secure in prod, `sameSite: lax`, 7-day), and redirects to the validated `redirect` path (default `/`). No token ever lands in a URL query string.
- [ ] `auth-context.tsx`: absorb the SSO-returned session identically to `login()` (`applyTokens` + `loadTeams`) — SSO and password login converge on the same client state. Same-origin validation on the `redirect` param (open-redirect guard).
- [ ] **Linked-accounts** (minimal) in Settings: show `user.identities`/`authProviders` (from Theme A) so a user can see which providers are linked. Full unlink UI is out of scope.
- [ ] Tests: RTL for the login page buttons (render/gating on configured providers), a `play` story for the SSO button row, and a route-handler test for the callback cookie-set + open-redirect rejection.

---

## Theme E — Config, secrets & docs — **S**

Where the client IDs/secrets live, and how an operator turns SSO on. Lands in parallel with A.

- [ ] New `gateway.auth.sso` block in [`shared/src/config.ts`](../packages/shared/src/config.ts): `{ google?: OAuthClientConfig, github?: OAuthClientConfig }`, **reusing `OAuthClientConfigSchema`** (`clientId` + `clientSecretEnv` env-name-only + `scopes`). Add an optional `redirectUri` (Google/GitHub app registrations pin a callback) and/or a shared `webBaseUrl` so the callback→web redirect target is explicit, not purely header-derived.
- [ ] Default config object updated; SSO **absent by default** (a deployment with no `sso` block simply shows no provider buttons — behaviour-preserving).
- [ ] Boot validation: if an `sso.<provider>` block is present but its `clientSecretEnv` var is unset, fail-closed with a clear message (mirroring the JWT/crypto env checks).
- [ ] Docs: README + `midnite.json` schema docs — how to register a Google OAuth client + a GitHub OAuth app, which redirect URI to whitelist, which env vars to set. Note SSO requires JWT enabled (`MIDNITE_JWT_SECRET`) and `MIDNITE_SECRET_KEY` (state encryption).
- [ ] Config-schema unit test (parse with/without the `sso` block; env-name resolution).

---

## Theme F — Login hero: split-screen + living knowledge-graph starfield — **L**

Turn the bare auth pages into a hero: a **left third** carrying the form (email/password + the Theme D provider buttons) and a **right two-thirds** with animated typewriter copy over a galaxy-like starfield that periodically lights up constellations as knowledge-graph edges — a visual echo of what midnite *is* (a live graph of tasks/agents/repos). Builds on the existing canvas + typewriter + motion primitives; no gateway, pure `packages/web` (plus maybe one `@midnite/ui` extraction).

- [ ] **Split layout** on [`app/(auth)/layout.tsx`](../packages/web/app/(auth)/layout.tsx) (shared by login/register/invite): left `1/3` form column, right `2/3` hero. Responsive — the hero collapses **below `lg`** (mobile/tablet show the form full-width, per [`lib/breakpoints.ts`](../packages/web/lib/breakpoints.ts) / `useIsDesktop`), so the canvas never ships to small screens.
- [ ] **Typewriter title + subtitle** in the hero via the existing [`lib/use-typewriter.ts`](../packages/web/lib/use-typewriter.ts): a **login-specific** randomised copy set (a small curated array of `{ title, subtitle }` pairs picked once per mount) — distinct from the dashboard/quote copy. Respects reduced-motion (renders the final string immediately when motion is off).
- [ ] **Galaxy starfield background** — a new canvas component (`components/auth/constellation-background.tsx` or a new `'galaxy'` `BackgroundPattern` twin alongside the `dots` case in [`dynamic-background.tsx`](../packages/web/components/dynamic-background.tsx)): stars scattered on a **galaxy-like radial/clustered distribution** (not the `dots` grid), with **semi-realistic twinkle** (per-star phase-offset opacity/size shimmer on a subset). Colours read live from theme tokens so it re-tints on theme/accent switch, matching the existing canvas convention.
- [ ] **Constellation lighting = dynamic knowledge graph:** periodically pick a random subset of nearby stars, **light them up** and briefly draw the **connection-graph edges** between them (fading in/out over ~1–2s), then move on to a different constellation — a lively, ever-changing graph. Edge/node colours reuse the `--node-trigger`/`--node-action`/`--node-logic`/`--node-data` tokens (the same four the canvas already reads) so it literally renders midnite's node palette.
- [ ] **Motion & a11y gating:** the whole animation runs only when motion is allowed — reuse [`lib/use-animation-prefs.ts`](../packages/web/lib/use-animation-prefs.ts) / the `useDynamicBackground()` gate pattern (Motion setting + OS `prefers-reduced-motion`); reduced-motion falls back to a **static** star field (no twinkle, no constellation cycling). RAF loop cleaned up on unmount; pause when the tab is hidden.
- [ ] Tests/stories: an RTL test that the hero is desktop-only (not rendered `< lg`) and the form is always present; a `play` story for the split layout (light+dark); assert the typewriter copy is login-specific + reduced-motion short-circuits. Canvas motion itself proven via a Storybook shot rather than pixel assertions.

> **Scope note:** the starfield is decorative — it must **never** block or delay the form (form is fully usable while the canvas is still warming up, and with JS/canvas unavailable). Keep the star/edge counts modest so it's cheap on a login screen; this is a backdrop, not the office-3D scene.

---

## Files this phase touches

**shared**
- [`shared/src/user.ts`](../packages/shared/src/user.ts) — `LoginProviderSchema`, SSO schemas, `UserSchema.identities`
- [`shared/src/config.ts`](../packages/shared/src/config.ts) — `gateway.auth.sso` block
- shared API client — SSO start/exchange methods

**gateway**
- [`auth/sso.service.ts`](../packages/gateway/src/auth/) · [`auth/sso.controller.ts`](../packages/gateway/src/auth/) — **new**
- [`auth/auth.module.ts`](../packages/gateway/src/auth/auth.module.ts) — register SSO controller/service
- `auth/user-identities.repository.ts` — **new** (+ nonce store)
- [`users/users.service.ts`](../packages/gateway/src/users/users.service.ts) — `findOrCreateFromSso`, null-hash guard
- [`db/schema.ts`](../packages/gateway/src/db/schema.ts) + `db/migrations/` — `user_identities`, nullable `password_hash`, nonce table
- [`crypto/crypto.service.ts`](../packages/gateway/src/crypto/crypto.service.ts) — reused as-is (no change)
- [`auth/jwt.service.ts`](../packages/gateway/src/auth/jwt.service.ts) — reused as-is (no change)

**web**
- [`app/(auth)/login/page.tsx`](../packages/web/app/(auth)/login/page.tsx) + register page — provider buttons
- `app/api/auth/sso/callback/route.ts` — **new** (cookie handoff)
- [`contexts/auth-context.tsx`](../packages/web/contexts/auth-context.tsx) — absorb SSO session
- Settings — linked-accounts display
- [`app/(auth)/layout.tsx`](../packages/web/app/(auth)/layout.tsx) — split-screen hero shell (Theme F)
- `components/auth/constellation-background.tsx` — **new** galaxy/knowledge-graph starfield (or a `'galaxy'` twin in [`dynamic-background.tsx`](../packages/web/components/dynamic-background.tsx))
- `components/auth/auth-hero.tsx` — **new** typewriter title/subtitle + login copy set
- [`lib/use-typewriter.ts`](../packages/web/lib/use-typewriter.ts) · [`lib/use-animation-prefs.ts`](../packages/web/lib/use-animation-prefs.ts) — reused as-is (Theme F)

**docs**
- `README.md` + `midnite.json` schema docs — SSO setup

---

## Verification

- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` all green.
- [ ] **Google sign-up (new user):** first Google login with a verified email creates a user (null password) + a team, issues JWTs, lands on `/`. Second login reuses the same user.
- [ ] **GitHub sign-up (new user):** same, resolving the primary+verified email + `id`.
- [ ] **Auto-link:** signing in with Google using the email of an existing password user links the identity to that account (no duplicate user); that user can then use either method.
- [ ] **Passwordless guard:** a pure-SSO user attempting password login gets the "use Google/GitHub" message, not a generic failure.
- [ ] **Replay/expiry:** a reused or expired `state`/nonce is rejected at callback; a tampered state (bad GCM tag) is rejected.
- [ ] **No token leak:** tokens never appear in a URL; the refresh token lands only in the `__midnite_rt` httpOnly cookie; open-redirect via `redirect=` is blocked.
- [ ] **Degraded modes:** JWT disabled ⇒ SSO endpoints 503 cleanly; no `sso` config ⇒ no provider buttons, password login unaffected; missing `clientSecretEnv` ⇒ fail-closed at boot.
- [ ] **Boundaries:** `web`/`cli` import only `@midnite/shared`; `auth/sso.service.ts` does not import `workflows/credentials`; new wire shapes all have zod schemas in `shared`.
- [ ] Repository, service, and controller specs land per theme; web button + callback tests pass.
- [ ] **Login hero (F):** on desktop (`≥ lg`) the split screen renders (form left third, starfield hero right two-thirds with typewriter title/subtitle); below `lg` the hero is gone and the form is full-width. Reduced-motion (Motion setting or OS) shows a static star field — no twinkle, no constellation cycling — and the typewriter copy resolves immediately. The form is fully usable while/if the canvas doesn't animate; the RAF loop stops on unmount + tab-hidden.

---

## Decisions / open questions

1. **Account linking on email collision → resolved: auto-link on verified email.** If the provider returns a verified email matching an existing user, link automatically. *Safe only because we trust provider-verified emails exclusively* (Google `email_verified`, GitHub primary+verified) — enforced in Theme B/C.
2. **Passwordless SSO users → resolved: yes.** Migration makes `password_hash` nullable; pure-SSO users have no password, and password login is rejected for them with a clear message.
3. **Token handoff to the browser → recommend: one-time code.** Gateway callback issues JWTs then 302s to a web callback route carrying a short-lived single-use code; the web route exchanges it server-side and sets the httpOnly cookie. Avoids tokens-in-URL (browser history/referer leak). *Open:* store the code in the same nonce table or a sibling — lean toward reusing the nonce store.
4. **New-user provisioning → resolved: provision user + team on first SSO**, gated by the same open-signup policy (`NEXT_PUBLIC_REGISTRATION_OPEN` / server-side) as `POST /auth/register`. Invite-only deployments turning signup off get sign-in-only behaviour for free.
5. **State/replay hardening → resolved: nonce store + expiry.** Encrypted state (GCM integrity) **plus** a server-side single-use nonce with ~10-min TTL — closes the replay gap the vault flow leaves.
6. **Provider set → resolved: Google + GitHub only.** SAML/OIDC/Slack-login and other socials are out of scope; the `LoginProviderSchema` enum is the seam a later phase widens.
7. **Redirect URI: configured vs. header-derived → recommend: configured.** The vault flow derives the callback base from request headers; login apps register a pinned redirect URI with the provider, so add an explicit `redirectUri`/`webBaseUrl` to config rather than trusting `Host`/`X-Forwarded-Proto` (which are spoofable and mismatch the registered URI). *Confirm during Theme E.*
8. **SSO ↔ JWT coupling → recommend: SSO requires JWT enabled.** With JWT off, midnite runs in unauthenticated local mode; SSO only makes sense once `MIDNITE_JWT_SECRET` is set. Endpoints 503 when disabled rather than inventing a second session model. *Confirm.*
9. **Starfield: new standalone component vs. new `BackgroundPattern` twin → recommend: standalone `constellation-background.tsx`.** The constellation/knowledge-graph behaviour (lighting up random subsets, drawing+fading edges, per-star twinkle) is login-specific and richer than the cursor-repulsion `dots` twin — a standalone auth component keeps it out of the Settings background gallery and avoids bloating `dynamic-background.tsx`. It still borrows that file's token-reading + RAF conventions. *Reconsider only if we later want "galaxy" as a user-selectable app-wide background.*
10. **Login hero copy → recommend: a small curated in-repo array**, picked at random once per mount (not LLM-generated per load — keeps it offline, fast, and reviewable). ~6–10 `{ title, subtitle }` pairs in the copy set.
