# Phase 60 Theme D — Dependency & supply-chain audit

**Date:** 2026-07-07 · **Scope:** workspace-wide `pnpm audit` + `pnpm outdated`, reachability triage, safe bumps, committed-secret scan (tree + git history), lockfile typosquat + license review.

## Summary

`pnpm audit` reports **58 advisories** (3 critical, 24 high, 23 moderate, 12 low at audit time) — **almost entirely transitive**, and a large share are advisories against **newer major versions than what's installed** (so "fixing" them means a major upgrade/migration, not a patch). One safe, reachable, in-range bump was applied; the rest are triaged below by reachability and logged with upgrade paths. Secret scan + license + typosquat review: **clean**.

| Area | Result |
|------|--------|
| Applied bump | `ws` 8.18.0 → 8.21.0 (HIGH DoS, reachable gateway WS, in-range) — ✅ tests green |
| Reachable-runtime advisories needing a major bump | `drizzle-orm`, the `@nestjs`/`fastify` stack — 📋 documented (follow-up) |
| Desktop (`electron`) advisories | 📋 documented — major-version story, desktop-only |
| Dev/build-only advisories | 📋 documented — not shipped to prod runtime |
| Unreachable advisory (`glob` CLI) | 📋 noted — library API, not the vulnerable `-c` CLI |
| Committed secrets (tree + history) | ✅ none |
| Copyleft/restrictive licenses | ✅ none (GPL/AGPL/SSPL/BUSL) |
| Typosquat-shaped deps | ✅ none (117 distinct direct deps) |

---

## Applied — safe, reachable, in-range

**`ws` 8.18.0 → 8.21.0** (advisory 1120730, HIGH — memory-exhaustion DoS from tiny fragments). The gateway's WebSocket transport uses `ws` directly (`packages/gateway`, range `^8.18.0`); 8.21.0 is in-range, so the bump is a lockfile + range-floor nudge only. Full `moon run :typecheck`/`:lint`/`:test` green (the `ui:test` failure in the combined run is the known leaf flake — passes isolated). A transitive `ws@8.18.0` remains under another dep's pin, but the reachable gateway path is patched.

### Attempted and reverted — broad `pnpm update -r`

A workspace-wide in-range update was attempted (it dropped criticals 3→1) but **reverted**: it regressed `site:typecheck` (a `vitest.config.ts` overload error from churned vite/vitest transitives) and rewrote every `package.json` range + a massive lockfile diff — unreviewable churn for modest gain, and it fails the "tests green" bar. Per the iteration's scoping (safe patch/minor only, tests green), the surgical `ws` bump is the applied change; the rest is documented.

---

## Reachable-runtime advisories — need a major bump (follow-up)

These sit in the **shipped gateway runtime**, but every fix is an out-of-range **major** upgrade (a migration, not a patch), so they're logged rather than applied in this [S] audit:

- **`drizzle-orm` (HIGH — SQL injection via improperly escaped input, advisory 1116251, patched ≥0.45.2).** Highest-value reachable item — the gateway does all DB access through Drizzle. Installed range `^0.36.4`; the fix is a 0.36 → 0.45 jump (nine 0.x minors, which are potentially-breaking under 0.x semver). **Mitigating context:** Theme C's injection sweep verified the gateway uses **no `sql.raw` and binds every value** as a parameter (no raw interpolation of user input), so the specific escaping bug is not obviously triggered by current call sites — but the upgrade should still happen. **Recommend a dedicated follow-up**: bump to `^0.45.x`, run the full gateway repository/integration suite, review any query-builder API changes.
- **`@nestjs/platform-fastify` / `fastify` / `@fastify/middie` / `fast-uri` / `@nestjs/core` (HIGH/CRITICAL — middleware/path-normalization/URL-encoding bypasses).** The gateway is on `@nestjs/*@^10.4.15` + `fastify@^4.28.1`; the patched versions are `@nestjs@11` / `fastify@5` (a **major framework migration**). Note the actual RBAC/authz gate in midnite is the Nest `GatewayAuthGuard` + `RoleGuard` (per Theme A), and CORS/WS origin checks are enforced in-app — the middie path-bypass class is most relevant if middleware-order is relied on for auth, which here it is not (guards run per-route). **Recommend**: schedule the Nest 10→11 / Fastify 4→5 upgrade as its own theme; re-run the Theme A auth-perimeter checks after.

## Desktop — `electron` (17 advisories, HIGH/MOD/LOW) — follow-up

All in `packages/desktop` (the Electron shell). Installed major trails the patched line (fixes land in electron 38.8.6 / 39.8.x). This is a **major-version upgrade** of the desktop runtime — log as a desktop-maintenance follow-up; not part of the gateway/web/shared shipped surface.

## Dev/build-only — lower priority (not shipped to prod runtime)

Advisories in tooling that never runs in production:
- **`vitest` / `@vitest/browser` (CRITICAL, 1120126/1120809)** — the "critical" is the Vitest **UI/browser-mode server** exposing a CDP proxy; only exploitable while running the interactive test UI, which CI/prod never does. Bump is blocked by the pre-existing `@vitest/coverage-v8@^4` vs `vitest@^3` split (declared that way in `gateway`/`web` package.json) — reconciling those to one major is a small follow-up.
- **`esbuild` (MOD, dev-server SSRF)** — via `drizzle-kit`/`storybook`/`tsx`/`vite`; dev/build only.
- **`webpack`/`tar`/`tmp` (via `@nestjs/cli`, `@electron/rebuild`)**, **`picomatch` (ReDoS)**, **`js-yaml`/`ajv` (via `eslint`)**, **`postcss`** — build/lint/test tooling; patched versions mostly in-range and would be swept up by a future targeted `pnpm update` per package once the vite/vitest churn issue is resolved.

## Unreachable

- **`glob` (HIGH — command injection via `-c/--cmd`, 1109842).** The vulnerability is in glob's **CLI**; midnite uses glob as a **library API** (via `@nestjs/cli` tooling), never the `-c` CLI. Not reachable.

## Secrets, lockfile & licenses — clean

- **Committed secrets:** no tracked `.env` (only `.example`/`.sample`), **zero** matches for key/token patterns (`sk-…`, `AKIA…`, PEM private keys, `ghp_…`, Slack `xox…`) in tracked source, and **no** `.env`/`.pem`/`.key`/`credentials.json` ever added in git history. Secrets are sourced from env (`MIDNITE_AUTH_TOKEN`, `MIDNITE_JWT_SECRET`, `MIDNITE_SECRET_KEY`) per Theme A/B, not committed.
- **Licenses:** no GPL/AGPL/SSPL/BUSL (copyleft/restrictive) packages in the installed tree.
- **Typosquat:** 117 distinct direct deps; none name-shaped like a typosquat (all scoped `@…` or well-known unscoped names).

## Recommended follow-ups (ranked)

1. **`drizzle-orm` → `^0.45.x`** (HIGH, reachable) — dedicated bump + full gateway suite.
2. **Nest 10→11 / Fastify 4→5 migration** (HIGH/CRIT, reachable) — its own theme; re-verify Theme A auth checks after.
3. **`electron` desktop upgrade** (desktop-only) — desktop-maintenance follow-up.
4. **Reconcile `@vitest/coverage-v8@^4` ↔ `vitest@^3`**, then sweep dev-tooling advisories (esbuild/webpack/tar/tmp/picomatch/postcss/js-yaml) with a per-package in-range `pnpm update` (the workspace-wide one regressed `site:typecheck` — do it package-by-package with the test gate).
