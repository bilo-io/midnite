# Phase 60 Theme G — Error handling & failure-path correctness

**Date:** 2026-07-08 · **Scope:** swallowed errors (`catch {}`, log-and-continue, fire-and-forget rejections) · fail-open vs fail-closed intent (security/approval/watchdog paths) · boundary error surfacing (500-vs-4xx, 200-on-partial, CLI/web legibility) · **Method:** three parallel static audits (grep + read) across `packages/gateway/src`, `packages/cli/src`, `packages/web`, verified against branch tip `968c801` (= `origin/main`); top findings re-verified by hand against current source. **Analysis-only** — no code changed (Theme G reports; remediation is a follow-up per the phase scoping rule).

## Summary

| # | Area | Severity | Status |
|---|------|----------|--------|
| SW-1 | `void this.runner.completeWithChecks(...)` fired with **no `.catch`** and the method has no internal try/catch → unhandled rejection + (mitigated) slot leak on a deleted task / checks throw | **P1** | 📋 Documented |
| SW-2 | No process-level `unhandledRejection` / `uncaughtException` handler at the gateway boundary → a reachable rejection has no backstop (Node default = terminate) | **P1** | 📋 Documented |
| FO-1 | Static bearer token fails RBAC **open** (unset `req.user` → `RoleGuard` returns `true`) — **cross-ref A-1**, confirmed **still live** on this branch | **P1** | 📋 Documented (= A-1) |
| FO-2 | `ApprovalsService.evaluate()` called unguarded + unguarded `JSON.parse(rule.match)`; a throw → gateway 500 → PreToolUse hook fails open to **`ask`**, silently downgrading an intended `auto-deny` (incl. the blast-radius floor) on an unattended agent | **P2** | 📋 Documented (new) |
| SW-3 | `HeartbeatScheduler.tick()` reads the DB (`repo.getPrimary()`, `Date.parse`) **before** its guard; docstring claims "never throws" but only `executeHeartbeat` is guarded → a DB throw rejects the interval callback | P2 | 📋 Documented |
| ES-1 | No global exception filter — domain→HTTP mapping is ~40 repeated per-controller `if (err instanceof …)` lines; a new/omitted map silently returns 500 where a 4xx belongs (latent regression class) | P2 | 📋 Documented |
| ES-2 | Upstream-provider outages (weather/news/market) surface as **500** (should be 502/503) and echo the raw upstream message | P3 | 📋 Documented |
| ES-3 | Uniqueness conflicts inconsistent: user/template "already taken" → **400**, repo/council → **409** | P3 | 📋 Documented |
| ES-4 | Web App Router has no `error.tsx` / `global-error.tsx` → a non-query render throw hits Next's bare "Application error" screen in prod | P3 | 📋 Documented |
| ES-5 | Board silently swallows a failed task-detail fetch (`.catch(() => setSelected(null))`) — no toast, the click "does nothing" | P3 | 📋 Documented |
| FO-3 | `terminal.approvals.onNoSubscriber` defaults to `ask` (vs `onTimeout` = `deny`) → an unattended *escalate* verdict with no viewer falls open to `ask` (blast-radius still denies first) | P3 | 📋 Documented (config) |
| FO-4 | `OwnershipService.isOwner` treats owner-less resources (`!createdBy`) as owned-by-everyone → the "mutate another member's item needs admin" promotion doesn't bite for null-`createdBy` rows | P3 | 📋 Documented |
| SW-4 | CLI `readAuth` swallows a **corrupt** auth file identically to "logged out" — no hint the stored token is unreadable | P3 | 📋 Documented |

**Headline:** the codebase is **broadly disciplined** — Phases 50–57 clearly hardened most fail-open paths with logging + comments, the crypto/HMAC/token machinery is uniformly fail-**closed**, the scheduler's kill-switch/spend-cap/readiness gates are uniformly fail-**safe**, and the CLI/web API-error surfacing is solid. There are **no P0s** and no new secret/stack leaks. The genuine gaps are: two robustness bugs (**SW-1** + **SW-2**, which compound — SW-2 turns SW-1/SW-3 from "logged" into "possible crash"), one confirmed-live known fail-open (**FO-1** = A-1), and one **new** fail-open with a security flavor (**FO-2** — the destructive-action floor is only as reliable as the gateway HTTP round-trip). The remaining items are quality/consistency polish. A single high-leverage pair — add the process-boundary rejection handler (SW-2) **and** a convention-based `DomainExceptionFilter` (ES-1) — neutralizes two whole classes of latent failure.

