# Operator console (`@midnite/admin`)

The **operator console** is a standalone, cross-tenant admin app for platform
operators — a separate Next.js App Router application (`packages/admin`) that talks
to the gateway over HTTP, exactly like `web` does (it never imports gateway
internals). It surfaces platform-wide reads that the per-user `web` app deliberately
doesn't: every user and team, aggregate usage and cost, the full audit log, the
cross-tenant project registry, and the running/published build versions.

It mounts the shared app frame from `@midnite/shell` (`<AppFrame>`, `<LockScreen>`,
the appearance runtime) — the same shell `web` uses — with a **fixed** seven-item
rail: Overview, Usage, Users & teams, Projects, Versions, Audit, and Links.

## Who can reach it — the operator allowlist

Access is gated **server-side** by the gateway, not the app. The admin app is a
thin client: on load it probes the operator-gated `GET /admin/overview` and shows
one of three states — the SSO login (signed out), a "not an operator" screen
(signed in, but not allowlisted → the probe 403s), or the console (allowlisted).
The real gate is the gateway's `@RequiresOperator` decorator + `OperatorGuard`.

An operator is any email in **`gateway.auth.operators`**. Like the login allowlist,
this is deploy-time operator policy, so it lives in the **gitignored**
`.midnite/operator.json` (see `OperatorConfigSchema` / `loadOperatorConfig` in
`packages/shared/src/config-loader.ts`), which is deep-merged into `gateway.auth`.
The check is `isOperatorEmail(config, email)` (case-insensitive) — see
`packages/shared/src/config.ts`.

```jsonc
// .midnite/operator.json  (gitignored — never commit real values)
{
  "gateway": {
    "auth": {
      "operators": ["ada@example.com", "grace@example.com"]
    }
  }
}
```

> **Fail-closed.** An empty (or absent) `operators` list means **nobody** is an
> operator — the console is unreachable for everyone until an email is added. A
> single-user or static-token install is never implicitly an operator.
>
> The operator gate only gates the three cross-tenant `GET /admin/*` reads
> (`overview`, `users`, `teams`). The team-scoped surfaces the console also reads —
> `/usage`, `/metrics`, `/audit`, `/teams` — are **not** operator-gated and stay
> reachable by ordinary users (a boundary test in the gateway pins this).

## Running it locally

```bash
moon run admin:dev          # Next.js dev server on http://localhost:3100
```

The console needs a running gateway to talk to. Two env vars wire the two origins:

- **`NEXT_PUBLIC_GATEWAY_URL`** (admin) — the gateway origin the app calls.
  Defaults to `http://localhost:7777`.
- **`MIDNITE_ADMIN_ORIGIN`** (gateway) — adds the admin origin to the gateway's
  CORS allowlist so the browser's cross-origin calls (and the SSO refresh cookie)
  are accepted. Set it to the admin dev origin, e.g.:

```bash
# gateway shell
MIDNITE_ADMIN_ORIGIN=http://localhost:3100 moon run gateway:dev
```

Because admin is a static export on its own origin, it restores the session by
reading `GET /auth/me` directly against the gateway with `credentials: 'include'`
(the SSO refresh cookie rides along). SSO must therefore be configured on the
gateway for a real login — see [`SSO.md`](./SSO.md).

## Hosting it

`admin` is a **static export** (`next build` → `output: 'export'`, emitted to
`packages/admin/out/`). Serve that directory from any static host. Bake the gateway
origin in at build time via `NEXT_PUBLIC_GATEWAY_URL`, and make sure the gateway's
`MIDNITE_ADMIN_ORIGIN` includes the deployed admin origin so CORS + the refresh
cookie work in production.

```bash
NEXT_PUBLIC_GATEWAY_URL=https://gateway.example.com moon run admin:build
# → packages/admin/out/  (upload to your static host)
```

## Surfaces

| Surface | Reads | Notes |
| --- | --- | --- |
| Overview | `GET /admin/overview`, `/usage/summary`, `/audit` | Platform KPIs + recent activity |
| Usage | `/usage/summary`, `/usage/attribution`, `/metrics/ops`, `/metrics/cycle-time` | LLM spend, cost attribution, throughput |
| Users & teams | `GET /admin/users`, `GET /admin/teams`, `/teams…` | Cross-tenant lists + team management |
| Projects | `GET /projects`, `GET /projects/:id` | Read-only registry + per-project drill-in |
| Versions | Public `version.json` / `version.beta.json` (GitHub-raw mirror) + bundled `CHANGELOG.md` | **View-only** — see below |
| Audit | `GET /audit` | Filterable, paginated action log |
| Links | — | Launcher: docs, GitHub, the web app, in-app deep links |

> **Versions is view-only.** It reports this console's running build
> (`NEXT_PUBLIC_APP_VERSION`, baked at build) and the live stable/beta channel
> versions (read from the public GitHub-raw mirror of `version.json`) plus the
> bundled changelog. It performs **no** release actions — cutting a release is the
> `/release-prep` → `/release-complete` flow (see [`RELEASING.md`](./RELEASING.md)).
