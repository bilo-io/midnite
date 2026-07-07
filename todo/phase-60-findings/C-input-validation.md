# Phase 60 Theme C — Input validation & injection sweep

**Date:** 2026-07-07 · **Scope:** gateway (`packages/gateway`) + shared contracts · **Method:** route-by-route zod-coverage enumeration, targeted injection probes (FTS5 / path-traversal / zip-slip / raw SQL), and an SSRF surface review of every user-controlled outbound fetch.

## Summary

| # | Area | Severity | Status |
|---|------|----------|--------|
| C-1 | Media file-serve path traversal / arbitrary file read (`GET /media/:id/file`) | **HIGH** | ✅ **Fixed in this PR** |
| C-2 | SSRF: DNS-blind guard + no redirect re-validation across 4 outbound-fetch sites | **HIGH** | 📋 Documented — follow-up theme (see below) |
| C-3 | No global `ZodValidationPipe`; per-route validation is opt-in | LOW (systemic) | 📋 Recommendation logged |
| C-4 | FTS5 `MATCH` query escaping | — | ✅ Verified safe |
| C-5 | Phase 49 import archive (zip-slip) | — | ✅ Verified safe |
| C-6 | Raw `sql\`\`` interpolation across the gateway | — | ✅ Verified safe |
| C-7 | Webhook / inbound-receiver `unknown` bodies | — | ✅ Safe by design (token/HMAC-gated) |

One actionable vulnerability (C-1) was found and fixed. The two other injection surfaces called out in the theme spec (FTS5, zip-slip) and the gateway's raw-SQL usage are all clean. The SSRF surface (C-2) is a real, systemic weakness but its remediation is a feature in its own right, so it is logged as a follow-up per the iteration's scoping decision.

---

## C-1 — Media file-serve path traversal / arbitrary file read — HIGH — ✅ FIXED

**Location:** `packages/gateway/src/media/media.controller.ts` (`serveFile`, `GET /media/:id/file`); root cause in the unconstrained `filePath` at `packages/shared/src/media.ts`.

**The hole (before):** `serveFile` read the media row's `filePath` — a value stored **verbatim from the client-supplied create/update body** (`CreateMediaBodySchema.filePath` was `z.string().default('')`, no constraint) — and served it two ways, both exploitable by any authenticated user (the media routes carry `GatewayAuthGuard` but no admin role gate):

1. **Absolute path:** `POST /media {"filePath":"/etc/passwd", …}` then `GET /media/:id/file`. The `isAbsolute(filePath)` branch set `absolutePath = filePath` and streamed it verbatim → read any file the gateway process can access (`/etc/passwd`, the SQLite DB, `midnite.json`, keys).
2. **Relative traversal:** `{"filePath":"../../../../etc/passwd"}`. `join(base, filePath)` collapsed the `../` segments with **no post-join containment check** → escaped the uploads dir.

The `content-type` was also attacker-controlled (`row.mimeType`).

**The fix (two layers, defense-in-depth):**

- **Write-time guard (shared):** `isSafeMediaFilePath()` in `packages/shared/src/media.ts` — rejects absolute paths (posix `/…`, Windows `C:\…`, backslash/UNC-rooted), any `..` traversal segment, and NUL bytes; empty string (“no file yet”) stays allowed. Wired as a `.refine()` on `CreateMediaBodySchema.filePath` **and** `UpdateMediaBodySchema.filePath`, so a hostile path is rejected with a 400 at the boundary and can never be persisted.
- **Serve-time containment (gateway):** `resolveMediaPath()` in `packages/gateway/src/media/lib/resolve-media-path.ts` — resolves the stored path against the uploads base and returns `null` (→ `400`) unless the resolved absolute path stays within the base (`candidate === base || candidate.startsWith(base + sep)`). The read path **never trusts the stored value**, so a legacy/imported row carrying a hostile path is still confined. The `serveFile` handler now also stops reaching into the private repo (`this.service['repo']`) — it calls a new `MediaService.getFileMeta(id)` returning `{ filePath, mimeType }`.