---

## Section 1 — Swallowed / mis-handled errors

CLAUDE.md yardstick: *"Never swallow errors silently; never `catch (e) {}`"*; *"log with `logger.error({ err })` once"*; fire-and-forget side effects must not corrupt a mutation, but a swallowed **data** error is a bug.

### SW-1 — unguarded `void completeWithChecks` → unhandled rejection (+ mitigated slot leak) — 📋 DOCUMENTED (P1)

`pool/lifecycle-hook.controller.ts:65` fires `void this.runner.completeWithChecks(sessionId, prUrl);` with **no `.catch`** — while the sibling call 10 lines above (`:55-57`) correctly guards its fire-and-forget (`void this.usage.harvestFromTranscript(...).catch(() => undefined)`). And `completeWithChecks` (`pool/agent-runner.service.ts:291`) has **no wrapping try/catch**: its first statement `const task = this.tasks.getTask(taskId)` throws `TaskDoesNotExistError` if the task was deleted mid-flight, and `this.checks.run(...)`, `markDone`, `spawnAgentSession`, `recordCheckEvent` can all throw. Any throw becomes an unhandled rejection with no backstop (SW-2).

- **Evidence:** `pool/lifecycle-hook.controller.ts:65`; `pool/agent-runner.service.ts:291-372` (no try/catch around the body).
- **Repro:** run an autonomous agent that emits a PR URL; the Stop hook `POST /hooks/sessions/:sessionId/stop` fires; delete the task (or make the checks subprocess throw) before `completeWithChecks` resolves → the promise rejects unattached. Secondary: the slot acquired in `start()` is released only inside `complete()`, which never runs if `getTask` throws at the top → the slot leaks (the Phase 54 C watchdog reclaims it eventually, so the leak is *mitigated*, but the unhandled rejection is not).
- **Suggested fix:** wrap `completeWithChecks`' body in try/catch so its "slot released in every branch" contract holds even on an unexpected throw, then attach a logging `.catch` at the call site (mirroring the harvest call). Free the slot defensively on failure.
- **Effort:** S

### SW-2 — no process-level `unhandledRejection` / `uncaughtException` handler — 📋 DOCUMENTED (P1)

`bootstrap.ts` and `main.ts` install **no** `process.on('unhandledRejection'|'uncaughtException', …)` (repo-wide grep → none in gateway/desktop). The gateway is a long-running process full of `setInterval(() => void this.tick(), …)` (agent-pool, heartbeat, waiting-nudge, pr-status, backup, workflow schedulers) and `void this.fn()` calls. Most `tick()`s self-guard, but not all (SW-1, SW-3), so a reachable rejection has no backstop — under Node ≥15 the default action for an unhandled rejection is to **terminate the process**.

- **Evidence:** `bootstrap.ts` (whole file), `main.ts:1-8` (only the boot promise is caught).
- **Repro:** trigger SW-1 or SW-3; observe `UnhandledPromiseRejection` and (default policy) process exit; the gateway then leans on boot recovery to requeue in-flight tasks.
- **Suggested fix:** in `startGateway()` (once, before `listen`) register `process.on('unhandledRejection', (err) => logger.error({ err }, 'unhandled rejection'))` and a deliberate `uncaughtException` policy (a long-running orchestrator generally wants log-and-survive for rejections, log-and-exit for truly-uncaught sync exceptions). Use pino, not `console`. This single change converts every latent `void`-promise gap from "possible crash" to "logged warning."
- **Effort:** S

### SW-3 — `HeartbeatScheduler.tick()` reads the DB before its guard — 📋 DOCUMENTED (P2)

`agents/heartbeat-scheduler.service.ts:57-60`: `tick()`'s docstring says "executeHeartbeat never throws, so neither does this," but `const row = this.repo.getPrimary();` (and the subsequent `Date.parse`) run with **no** surrounding try/catch before `executeHeartbeat` is reached. Invoked as `setInterval(() => void this.tick(), tickMs)` (`:43`). If `getPrimary()` throws (DB unreachable/locked), `tick()` rejects → unhandled rejection every tick (SW-2). The sibling `AgentPoolScheduler.tick()` does this correctly (full `try/finally` + a DB-readiness gate).

