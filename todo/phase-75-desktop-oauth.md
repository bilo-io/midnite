# Phase 75 — Desktop OAuth (GitHub + Google SSO for the Electron app)

> **Implementation in flight in a parallel session** (Pattern A). This doc is the plan of record; keep it in sync as themes land.

> Phase 70 built the full gateway SSO flow (start → provider → callback → one-time code → exchange → JWTs) and Phase 72 turned it on for **local dev** and a **hosted server-target web app**. What's still missing is the **desktop (Electron)** path: a user running the packaged app cannot complete GitHub/Google OAuth. This phase adds the native-app OAuth flow — **Pattern A: loopback into the desktop's own local gateway**, with the one-time code handed back to the renderer over the WebSocket it is already connected to. No hosted gateway is required; the desktop's local gateway remains the authority that provisions the user and mints the session.

> **Why desktop is different (three hard facts).** (1) The desktop **spawns its own local Nest gateway as a child process on a *random* free loopback port** each launch (`findFreePort` → `http://127.0.0.1:<random>`), but OAuth providers require a **pre-registered, stable** `redirect_uri`. (2) OAuth **must run in the system browser** (providers block embedded webviews), so the session is minted where the *browser* is and must be bridged back into *Electron* — and **no bridge exists today** (no `midnite://` scheme, no `open-url`/argv handling, no loopback OAuth receiver). (3) **GitHub OAuth Apps require a client secret and don't support PKCE**, so the local gateway must hold the secret to do the code→token exchange (secret ships in the binary — an accepted tradeoff for a self-hosted / single-user tool; see Decisions).

---

## Current state (what exists to build on)

- **Desktop runs a local gateway child process.** `packages/desktop/src/main/index.ts:36-44` picks a free port (`findFreePort`) and spawns the Nest gateway via `startGatewayProcess` (`gateway-process.ts:37-49`, `ELECTRON_RUN_AS_NODE=1`, port passed as `MIDNITE_GATEWAY_PORT`). The renderer origin is injected preload-side as `window.__NEXT_PUBLIC_GATEWAY_URL` (`preload/index.ts:17-26`, read by `web/lib/api.ts:353-363` `gatewayUrl()`). The renderer is served from a second loopback static server (`static-server.ts:29-34`) — the Next **static export**.
- **Full gateway SSO flow already built** (`packages/gateway/src/auth/sso.controller.ts` + `sso.service.ts`): `GET /auth/sso/providers`, `GET /auth/sso/:provider/start` (302 → provider), `GET /auth/sso/:provider/callback` (resolve identity → find-or-create user → mint single-use `exchangeCode` → 302 browser to `${webBase}/auth/sso/callback?code=…`), `POST /auth/sso/exchange` (consume code → issue `AuthResponse` JWTs). **Never puts tokens in a URL** — only a one-time code.
- **The pivotal redirect_uri logic — `callbackUri` (`sso.service.ts:317-321`)** — uses a pinned `gateway.auth.sso[provider].redirectUri` if set, else derives `${requestOrigin}/auth/sso/<provider>/callback`. The **same value** is used in the authorize URL **and** the token exchange (`resolveGoogle:213`, `resolveGithub:260`), so they always match. Random-port derivation is exactly what breaks desktop.
- **Config schema** (`packages/shared/src/config.ts`): `SsoProviderConfigSchema` (`clientId`, `clientSecretEnv`, `scopes`, optional pinned `redirectUri`) under `gateway.auth.sso.{google,github}` + `webBaseUrl` (config.ts:198-219). Helper `enabledSsoProviders` (config.ts:663-668).
- **Desktop uses in-memory access tokens, not the `__midnite_rt` cookie.** So the web BFF `/api/auth/sso/callback` POST route (`web/app/api/auth/sso/callback/route.ts`, server-only — stripped from static export) is **not needed** in desktop; the callback page can call `POST /auth/sso/exchange` directly.
- **No desktop-side callback receiver exists** — no custom URI scheme, no `setAsDefaultProtocolClient`, no `open-url` handler, no argv parsing, no loopback OAuth listener. The `second-instance` handler only focuses the window.
- **`<SsoButtons>`** (`web/components/auth/sso-buttons.tsx`) renders anchors to `ssoStartUrl()` (`web/lib/api.ts:2660-2663`) as a **full-page nav** — no desktop branch anywhere.

