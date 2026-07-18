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

## Theme A — Shared contract: login-provider enum + SSO schemas — **S** — ✅ DONE (PR #447, 2026-07-18)

The contract lands first so gateway and web agree on shapes. Everything new goes in `shared`, per the Golden Rule. **Decisions (`/exec` Stage 2.5):** rich `identities` array · one-time-code exchange · `enabledProviders` in the contract · schemas in `user.ts` · URL-builder client methods · same-origin relative `redirect` (open-redirect guard in the contract).

- [x] `LoginProviderSchema = z.enum(['google', 'github'])` + `LoginProvider` type in [`shared/src/user.ts`](../packages/shared/src/user.ts) — **distinct** from the credential-vault `OAuthProviderSchema` (`google | slack`) so the two provider sets stay independent.
- [x] `SsoStartParamsSchema` (`{ redirect?: SsoRedirectPathSchema }` — same-origin relative path, open-redirect guard in the contract) + `SsoExchangeRequestSchema` (`{ code }`, one-time-code handoff Decision §3) + `SsoProvidersResponseSchema` (`{ providers }` = enabledProviders); exchange reuses `AuthResponseSchema`.
- [x] Extended `UserSchema` with an **optional** `identities?: { provider, email }[]` (`SsoIdentitySchema`) — optional so existing `UserSchema.parse` callers stay valid, and so Settings can show "linked accounts".
- [x] Typed client methods (`cli/src/client.ts`): `ssoStartUrl(provider, redirect?)` (URL builder — SSO start is a browser nav), `exchangeSsoCode(code)`, `ssoProviders()`.
- [x] Unit tests for the new schemas (`user.test.ts` — enum, identity/backward-compat, redirect guard, exchange, providers, `AuthResponse` reuse).

---

## Theme B — Identity persistence: `user_identities` + nullable password — **M** — ✅ DONE (PR #449, 2026-07-18)

Link an external identity to a user, and let pure-SSO users exist. Consistent with the repo's "one concern per row, no cross-domain FK" convention (see the `user_preferences` sibling table). **Decisions (`/exec` Stage 2.5):** repo under `auth/` (registered by `UsersModule`, no Auth↔Users cycle) · `findOrCreateFromSso` on `UsersService` · extract a shared `provisionUserWithTeam()` · null-hash → typed `PasswordLoginUnavailableError` mapped to 403 · unique `(provider, providerUserId)` + non-unique `userId` idx, email a nullable snapshot · closed-signup + verified-email rules enforced at the persistence layer · two forward-only migrations.

- [x] New `user_identities` table in [`db/schema.ts`](../packages/gateway/src/db/schema.ts): `{ id, userId, provider, providerUserId, email, createdAt }`, **unique index on `(provider, providerUserId)`**, index on `userId`. Forward-only Drizzle migration (`0084`).
- [x] Migration (`0085`) making `users.password_hash` **nullable** (Decision §2 — passwordless SSO users). Guards `validateCredentials` **and** `updatePassword` to **reject** a null-hash user with a distinct `PasswordLoginUnavailableError` ("use Google/GitHub") — `auth.controller` maps login → **403**, not a generic invalid-credentials leak.
- [x] `UserIdentitiesRepository` (Drizzle-only, under `auth/`): `findByProviderIdentity(provider, providerUserId)`, `insertIdentity(...)`, `listForUser(userId)`.
- [x] `UsersService.findOrCreateFromSso(profile, { signupOpen })`: (1) lookup by `(provider, providerUserId)` → existing user; (2) else **auto-link on verified email** (Decision §1) — match an existing `users.email` and insert the identity link; (3) else **provision** (Decision §4) — `provisionUserWithTeam` creates the user (null password) **+ a team** mirroring `POST /auth/register`, gated by the open-signup policy. Records a `user.sso_linked` audit entry on link/provision; `listIdentities()` surfaces linked accounts for Theme D.
- [x] Only trust **provider-verified** emails for auto-link — an unverified email that collides with an existing account is **rejected** (`SsoEmailConflictError`), never silently taking over the account nor duplicating the unique email; a non-colliding unverified email provisions a fresh account. Closed signup → `SsoSignupClosedError`.
- [x] Repository integration tests (real `:memory:` SQLite): unique-constraint on duplicate identity, provider-independence, link-by-email, provision path, null-hash password-login rejection + service-level SSO scenarios.