- **Evidence:** `agents/heartbeat-scheduler.service.ts:57-60`, `:43`; contrast `pool/agent-pool-scheduler.service.ts:177-253`.
- **Suggested fix:** wrap the tick body in try/catch that logs `warn` and returns (fail-open), matching `AgentPoolScheduler`; or gate on DB readiness the same way. Reset the `running` guard in a `finally`.
- **Effort:** S

### SW-4 — CLI `readAuth` swallows a corrupt auth file as "logged out" — 📋 DOCUMENTED (P3)

`cli/src/lib/auth-store.ts:15-22`: `catch { return null; }` covers both "file missing" (correct) and "`JSON.parse` threw on a corrupt/truncated `auth.json`" (silently treated as no-token). The user is silently unauthenticated with no hint the stored token is corrupt vs absent.

- **Repro:** write garbage to `~/.config/midnite/auth.json`; run any authed command → behaves as never-logged-in, no diagnostic.
- **Suggested fix:** distinguish `ENOENT` (return null quietly) from a parse error (still return null so the flow degrades, but emit a one-line `chalk.dim` stderr note: "stored credentials unreadable — re-run `midnite login`").
- **Effort:** S

---

## Section 2 — Fail-open vs fail-closed

The core question for every error path that guards a decision: **when it fails, does it fail the safe way?** Security/authz → must fail **closed**; approvals/guardrails → must fail **safe**; best-effort telemetry (PR-status, watchdog, usage) → intentionally fail **open** (confirmed correct below).

### FO-1 — static bearer token fails RBAC **open** — 📋 DOCUMENTED (P1, = A-1, confirmed live)

Cross-reference to Theme A finding **A-1**, re-verified as **still live on this branch** (`role.guard.ts`/`gateway-auth.guard.ts` last touched Phase 38/46; no Phase 50–57 fix). `auth/gateway-auth.guard.ts:91` authenticates the legacy static token **without setting `req.user`** (unlike the JWT `:71` and service-token `:82` paths); `auth/role.guard.ts:51` treats an unset `req.user` as "skip role enforcement" (`if (!user) return true;`) → every `@RequiresRole` route passes. This is the top fail-open in the codebase — a security check failing open.

- **Repro:** with `MIDNITE_AUTH_TOKEN` set (recommended prod config; the static path has no loopback gate), `Authorization: Bearer <static token>` reaches any admin-only route (guardrails, service-tokens, approvals, repos) with owner-equivalent, cross-team access.
- **Suggested fix (per A-1):** set a synthetic superuser principal on `req.user` in the static-token branch that `RoleGuard` *evaluates* as authorized, and make `role.guard.ts:51` fail **closed** when a route declares `@RequiresRole` but no principal resolved (routes without it stay unaffected). Needs the A-1 threat-model decision.
- **Effort:** M · **Direction:** fails open (wrong).

### FO-2 — approval decision path throws → hook fails open to `ask`, bypassing the blast-radius floor — 📋 DOCUMENTED (P2, new)

The destructive-action floor (Phase 50 C) is only enforced when the gateway HTTP round-trip *succeeds*, because the decision path is unguarded:

1. `terminal/approval.service.ts:117` — `const decision = this.approvalsService.evaluate(toolName, payload.tool_input)` is called with **no try/catch**.
2. `approvals/lib/rule-evaluator.ts:33` — `const match = JSON.parse(rule.match) as ApprovalRuleMatch;` — an unguarded `JSON.parse` on a stored `approval_rules.match` value (also `approvals.service.ts` `toRule`). A corrupt / hand-edited / partially-migrated row throws.
3. A throw → `ApprovalController.preToolUse` rejects → Nest returns **500** → the in-PTY hook `terminal/hooks/pre-tool-use-hook.cjs:63-64,70` sees `!res.ok` / an exception and **emits `ask`** ("midnite must never hard-block the user").

The blast-radius verdict is computed *inside* `evaluate()`, so a throw before it is reached silently downgrades a would-be `auto-deny` (force-push / protected-branch push / `rm -rf` / secret-file read) to `ask` on an unattended agent — and `ask` is not `deny`. The same downgrade happens if the gateway is unreachable / times out.