### ⚠️ Known issue being worked now (parallel session)
- **GitHub callback returns 500.** The GitHub authorize screen **does** render ("Authorize {user}"), so `clientId` + the `/start` authorize URL are correct. The failure is on the **gateway callback** — most likely one of: (a) `redirect_uri` sent at the authorize step ≠ the one at the token-exchange step (the derived random-port origin vs. a pinned value), (b) `clientSecretEnv` not resolving (secret env var unset), or (c) the callback origin not matching the registered redirect URI. This phase's Theme A + D resolve the class of bug; see Verification.

---

## Theme A — Fixed, registrable loopback redirect — **S**

Make the desktop gateway's callback URL stable and pre-registrable.

- [ ] **Pin the desktop gateway to a fixed loopback port** (with a small fallback ladder, e.g. `53680..53689`, to survive port conflicts) so `http://127.0.0.1:<fixedPort>/auth/sso/<provider>/callback` is a constant. Fall back gracefully and log the chosen port; the renderer already reads the injected origin.
- [ ] **Pin `redirectUri`** for desktop — set `gateway.auth.sso.{github,google}.redirectUri = http://127.0.0.1:<fixedPort>/auth/sso/<provider>/callback` so `callbackUri()` returns the same registered value at both the authorize and token-exchange steps (kills the class of 500 caused by a redirect_uri mismatch).
- [ ] Register that exact URL in the **localhost** GitHub OAuth app and a Google **"Desktop app"** OAuth client (loopback-friendly).

## Theme B — System-browser start — **S–M**

- [ ] **Desktop branch in the SSO start**: open the `/start` URL in the **system browser** via `shell.openExternal` (never an in-app webview — providers block embedded webviews). Expose a preload bridge (e.g. `window.midnite.auth.startSso(provider, redirect)`); `<SsoButtons>` uses it when running in desktop, keeps the anchor nav on web.

## Theme C — Callback → renderer handback over WebSocket — **M**

- [ ] **New shared WS event** `sso.complete` (`packages/shared/src/events/`) carrying the one-time `exchangeCode` + `redirect` (discriminated `type`, zod schema).
- [ ] On `GET /auth/sso/:provider/callback`, after minting the `exchangeCode`, the local gateway **pushes `sso.complete`** to the connected renderer (the desktop renderer is already WS-connected to its local gateway), then 302s the **browser** to a small **"✓ signed in — return to midnite"** success page.
- [ ] Renderer handles `sso.complete` → `POST /auth/sso/exchange` → stores the returned JWTs **in memory** (identical to the password-login path). No cookie, no BFF.

## Theme D — Desktop callback page fix (resolve the 500 path) — **S–M**

- [ ] The static-export callback page (`web/app/auth/sso/callback/page.tsx`) currently **unconditionally POSTs to `/api/auth/sso/callback`** — a route that does not exist in the desktop bundle. Detect desktop and **do not** hit the missing BFF route; the WS handback (Theme C) completes the session, so the page only needs to render the success/return state (or, as a fallback, call `/auth/sso/exchange` directly).
- [ ] Confirm this eliminates the **500 on callback** once `redirectUri` is pinned (Theme A) and the secret resolves (Theme E).

## Theme E — Config, secret & DX — **S**

- [ ] **Operator-config sample** for desktop SSO in `.midnite/operator.example.json` — `clientId`, `clientSecretEnv`, pinned `redirectUri` per provider, `webBaseUrl` (desktop loopback web origin).
- [ ] **Secret handling** — document that Pattern A embeds/ships the OAuth client secret with the desktop app (extractable; accepted for self-hosted/single-user — see Decisions). Ensure `clientSecretEnv` resolution fails **loudly** (clear error, not a 500) when unset.
- [ ] **`midnite doctor`** — a desktop-SSO readiness check (pinned redirectUri present, secret env resolvable, port reachable).