---

## Theme C — Gateway SSO flow: `SsoService` + `SsoController` — **L** — ✅ DONE (PR #451, 2026-07-18)

The heart of the phase. A dedicated auth-module service that runs the authorization-code dance and issues our JWTs. Reuses `CryptoService` for state; **does not** touch the workflow `OAuthService`. **Decisions (`/exec` Stage 2.5):** Google id_token verified offline via **jose** local JWKS · single-use nonce + one-time code in a `sso_auth_state` **DB table** (TTL) · read Theme E's `gateway.auth.sso` config · exempt `/auth/sso/*` **+ `/auth/{login,register,refresh}`** (closes the same latent JWT-on gap) · native `fetch` mocked in specs · GitHub **primary+verified** email · 302 to `login?sso_error=<code>` on failure · full endpoint set (start/callback/exchange/providers).

- [x] `auth/sso.service.ts`: `buildAuthorizationUrl` + `handleCallback`. State = `crypto.encrypt(JSON.stringify({ provider, nonce, redirect, exp }))`, decrypted + provider-matched + `exp`-checked on callback (mirroring the vault pattern).
- [x] **State hardening (Decision §5):** a **single-use nonce** in the `sso_auth_state` table (~10-min TTL) written at `start`, consumed+deleted (`delete…returning`) at `callback`; replayed/expired/unknown nonces rejected. Table opportunistically pruned on each `start`.
- [x] **Google**: auth `…/o/oauth2/v2/auth` (scope `openid email profile`, `access_type=offline`); token `oauth2.googleapis.com/token`; **`id_token` verified via jose** against Google's JWKS (signature + `aud` + `iss`), `email_verified` gate → `sub`/`email`/`name`.
- [x] **GitHub**: auth `github.com/login/oauth/authorize` (scope `read:user user:email`); token exchange with `Accept: application/json`; `GET /user` + `GET /user/emails` → `id` → `providerUserId`, **primary+verified** email, name.
- [x] `auth/sso.controller.ts` (thin, `@Controller('auth/sso')`): `providers`, `:provider/start` (302 → consent, `LoginProviderSchema`-validated), `:provider/callback` → `handleCallback` → `findOrCreateFromSso` → one-time **code** 302'd to the web app (Decision §3, no tokens-in-URL), `POST /exchange` (code → `jwtSvc.issue{Access,Refresh}Token` → `AuthResponse`). Provider `error=` + all failures → safe `sso_error` redirect.
- [x] **JWT-disabled guardrail:** `!jwtSvc.enabled` → clean 503 on start/callback/exchange; `providers` returns `[]`.
- [x] Wired into `AuthModule`; `isAuthExemptPath` now covers `/auth/sso/*` **and** `/auth/{login,register,refresh}` so pre-auth credential routes are reachable when JWT auth is on.
- [x] Specs: service (state round-trip, nonce single-use + replay, **real jose id_token verification**, GitHub primary+verified, unverified-collision) + controller (unknown provider 400, `error` redirect, JWT-disabled 503, happy-path) + `sso_auth_state` repo + auth-policy exemptions.

---

## Theme D — Web sign-in UI + callback handoff — **M** — ✅ DONE (PR #452, 2026-07-18)

