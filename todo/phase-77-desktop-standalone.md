# Phase 77 — Desktop standalone: shared `~/.midnite`, direct-to-gateway auth, bundled CLI

> **Problem.** A downloaded desktop app didn't behave like a self-contained install. It
> bundles + auto-launches its own gateway (that part worked), but (1) the embedded
> gateway booted on **schema defaults** — no `midnite.json`, no operator/SSO config, no
> secrets, a fresh app-private DB — so it had none of the user's real setup; (2) the web
> is a **static export** with no Next server, so the `/api/auth/*` **BFF** route handlers
> that login/refresh/SSO depend on **don't exist**, leaving the app stuck pre-auth ("UI
> loads but no data" — it only worked when the user's own localhost gateway was up); and
> (3) there was **no bundled CLI**. This phase makes the app a complete, self-contained
> midnite: one gateway, one CLI, one shared config/data home per machine.

> **Boundary with [Phase 75](phase-75-desktop-oauth.md).** Phase 75 owns the desktop
> **OAuth start** (fixed loopback port, system-browser flow, WS code handback — providers
> block embedded webviews). This phase is additive and composes with it: it does **not**
> touch the OAuth start/callback bridging. The direct-to-gateway `POST /auth/sso/exchange`
> here is exactly the final step Phase 75 expects the callback page to call.

---

## Current state this builds on

- Desktop spawns the gateway child on a **dynamic** free port, injects
  `window.__NEXT_PUBLIC_GATEWAY_URL` (verified working), waits on `/health`, then loads
  the Next static export from a second loopback static server.
- Gateway config: `MIDNITE_CONFIG_PATH` (user config) + `MIDNITE_OPERATOR_CONFIG` (SSO/JWT,
  fail-closed) + env-var secrets; the web's `/api/auth/*` BFF only runs in the hosted
  `server` target (`web/lib/web-target.mjs`).

## Theme A — Shared `~/.midnite` home (config + data + secrets) — **M** ✅

- [x] `resolvePaths()` → shared machine-wide home `~/.midnite` for db + uploads (with a
      one-time migration of the legacy app-private DB), and discovery of `midnite.json` /
      `operator.json` / `.env` when present.
- [x] `startGatewayProcess()` folds the shared config/operator paths + a parsed
      `~/.midnite/.env` (JWT signing secret, SSO client secrets) into the gateway child
      env, so a configured machine boots the embedded gateway with the user's real config
      + SSO wiring (fresh machine → schema defaults, auth off, local mode).
- [x] `parseEnvFile` unit-tested.

## Theme B — Direct-to-gateway auth transport (static export has no BFF) — **M** ✅

- [x] `web/lib/auth-transport.ts`: one interface, two modes. Hosted → the `/api/auth/*`
      BFF (cookie). Desktop (detected by the injected gateway URL) → the gateway's
      `/auth/*` directly, refresh token in `localStorage`. Covers refresh / login /
      register / logout / SSO exchange. `refreshSession` maps the gateway's status codes
      (200 logged-in / 401 auth-on-not-logged-in / 400 JWT-disabled→local) — the
      `enabled` check runs before body validation, so a non-empty placeholder token
      disambiguates disabled vs not-logged-in.
- [x] `auth-context.tsx` + the SSO callback page use the transport. Unit-tested.

## Theme C — Bundled `midnite` CLI — **M** ✅

- [x] `stage-gateway.mjs` **esbuild-bundles** `@midnite/cli` into a single ~3MB file
      (vs. ~220MB if `pnpm deploy` dragged the gateway closure in twice). `serve`'s lazy
      `import('@midnite/gateway/bootstrap')` is kept external (redundant — the app IS the
      gateway); ink's optional `react-devtools-core` is aliased to a no-op stub; the CLI
      version is injected via esbuild `define` (a single-file bundle can't read
      `../../package.json`). No electron-rebuild needed (nothing native on the hot path).
- [x] `electron-builder.yml` ships `cli/dist/index.mjs` + `package.json` + a `bin/midnite`
      shim (runs the CLI under the app's Electron-as-Node). `install-local` builds the CLI
      first (`cli:build`) and symlinks the shim to `/usr/local/bin`.
- [x] Desktop writes `~/.midnite/gateway.json` on boot; the CLI's `resolveBaseUrl` reads
      it (after flag/env), so `midnite list` reaches the running app on its dynamic port
      with no flags. Unit-tested.

---

## Verification

- [ ] Fresh machine (no `~/.midnite`): app launches, gateway auto-starts, board loads
      standalone (local mode, no login), data in `~/.midnite`.
- [ ] Configured machine (`~/.midnite/operator.json` + `.env` with SSO): `/auth/sso/providers`
      returns the configured providers; password login works direct-to-gateway.
- [ ] `midnite list` (via the bundled shim) reaches the running app with no flags.
- [ ] `moon run desktop:test cli:test web:test shared:test` green; typecheck green.

## Decisions

1. **Shared home = `~/.midnite`** (user choice: "one midnite per machine") — config +
   data shared with the CLI, not an app-private sandbox.
2. **Auth = full SSO, direct to gateway** (user choice) — the static export can't run the
   BFF; the transport calls the gateway's `/auth/*` directly.
3. **No single-origin rewrite** — leave the two-loopback-server model + injected URL as
   Phase 75's baseline; don't fork the desktop SSO architecture mid-flight.