## Theme F — Docs — **S**

- [ ] **`docs/SSO.md` desktop section** — register the loopback redirect URIs (localhost GitHub app + Google "Desktop app" client type), the fixed-port scheme, the secret tradeoff, and the end-to-end desktop flow diagram. Note this is separate from the local-dev (`:7777`) and hosted (`server` target) runbooks already documented.

## Theme G — Tests — **M**

- [ ] **Gateway** — callback/exchange specs for the loopback path: pinned `redirectUri` used identically at authorize + token exchange; `sso.complete` emitted on callback; `clientSecretEnv` unset → clean 4xx/503, not 500.
- [ ] **Desktop main** — unit tests for fixed-port selection + fallback ladder and the `shell.openExternal` start bridge.
- [ ] **Handback** — a smoke/e2e of `callback → sso.complete → exchange → in-memory session` against a mocked provider.

---

## Future / alternative (out of scope unless distributing widely)

- **Theme H (alt) — Pattern B: hosted exchange broker on Vercel serverless.** A **stateless** `code→token` exchange endpoint holds the GitHub/Google client secret server-side (never in the binary) — the **one** piece of this system that legitimately fits Vercel serverless (no SQLite, no WS, no pty). Browser → broker (registered https `redirect_uri`, uses the **hosted-URL** GitHub app) → broker exchanges with the secret → hands a one-time code back to the desktop via loopback or a `midnite://` deep link → the local gateway consumes it and mints the local session. Adopt this if secret-in-binary becomes unacceptable for wide distribution. Requires the desktop callback receiver from Themes A–D regardless.

---

## Decisions

1. **Pattern A (loopback into the local gateway), not a hosted gateway** → **Resolved (user).** Each desktop install has its own local gateway + user DB, so the local gateway must mint the session; loopback is the standard native-app pattern (gh, gcloud, VS Code). No hosted gateway needed.
2. **Handback mechanism: WebSocket push** (renderer is already WS-connected to its local gateway), not a `midnite://` deep link → **Recommended** (simpler, no OS scheme registration; deep link stays available for Pattern B). *(confirm in review)*
3. **Client secret location: embedded in the desktop app** (Pattern A) → **Accepted tradeoff** for a self-hosted / single-user tool — the OAuth secret grants nothing without a per-login user consent. Switch to Pattern B (hosted broker) only for wide distribution.
4. **No web BFF cookie in desktop** → desktop keeps its existing in-memory access-token model; the `__midnite_rt` httpOnly cookie stays web-only.
5. **Fixed loopback port with a fallback ladder** vs. a random port → **fixed** (must be registrable), with a small ladder to survive conflicts. *(confirm the exact port range in review)*
6. **Google client type: "Desktop app"** (loopback-friendly, PKCE) vs. "Web application" → **Desktop app.** GitHub OAuth Apps have no PKCE, so GitHub uses the embedded-secret loopback flow.

---

## Verification

- [ ] A user running the **packaged desktop app** clicks "Sign in with GitHub" → system browser opens → authorizes → browser lands on the "✓ return to midnite" page → the **Electron app is signed in** (session in memory), no manual token copy.
- [ ] Same for **Google** (Desktop-app client, loopback).
- [ ] The **500 on callback is gone**: `redirectUri` is identical at authorize + token exchange; an unset `clientSecretEnv` produces a clear error, not a 500.
- [ ] Desktop gateway binds the **fixed loopback port** (or a laddered fallback) and the registered redirect URI matches character-for-character.
- [ ] Web + local-dev + hosted-server SSO flows are **unchanged** (no regression to the Phase 70/72 paths).
- [ ] `moon run :typecheck && :lint && :test` green; desktop + gateway + web build.