"Continue with Google / GitHub" where users already sign in, completing the token handoff without leaking tokens into browser history. **Decisions (`/exec` Stage 2.5):** direct gateway link via `gatewayUrl()` (matches `getOAuthStartUrl`) · providers fetched from `GET /auth/sso/providers` · **no** auth-context change (existing refresh-on-mount restores the SSO session from the cookie) · SSO helpers in `web/lib/api.ts` · shared `<SsoButtons>` · GET callback route handler exchanging server-side · read-only linked-accounts in Settings · login maps `sso_error` codes.

- [x] **Provider buttons** — [`components/auth/sso-buttons.tsx`](../packages/web/components/auth/sso-buttons.tsx): fetches configured providers (`fetchSsoProviders` → `GET /auth/sso/providers`) and renders a direct-nav anchor per provider (`ssoStartUrl`, like `getOAuthStartUrl`); renders nothing when SSO isn't configured. Wired into [`login`](../packages/web/app/(auth)/login/page.tsx) + [`register`](../packages/web/app/(auth)/register/page.tsx) above the email form with an "or" divider.
- [x] **Web callback route** [`app/auth/sso/callback/route.ts`](../packages/web/app/auth/sso/callback/route.ts) (matches Theme C's 302 target `/auth/sso/callback`): GET handler re-validates the same-origin `redirect` (`SsoRedirectPathSchema`), exchanges the one-time code server-side (`POST /auth/sso/exchange`), sets `__midnite_rt` httpOnly **exactly like** the login route (secure in prod, `sameSite: lax`, 7-day), 303s to the validated path. No token in a URL.
- [x] **No `auth-context.tsx` change needed** — SSO converges on the existing mount-time `POST /api/auth/refresh` (cookie → access token + user + teams), identical to a returning user. Open-redirect guard lives in the callback route (Decision).
- [x] **Linked-accounts** (minimal) in Settings → profile: read-only list of `user.identities` from `GET /auth/me` (enriched with identities; login/refresh stay lean). Unlink UI out of scope.
- [x] Tests: RTL for the button row (gating on configured providers + hrefs), a `play` story (mocked providers), a route-handler test (cookie-set + open-redirect rejection + error paths), and `ssoStartUrl`/`ssoErrorMessage` units.

---

## Theme E — Config, secrets & docs — **S** — ✅ DONE (PR #450, 2026-07-18)

Where the client IDs/secrets live, and how an operator turns SSO on. Lands in parallel with A. **Decisions (`/exec` Stage 2.5):** per-provider `redirectUri` + shared `webBaseUrl` · extend `OAuthClientConfigSchema` (keep `scopes`) · hard fail-closed boot check · warn on SSO-without-JWT · ship `enabledSsoProviders` now · full setup walkthrough.

- [x] New `gateway.auth.sso` block in [`shared/src/config.ts`](../packages/shared/src/config.ts): `SsoProviderConfigSchema = OAuthClientConfigSchema.extend({ redirectUri? })` per `{ google?, github? }` + a shared `webBaseUrl`, **reusing `OAuthClientConfigSchema`** (`clientId` + `clientSecretEnv` env-name-only + `scopes`). `OAuthClientConfigSchema` moved above the auth schema so SSO can reuse it. Plus a pure `enabledSsoProviders(config)` helper for Themes C/D.
- [x] Default config object updated; SSO **absent by default** (`sso` is `.optional()` — a deployment with no `sso` block simply shows no provider buttons, behaviour-preserving).
- [x] Boot validation: `health.service` `checkSso` (in `bootChecks`) — an `sso.<provider>` present but its `clientSecretEnv` unset is **fail-closed**; secrets present but JWT off **warns**; mirrors the `secret-key` check.
- [x] Docs: README `gateway.auth.sso` bullet + a full "Setting up Google / GitHub SSO" walkthrough — register a Google OAuth client + a GitHub OAuth app, which redirect URI to whitelist, which env vars to set, and the note that SSO requires `MIDNITE_JWT_SECRET` + `MIDNITE_SECRET_KEY`.
- [x] Config-schema unit test (`config.test.ts`: parse with/without the `sso` block, non-URL rejection, `enabledSsoProviders` ordering) + boot-check spec (`health.service.spec.ts`).

---

## Theme F — Login hero: split-screen + living knowledge-graph starfield — **L** — ✅ DONE (PR #448, 2026-07-18)

Turn the bare auth pages into a hero: a **left third** carrying the form (email/password + the Theme D provider buttons) and a **right two-thirds** with animated typewriter copy over a galaxy-like starfield that periodically lights up constellations as knowledge-graph edges — a visual echo of what midnite *is* (a live graph of tasks/agents/repos). Builds on the existing canvas + typewriter + motion primitives; no gateway, pure `packages/web` (plus maybe one `@midnite/ui` extraction). **Decisions (`/exec` Stage 2.5):** hero on all three auth routes · bare forms (no `Card`) · always-dark hero wash · logo+wordmark above copy · 2–3 overlapping constellations · single-core star distribution · static-frame reduced-motion fallback · copy inline in `auth-hero`.

- [x] **Split layout** on [`app/(auth)/layout.tsx`](../packages/web/app/(auth)/layout.tsx) (shared by login/register/invite): left `1/3` form column, right `2/3` hero. Responsive — the hero collapses **below `lg`** (mobile/tablet show the form full-width, per [`lib/breakpoints.ts`](../packages/web/lib/breakpoints.ts) / `useIsDesktop`), so the canvas never ships to small screens. Gated on `useIsDesktop()` so the canvas + RAF never mount `< lg`. Login/register forms go bare (no `Card`); invite keeps its self-contained action panel.
- [x] **Typewriter title + subtitle** in the hero via the existing [`lib/use-typewriter.ts`](../packages/web/lib/use-typewriter.ts): a **login-specific** randomised copy set (`AUTH_HERO_COPY`, a curated array of `{ title, subtitle }` pairs picked once per mount) — distinct from the dashboard/quote copy. Respects reduced-motion (renders the final string immediately when motion is off).
- [x] **Galaxy starfield background** — new `components/auth/constellation-background.tsx` (standalone, Decision §9): stars scattered on a **galaxy-like radial density falloff** around one off-centre core (not the `dots` grid), with **per-star twinkle**. Node/edge colours read live from `--node-*` tokens so it re-tints on theme/accent switch, following `dynamic-background.tsx` conventions (DPR cap, tab-hidden pause, cleanup).
- [x] **Constellation lighting = dynamic knowledge graph:** 2–3 overlapping constellations pick a random cluster of nearby stars, **light them** and draw the **connection-graph edges** (fading in/out over ~1–2s), then respawn elsewhere. Edge/node colours reuse the `--node-trigger`/`--node-action`/`--node-logic`/`--node-data` tokens so it literally renders midnite's node palette.
- [x] **Motion & a11y gating:** the animation runs only when motion is allowed — reuses [`lib/use-animation-prefs.ts`](../packages/web/lib/use-animation-prefs.ts); reduced-motion falls back to a **static** star field + a few pre-lit constellations (no twinkle, no cycling), repainted on resize/theme. RAF cleaned up on unmount; paused when the tab is hidden.
- [x] Tests/stories: RTL test that the hero is desktop-only (not rendered `< lg`) + form always present; `play` stories for the split layout (Default/ReducedMotion/SplitScreen); assert the typewriter copy is login-specific + reduced-motion short-circuits. Canvas motion proven via a Storybook shot.

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
- [x] **Login hero (F):** on desktop (`≥ lg`) the split screen renders (form left third, starfield hero right two-thirds with typewriter title/subtitle); below `lg` the hero is gone and the form is full-width. Reduced-motion (Motion setting or OS) shows a static star field — no twinkle, no constellation cycling — and the typewriter copy resolves immediately. The form is fully usable while/if the canvas doesn't animate; the RAF loop stops on unmount + tab-hidden. (PR #448)

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
