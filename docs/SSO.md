# SSO go-live runbook (Google & GitHub)

> Register the two OAuth apps, drop their client IDs into the **operator config**, export
> the secrets, and sign in — locally and hosted. This is the operator-facing runbook for
> [Phase 70](../todo/phase-70-google-github-sso.md) (the SSO flow) + [Phase 72](../todo/phase-72-sso-go-live-operator-config.md)
> (turning it on). midnite's SSO is **self-hosted** — no Firebase; it issues midnite's own
> JWTs over an encrypted one-time code.

## How it fits together

- **Operator config** — all auth wiring (client IDs, redirect URIs, JWT, allowlist) lives in
  a private, gitignored **`.midnite/operator.json`** (override the path with
  `$MIDNITE_OPERATOR_CONFIG`). It is deep-merged into `gateway.auth`. It is **never** in the
  committed, user-facing `midnite.json` — putting any `gateway.auth` key there **fails the
  boot** with a keyed remedy. Sample: [`.midnite/operator.example.json`](../.midnite/operator.example.json).
- **Secrets** — the operator file holds only env-var **names** (`clientSecretEnv`), never a
  raw secret. Export the real values (or put them in a gitignored `.env`). Sample:
  [`.env.example`](../.env.example).
- **JWT requirement** — SSO issues the same JWTs `POST /auth/login` does, so `MIDNITE_JWT_SECRET`
  must be set. If it isn't, sign-in returns **503** and `midnite doctor` **warns**.
- **State encryption** — the OAuth `state` is GCM-encrypted with `MIDNITE_SECRET_KEY`
  (64 hex chars / 32 bytes).

## Prerequisites

Export these before booting the gateway (or put them in `.env`):

| Var | What | Required |
|-----|------|----------|
| `MIDNITE_JWT_SECRET` | Signs midnite's JWTs; SSO needs it | Yes (else 503) |
| `MIDNITE_SECRET_KEY` | 32-byte hex key (`openssl rand -hex 32`) encrypting the OAuth state | Yes |
| `MIDNITE_GOOGLE_CLIENT_SECRET` | Google OAuth client secret (name is referenced by `clientSecretEnv`) | If Google enabled |
| `MIDNITE_GITHUB_CLIENT_SECRET` | GitHub OAuth client secret | If GitHub enabled |
| `MIDNITE_OPERATOR_CONFIG` | Override the operator-config path (default `.midnite/operator.json`) | Optional |
| `MIDNITE_WEB_TARGET` | `static` (default, desktop/Pages) or `server` (hosted, runs the BFF auth routes) | Hosted only |
| `NEXT_PUBLIC_GATEWAY_URL` | Gateway origin the web app calls for the code exchange | Hosted only |

## Redirect URIs — the exact strings to register

The callback URL you paste into the provider console **must equal** the `redirectUri` in the
operator config, character-for-character. A mismatch is the classic silent failure: the
authorize step succeeds, then the token exchange fails.

| Environment | Redirect URI (per provider) |
|-------------|------------------------------|
| Local | `http://localhost:7777/auth/sso/<provider>/callback` (`7777` = gateway default port) |
| Hosted | `https://<gateway-host>/auth/sso/<provider>/callback` |

`<provider>` is `google` or `github`. GitHub allows **one callback URL per OAuth app**, so use
**two separate GitHub apps** (dev + prod). Google accepts multiple redirect URIs on one client.

## 1 · Register a Google OAuth client