**Tests:** `packages/shared/src/media.test.ts` (schema rejects `/etc/passwd`, `../`, `C:\`, NUL; accepts normal relative + empty), `packages/gateway/src/media/lib/resolve-media-path.test.ts` (7 cases: relative-inside allowed, absolute-inside allowed, absolute-outside/`..`/sibling-escape rejected, custom uploads dir), and 3 new `media.controller.test.ts` cases (stored `..`/absolute → 400 before any disk touch; contained path passes containment and only 404s for missing-on-disk).

---

## C-2 — SSRF: DNS-blind guard, no redirect re-validation — HIGH — 📋 FOLLOW-UP

**Not fixed in this PR** (per the iteration decision — a proper SSRF guard is a feature with its own tests). Logged here for a dedicated follow-up slice.

**Root cause:** every user-controlled outbound fetch funnels through one best-effort helper, `isSafeHttpUrl` at `packages/gateway/src/projects/lib/opengraph.ts:27-56`, whose own doc-comment admits it "does not resolve DNS". Systemic holes:

1. **No DNS resolution** — the guard string-matches the literal hostname only. An attacker domain whose A record points at `169.254.169.254` / `127.0.0.1` / an RFC1918 host passes, and `fetch()` then connects to the private IP (also enables DNS-rebinding TOCTOU).
2. **Alternate IP encodings bypass the v4 regex** — decimal `http://2130706433/`, octal `http://0177.0.0.1/`, hex `http://0x7f000001/`, short `http://127.1/` all pass and resolve to loopback/metadata.
3. **IPv6 gaps** — only `::1`/`::` handled; ULA `fc00::/7`, link-local `fe80::/10`, IPv4-mapped `[::ffff:169.254.169.254]` are not blocked.
4. **Redirects never re-validated** — all call sites use `redirect: 'follow'` (or the default). The guard runs on the initial URL only, so a public URL returning `302 Location: http://169.254.169.254/…` sails through. No redirect-hop cap is set.

**Affected fetch sites (all HIGH):**

| Site | File | URL source | Extra risk |
|------|------|-----------|-----------|
| Agent URL context | `agent/url-context.service.ts:78` (`fetchGeneral`) | URLs in the agent task prompt | response body folded into model context → **exfiltration** |
| Workflow `http.request` node | `workflows/engine/executors/http-request.executor.ts:42` | node `params.url` after `{{expr}}` interpolation over task data / `$env` | can replay **stored credentials** at internal targets; two-way response |
| Outbound webhooks + notification channel | `lib/safe-webhook-delivery.ts:42` (callers `webhooks/webhook-delivery.service.ts:116`, `notifications/channels/webhook.channel.ts:29`) | user/admin-configured webhook URL (stored) | **stored/persistent** SSRF; blind (response discarded) |
| Link-metadata proxy | `projects/lib/opengraph.ts:155/161` via `metadata/metadata.service.ts:13` (`GET /metadata`) | direct user query param | returns page `<title>`/OG tags to caller → internal-content leak |

Fixed-host fetches (GitHub/Slack/oauth/open-meteo/YouTube-oEmbed) are **not** SSRF — noted for completeness.

**Recommended remediation (follow-up theme):** replace `isSafeHttpUrl` with a hardened outbound-fetch wrapper used by all four sites — (1) http/https protocol allowlist; (2) DNS-resolve then reject if **any** resolved address is in the private/loopback/link-local/metadata/CGNAT/reserved denylist (v4 + v6 incl. mapped forms), and **pin the connection to the resolved IP** to close the rebinding window; (3) normalize IP-literal encodings before matching; (4) `redirect: 'manual'` + re-validate every hop with a small cap; (5) keep the existing size caps + timeouts and add an explicit `maxRedirects`; (6) reconsider the `workflows.allowLoopbackHttp` escape hatch in favor of an explicit host allowlist. *Suggested as a new Phase 60 (or security) theme.*

---

## C-3 — No global `ZodValidationPipe` — LOW (systemic) — 📋 RECOMMENDATION

There is **no `APP_PIPE` / global `ZodValidationPipe`** in the gateway. Validation is opt-in per route: each controller author calls `Schema.safeParse(body)` (throwing `BadRequestException` on failure) by hand. Coverage today is essentially complete — of 34 controllers taking `@Body()`, every JSON body route parses against a `shared` schema — but the pattern relies on each new route remembering to do so; a future route could silently accept unvalidated input with no guardrail flagging it.

**Recommendation (follow-up, not fixed here to keep this PR focused):** either introduce a reusable `ZodValidationPipe` applied per-route (as CLAUDE.md already envisions), or add a lightweight architecture test that asserts every `@Body()`/`@Query()` handler routes through a zod parse. Low severity — informational, not an active vulnerability.

**Verified-benign near-misses:** `audit/audit.controller.ts` query filters (bounded via `Math.min/Math.max/Number()`, bound as SQL params), `pool/pool.controller.ts` `?to=` (benign), and the multipart upload paths (`tasks.controller.ts` create, `portability.controller.ts` import — legitimately can't use a single `@Body` schema; they validate structurally).

---

## C-4 — FTS5 `MATCH` query escaping — ✅ VERIFIED SAFE

Path: `search.controller.ts:15` (`GET /search`, zod-parsed via `SearchQuerySchema`) → `search.service.ts:86` `toFtsMatchQuery(q)` → `search-index.service.ts:103/110` `sql\`… MATCH ${match} …\``.

The raw string never reaches `MATCH`. `search/lib/fts-query.ts:14-16` tokenizes with `raw.match(/[\p{L}\p{N}]+/gu)` — keeps only Unicode letter/number runs, discarding every FTS5 metacharacter (`"`, `*`, `:`, `(`, `-`, `^`, `NEAR`, `OR`, column filters, stray quotes). Each surviving token is re-wrapped as a quoted prefix term `"token"*`, term count capped at 16 (`MAX_TERMS`), and the result is passed as a **bound parameter** `${match}`. A crafted query like `title:foo OR "x` cannot break syntax or 500. Dedicated tests exist (`fts-query.test.ts`). No action needed.

## C-5 — Phase 49 import archive (zip-slip) — ✅ VERIFIED SAFE

Path: `portability.controller.ts:68/76` (`@RequiresRole('admin')`) → `portability-import.service.ts:108` `unpack()` → `portability/lib/archive.ts:34` `unpackArchive`.

`unpackArchive` uses `fflate.unzipSync` then reads **only well-known keys** — `files['manifest.json']` and `files['domains/<name>.json']` where `<name>` comes from the validated `manifest.domains` list. Entry names are **never used as filesystem paths**; nothing is written to disk during import (payloads are `JSON.parse`d, zod-validated, inserted into a fixed set of Drizzle tables). A malicious `../../evil` entry name is simply never looked up → no zip-slip. *(Minor, out of scope: the archive is buffered fully into memory with no size cap — a zip-bomb/large-upload DoS consideration, not an injection issue. Worth a size cap in a resilience pass.)*

## C-6 — Raw `sql\`\`` interpolation — ✅ VERIFIED SAFE

Enumerated every `sql\`\`` usage and searched for `sql.raw(`, `sql.identifier`, and string concatenation into query text across `packages/gateway/src/**`. **No `sql.raw` anywhere.** Every `sql\`\`` template interpolates only Drizzle `Column` objects (safe identifiers) or values via `${…}` (bound parameters). Reviewed and safe: `search/search-index.service.ts`, `service-tokens/service-tokens.repository.ts` (raw INSERT/SELECT strings but all values bound), `tasks/tasks.repository.ts` (retry arithmetic + dependency `NOT EXISTS` subquery — column refs + bound `${now}` + static literals), `metrics/`, `councils/`, `notifications/`, `ideas/ideas.repository.ts` (`like(title, \`%${q}%\`)` — `q` bound as a parameter; the only nit is `%`/`_` in `q` aren't LIKE-escaped, a benign self-match-widening quirk, not injection). No dynamic table/column names derive from user input.

## C-7 — `unknown` request bodies — ✅ SAFE BY DESIGN

Two routes accept `@Body() body: unknown` without a zod parse; both are **intentionally** arbitrary external payloads, authenticated by a channel other than the body:

- `workflows/webhook.controller.ts` (`POST /hooks/workflows/:id/:token`) — the unguessable per-workflow token in the path authenticates (hashed at rest, constant-time compared); the body becomes arbitrary `$json` workflow data. Body size is bounded by Fastify's default 1 MB limit (no custom `bodyLimit` override found — acceptable).
- `integrations/inbound/inbound-receiver.controller.ts` (`POST /integrations/inbound/:id`) — gated by the **provider HMAC signature** over the raw bytes (`InboundSignatureError` → 401); the parsed body is provider-shaped data handed to an adapter.

Neither is a validation gap.

---

## Quick-wins applied in this PR

- **C-1** media path-traversal fix (schema refinement + serve-time containment + repo-encapsulation cleanup) with full test coverage.

## Logged as follow-ups (not in this PR)

- **C-2** SSRF hardening wrapper (HIGH) — recommend a dedicated theme.
- **C-3** global `ZodValidationPipe` or an architecture test (LOW).
- Zip archive size cap (resilience nit under C-5).