- **Evidence:** `terminal/approval.service.ts:117`; `approvals/lib/rule-evaluator.ts:33`; `terminal/hooks/pre-tool-use-hook.cjs:63-64,70`.
- **Repro:** in `autonomous`/`guarded` mode, set one `approval_rules.match` cell to invalid JSON (or force any 500 in `evaluate`), then have an agent invoke a blast-radius tool (`git push --force`). Expected `deny`; actual gateway-500 → hook emits `ask`, floor bypassed.
- **Suggested fix:** guard `toRule`'s `JSON.parse` so a rule-parse failure is a non-match / hard-deny rather than a throw; and make the gateway-side decision fail **closed** for the blast-radius floor (a guard that returns `deny`, not `ask`, on internal error). Consider a mode-aware hook contract: an unattended session treats gateway-500/unreachable as `deny` (the "never hard-block the user" rationale only holds when a human is at the terminal).
- **Effort:** M · **Direction:** fails open (wrong for unattended modes).

### FO-3 — `onNoSubscriber` defaults to `ask` — 📋 DOCUMENTED (P3, config)

`shared/src/config.ts:166` — `onNoSubscriber: z.enum(['deny','ask']).default('ask')` (vs `onTimeout` correctly `deny` at `:164`); consumed at `terminal/approval.service.ts:144-154`. When no viewer is connected, an *escalate* verdict returns `{ decision: 'ask' }`. **Mitigated:** blast-radius / any `auto-deny` is evaluated *before* the no-subscriber fallback (`approval.service.ts:129-142`), so genuinely dangerous actions still deny; this only concerns the residual escalate-with-no-viewer case.

- **Suggested fix:** default `onNoSubscriber` to `deny` (matching `onTimeout`), or make it mode-aware (deny in `autonomous`/`guarded`, `ask` in `manual`). Behavior change → operator decision.
- **Effort:** S · **Direction:** soft fail-open (documented design choice).

### FO-4 — `OwnershipService.isOwner` treats owner-less resources as owned-by-everyone — 📋 DOCUMENTED (P3)

`auth/ownership.service.ts:12-13` — `isOwner(entityCreatedBy, userId) => !entityCreatedBy || entityCreatedBy === userId`. A `null`/`undefined` `createdBy` (legacy rows, static-token-created rows where `req.user` is unset, service-token rows) makes **every** member an "owner," so `resolveRequiredRole` returns `baseRole` instead of promoting to `admin` for mutating another member's resource. Compounds A-1/A-5; bounded (still requires an authenticated team member at `baseRole`).

- **Suggested fix:** treat a null `createdBy` as *not* owned by the requester (require `admin`), or backfill `createdBy` on all write paths.
- **Effort:** S · **Direction:** fails open.

---

## Section 3 — Boundary error surfacing

CLAUDE.md yardstick: *"Services throw; handlers translate to HTTP status codes."* The gateway uses **per-controller translation** (no global filter) — I traced every domain-error subclass to its controller and confirmed the major CRUD modules map correctly (see confirmed-correct). No P0/P1; findings are latent/structural (P2) and polish (P3).

### ES-1 — no global exception filter; domain→HTTP mapping is per-controller and unguarded — 📋 DOCUMENTED (P2)

`bootstrap.ts` has no `useGlobalFilters`/`APP_FILTER`; grep for `ExceptionFilter`/`@Catch` across the gateway → **zero**. Mapping lives as ~40 repeated `if (err instanceof XError) throw new HttpException(...)` lines across ~15 controllers (e.g. `teams/teams.controller.ts:44-200`, `councils/councils.controller.ts:211-220`, `repos/repos.controller.ts:75-76`). Not an active bug (all current domain errors are caught), but a **regression class**: a new service method that throws a domain-error subclass, or a route that omits the try/catch, silently returns **500 where a 4xx belongs**.

- **Suggested fix:** add one `DomainExceptionFilter` (`APP_FILTER`) that maps by convention — `*DoesNotExistError`→404, `*TakenError`/`*InProgressError`/cycle→409, `*ForbiddenError`→403, `*InvalidError`→400 — and delete the per-controller boilerplate, making correct mapping the default. Keep the explicit maps as a fallback during migration.
- **Effort:** M