1. [Google Cloud console](https://console.cloud.google.com/apis/credentials) → *APIs & Services
   → Credentials → Create credentials → OAuth client ID → Web application*.
2. Configure the **OAuth consent screen** (scopes `openid email profile`).
3. Add the **Authorized redirect URI** for your environment (see the table above).
4. Copy the **Client ID** + **Client secret**; export the secret as `MIDNITE_GOOGLE_CLIENT_SECRET`.

## 2 · Register the GitHub OAuth app(s)

1. GitHub → *Settings → Developer settings → OAuth Apps → New OAuth App* (scopes
   `read:user user:email`).
2. Set the **Authorization callback URL** for your environment. One callback per app ⇒ create a
   **dev** app and a **prod** app.
3. Copy the **Client ID**, generate a **Client secret**; export it as `MIDNITE_GITHUB_CLIENT_SECRET`.

## 3 · Fill in the operator config

Copy the sample and edit it (never commit real IDs/secrets — the file is gitignored):

```bash
cp .midnite/operator.example.json .midnite/operator.json
```

```jsonc
{
  "gateway": {
    "auth": {
      "jwt": { "secretEnv": "MIDNITE_JWT_SECRET" },
      "sso": {
        "webBaseUrl": "http://localhost:3000",
        "google": {
          "clientId": "1234567890-abc.apps.googleusercontent.com",
          "clientSecretEnv": "MIDNITE_GOOGLE_CLIENT_SECRET",
          "scopes": ["openid", "email", "profile"],
          "redirectUri": "http://localhost:7777/auth/sso/google/callback"
        },
        "github": {
          "clientId": "Iv1.0123456789abcdef",
          "clientSecretEnv": "MIDNITE_GITHUB_CLIENT_SECRET",
          "scopes": ["read:user", "user:email"],
          "redirectUri": "http://localhost:7777/auth/sso/github/callback"
        }
      },
      "allowlist": ["you@example.com"]
    }
  }
}
```

Only the providers you list appear as sign-in buttons. The `allowlist` gates who may
provision on first login; drop it (or add emails) to open/limit sign-up.

## 4 · Run it locally

```bash
export MIDNITE_JWT_SECRET=$(openssl rand -hex 32)
export MIDNITE_SECRET_KEY=$(openssl rand -hex 32)
export MIDNITE_GOOGLE_CLIENT_SECRET=…
export MIDNITE_GITHUB_CLIENT_SECRET=…

moon run gateway:dev      # gateway on :7777
moon run web:dev          # web on :3000
```

Verify:

- `midnite doctor` shows an **SSO readiness** section: `sso:google` / `sso:github` = `ok`.
- `GET /auth/sso/providers` returns `["google","github"]`.
- The login page renders both buttons; a full Google **and** GitHub sign-in completes
  (the `__midnite_rt` cookie is set, `GET /auth/me` shows the linked identity).

## 5 · Run it hosted

The web app defaults to a **static export** (for desktop + GitHub Pages), which **drops** the
`/api/auth/*` BFF cookie routes. For a hosted sign-in, build the **server** target:

```bash
MIDNITE_WEB_TARGET=server NEXT_PUBLIC_GATEWAY_URL=https://<gateway-host> moon run web:build-server
```

Notes:

- Serve both the gateway and web over **HTTPS** — the `__midnite_rt` refresh cookie is
  `Secure` + `httpOnly` + `SameSite`, so a plain-HTTP origin won't retain the session.
- Register the **hosted** redirect URIs (`https://<gateway-host>/auth/sso/<provider>/callback`)
  and set `webBaseUrl` to the browser origin.
- The default `static` build is unchanged (desktop parity) — it simply has no auth routes.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Sign-in returns **503** | JWT disabled | Set `MIDNITE_JWT_SECRET`; `doctor` warns until you do |
| `provider_unavailable` / provider missing from `/auth/sso/providers` | `clientSecretEnv` unset | Export the client secret; `doctor` shows `sso:<provider> = fail` |
| `redirect_uri_mismatch` (Google) / callback error (GitHub) | Registered URI ≠ config `redirectUri` | Make them identical, incl. scheme, host, port, path |
| Signed in but bounced back to login (hosted) | Cookie dropped over HTTP | Serve over HTTPS; check `SameSite`/origin |
| `OperatorAuthInUserConfigError` at boot | `gateway.auth` leaked into `midnite.json` | Move the whole subtree to `.midnite/operator.json` |
| First login rejected | Email not on `allowlist` | Add the email, or remove the allowlist to open sign-up |

Run `midnite doctor` after any change — its **SSO readiness** section reports each provider's
state (`ok` / `warn` / `fail`) with the exact remedy.