### ES-2 — upstream-provider outages surface as 500 (not 502/503) + echo raw upstream message — 📋 DOCUMENTED (P3)

`weather/weather.controller.ts:16`, `news/news.controller.ts:16`, `market/market.controller.ts:23,34,45` all `throw new InternalServerErrorException(err.message)`; the messages come from `news/news.service.ts:21` (`` `${url} → ${res.status} ${res.statusText}` ``) and `market/market.service.ts:100` (`'stocks unavailable: set TWELVE_DATA_API_KEY on the gateway'`). With the upstream down, `GET /market` etc. returns **500** with verbatim upstream detail when a **502/503** is correct (the gateway is healthy). No secret leaks (names an env var, not its value).

- **Suggested fix:** map upstream fetch failures to `BadGatewayException`/`ServiceUnavailableException` with a fixed client message and log the raw `err` once server-side — mirroring `phase-docs.controller.ts:218` (`GithubUnavailableError`→`BadGatewayException`).
- **Effort:** S

### ES-3 — inconsistent status for "already taken" conflicts (400 vs 409) — 📋 DOCUMENTED (P3)

`auth/auth.controller.ts:45` `UserAlreadyExistsError`→**400** and `workflow-templates/workflow-templates.controller.ts:63,75` `TemplateSlugTakenError`→**400**, but `repos/repos.controller.ts:76` `RepoNameTakenError`→**409** and council conflicts→**409**. Same class, different status — clients can't branch uniformly.

- **Suggested fix:** standardize uniqueness collisions on `ConflictException` (409); folds into ES-1's convention filter.
- **Effort:** S

### ES-4 — web has no App Router error boundary — 📋 DOCUMENTED (P3)

`find packages/web/app -name error.tsx -o -name global-error.tsx` → none; no non-route `ErrorBoundary` (no `componentDidCatch`/`getDerivedStateFromError`). Data-fetch errors are handled well (below), so this only bites **non-query render throws** (e.g. mapping over an unexpectedly-shaped payload) → Next's default bare "Application error" screen in prod.

- **Suggested fix:** add `app/error.tsx` (segment boundary with a reload action) + `app/global-error.tsx` for the layout shell.
- **Effort:** S

### ES-5 — board silently swallows a failed task-detail fetch — 📋 DOCUMENTED (P3)

`web/components/tasks-view.tsx:166-171` — `getTask(openId).then(setSelected).catch(() => setSelected(null))`. Deep-link/open a task whose `GET /tasks/:id` fails (500 or a transient blip) → the modal silently clears with **no toast**; the click appears to do nothing. Everywhere else in this file errors toast (`:258,:297,:318`).

- **Suggested fix:** `toast.error(...)` in the catch (reuse the existing `toast` in scope).
- **Effort:** S

---

## Confirmed correct (verified on this branch — intentional, cleared)

**Fire-and-forget with logging catches (correct):** `webhook-delivery.service.ts:81` (`.catch(logger.warn)`), `workflow-engine.service.ts:96` (`.catch(logger.error).finally(cleanup)`), `phase-doc-sync.service.ts` (`setTimeout` → `flush().catch(logger.warn)`), `notification-dispatcher.service.ts:26` / `notification-event-bus.ts:24` / `notifications.service.ts` (every dispatch/subscriber failure caught + `warn` so a broken channel can't wedge delivery or a tick), `agent-pool-scheduler.service.ts:299` (`notifyGuardrailHeld` catches internally).

**Deliberate malformed-data fallbacks (correct):** `media.repository.ts:40`, `retro/retro-builder.service.ts:56`, `agent/llm/json-output.ts:32,41`, `inbound-receiver.service.ts:118`, `db/schema-version.ts:26` (fail-soft `-1`).

**WS send/close guards (correct):** bare catches around `send`/`ping`/`terminate`/`close` in `ws/heartbeat.service.ts:63,72`, `reliable-broadcast.service.ts:153`, `ws-broadcast.service.ts:64` (socket closing between readyState check and write).

**Process-boundary `console.*` (accepted exception):** `bootstrap.ts:106,147`, `main.ts:5`, `lib/load-config.ts:41-59` — all carry `// eslint-disable-next-line no-console` and run before the pino logger exists. No stray `console.*` in gateway services or web runtime.

**Security — verified fail-CLOSED:** `JwtService.verifyAccessToken` (HS256-pinned, throws on any error/unset secret), inbound HMAC (`verify-signature.ts`, length-checked `timingSafeEqual` → 401), Claude hook per-session secret (`tokenMatches`, no hash → 404), `ServiceTokensService.validate` (bad/expired → null), terminal `verifyToken` (single-use delete, now `safeEqual` — A-7/B-6 confirmed fixed), `isAllowedOrigin` (malformed → false, all 6 WS gateways), SSRF `isSafeHttpUrl` (parse error → false), `RateLimitGuard` (over-limit → 429, runs before auth).

**Guardrails — verified fail-SAFE:** the scheduler resolves to "spawn nothing" under doubt — `isGloballyPaused()` → skip, DB-unready → backoff, `overBudget` → hold all, scope-pause + per-repo/user caps filter the ready-set, watchdog throw caught → tick continues; kill-switch/guardrail state read at boot with no catch → a read failure fails the boot (closed). Blast-radius floor consulted **first** in unattended modes (the FO-2 gap is specifically the *throw/unreachable* path, not the happy path).

**Intentional fail-OPEN (correct — degrade, don't block):** PreToolUse hook fail-open-to-`ask` for the interactive/human case, usage harvest (`lifecycle-hook.controller.ts:55-58`), inbound delivery recording + backlink, best-effort webhook delivery (`lib/safe-webhook-delivery.ts`), `SessionUsageService.harvestFromTranscript` (catches internally, `debug` log).

**Surfacing — verified correct:** zod validation → 400 (uniform inline `safeParse` → `BadRequestException`); Nest default handler does **not** leak stacks/messages (bare `Error` → `{"statusCode":500,"message":"Internal Server Error"}`); domain-error mapping present/correct across repos/teams/users/auth/councils/workflows/workflow-templates/webhooks/inbound/phase-docs/providers; **bulk create is a real partial-success contract** (`tasks.service.ts:744-783` → per-line `results` + `counts`); portability import reports per-domain `inserted`/`skipped` (bad archive → 400); workflow-engine bare `Error`s are mapped by `workflows.service.ts:155,223` → 400; spawner errors aren't controller-reachable. **CLI robust** — `client.ts:174-187` legible gateway-down message + parses `{message}` on 4xx/5xx, top-level `.catch` → message + `exit(1)`, no command bypasses the client. **Web robust** — `lib/api.ts:359-412` `ApiError` (status + parsed `{statusCode,message,error}`), `use-gateway-error-toast.ts` dedupes to a toast, mutations catch + `toast.error`, `retry:false` surfaces rather than hides.

---

## Ranked backlog (for Theme M)

1. **SW-2** (P1) — add a process-boundary `unhandledRejection`/`uncaughtException` handler. Highest leverage: neutralizes SW-1/SW-3 as crash risks. **[S]**
2. **SW-1** (P1) — guard `completeWithChecks` body + logging `.catch` at the call site; free the slot on failure. **[S]**
3. **FO-1** (P1, = A-1) — RBAC static-token fail-open; needs the A-1 threat-model decision. **[M]**
4. **FO-2** (P2, new) — make the blast-radius decision fail **closed** on gateway error/unreachable (guard `evaluate` + `JSON.parse`; mode-aware hook contract). **[M]**
5. **ES-1** (P2) — one convention-based `DomainExceptionFilter`; removes the 500-where-4xx regression class + folds in ES-3. **[M]**
6. **SW-3** (P2) — wrap `HeartbeatScheduler.tick()` in try/catch (match `AgentPoolScheduler`). **[S]**
7. **ES-2/ES-3/ES-4/ES-5, FO-3/FO-4, SW-4** (P3) — status-class + consistency + web error-boundary + CLI-auth polish. **[S each]**

**Cross-cutting pattern (for Theme M):** the two most valuable fixes are both *convention-at-the-boundary* changes — a process-level rejection handler (SW-2) and a domain→HTTP exception filter (ES-1) — each converting a scattered latent-failure class into a single enforced default. Worth a dedicated "error-boundary hardening" remediation slice.
