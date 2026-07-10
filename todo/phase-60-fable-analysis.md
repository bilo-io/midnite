# Phase 60 — Fable-Analysis (repo-wide audit: security, bugs, UX, every package)

> Fifty-nine phases in, midnite is broad: six packages, a gateway with ~50 tables, a web app with
> a dozen live surfaces, a 35-command CLI, a design system, and a docs site. The hardening arc
> (50/53/54/56/57) fixed what we *knew* was weak — this phase hunts for what we **haven't looked
> at**. It's a **deep-analysis pass, not a fix pass**: thirteen bounded audit themes across four
> sections — **security**, **bugs & correctness**, **UI/UX (direction-preserving)**, and
> **monorepo hygiene** — each producing a **ranked findings report**. The product's direction is
> *liked as-is*: UX themes look for the overlooked (dead ends, missing states, a11y, staleness),
> never a redesign. The grounding already hints where to dig: the **docs site is severely stale**
> (design-system-only — nothing on sessions/slides/workflows/guardrails), **`@midnite/ui`
> primitives have zero unit tests** and hand-rolled accordion/tabs (a11y risk), the **CLI has
> untested command clusters** + a boundary smell, and complex web interactions (dnd-kit board,
> dialogs) have **never had a keyboard/ARIA audit**.
>
> Each theme is written to be a **self-contained `/exec` slice**: concrete files to open, greps to
> run, checks to make — deep-thinking work, granular enough to execute to completion in one run.

> **Scope guardrails (CLAUDE.md).** This phase **reports; it does not remediate** — with two
> narrow exceptions: **Section I (security) may fix quick wins inline** (severity ≥ High **and**
> effort S, e.g. a missing header, an unvalidated param) and **Theme D may apply cheap dependency
> bumps** (patch/minor, tests green). Everything else becomes a finding. Findings live in
> **[`todo/phase-60-findings/`](phase-60-findings/)** — one file per theme (`A-security-auth.md`,
> `B-secrets-signatures.md`, …) using the shared template below. **No behavior changes** outside
> the quick-win rule; no schema changes; no new deps (analysis only). Respect package boundaries
> while auditing them. Findings must carry **evidence** (`file:line`, a repro, or a failing
> probe) — no vibes-based findings. Where a suspected gap was already fixed by a recent phase
> (50–57 moved fast), **verify against current `main`** and drop it rather than reporting stale
> state.
>
> **Findings template (every report):** one `## Finding` per item with — `severity` **P0**
> (exploitable/data-loss) · **P1** (real bug/serious gap) · **P2** (quality/consistency) · **P3**
> (nice-to-have); `evidence` (file:line + what was observed); `repro` (steps or probe command,
> where applicable); `suggested fix` (one paragraph); `effort` (S/M/L). Reports end with a ranked
> summary table. Theme M merges them all.

> Effort tags: **S** small · **M** medium · **L** large. Sections are independent — themes can run
> in any order and in parallel (each is read-only except the quick-win rule). **M** (synthesis)
> runs **last**, after every other theme's report exists.

---

## Current state (what the grounding already knows)

- **Clean on markers** — only ~6 `TODO/FIXME` across all packages (mostly tests); `shared` (~126
  modules) has **zero** debt markers; ESLint is live (flat config at root) with ~20
  `eslint-disable` files clustered in web (auth-context, preference-sync, nav-bar, settings).
- **Security posture (from prior groundings — verify, don't assume):** IP rate limiting exists but
  ships **off by default** ([`auth/rate-limit.guard.ts`](../packages/gateway/src/auth/rate-limit.guard.ts));
  Phase 50 added env scrub + spend caps + RBAC on approvals; Phase 46 does HMAC on inbound; the
  hook path uses per-session secrets. Headers/CORS/depth of zod coverage: **unaudited**.
- **CLI** ([`cli/src/index.ts`](../packages/cli/src/index.ts), ~1,264 lines, 35 commands, 10 spec
  files) — gateway-down/401 handling is good (`fetchOk`); **untested clusters**: bulk ops,
  guardrails, import/export, search; some commands miss explicit exit codes; **no env-var token
  fallback** for CI (token must be on disk); one **boundary smell** (an `@midnite/gateway` import
  to audit).
- **Docs site** ([`packages/docs/`](../packages/docs/), 11 MDX pages) — **design-system-only**;
  no product docs for sessions, slides, workflows, guardrails, cockpits; `getting-started.mdx`
  covers only the UI-library on-ramp.
- **`@midnite/ui`** — 10 primitives, 10 stories, 1 boundary test, **0 unit tests**; select is
  react-select (a11y-solid) but **accordion/collapse/tabs are hand-rolled** (ARIA/keyboard
  unverified); `@storybook/addon-a11y` installed but automated axe coverage unconfirmed.
- **Web** — no Radix; some hand-rolled dialogs; dnd-kit board keyboard-nav untested;
  `components/ui/` holds thin re-export wrappers of `@midnite/ui` (boundary clarity question).
- **Recent phases moved fast** — 50/53/54/56/57 fixed many previously-known gaps; every stale
  claim must be re-verified against `main` before it becomes a finding.

---

# Section I — Security (audit + quick wins)

## Theme A — Auth, transport & headers audit — **M** — ✅ DONE (PR #357, 2026-07-07)

The perimeter: who can reach what, and what the wire looks like.

- [x] **Rate limiting posture:** confirmed default-off (`config.ts:194` `max: 0`, guard short-circuits at
      `rate-limit.guard.ts:34`). Per-IP fixed-window, `APP_GUARD` before auth; covers `/auth/*` +
      `/service-tokens` + `POST /integrations/inbound/:id`, exempts `/health*` + `/hooks/*`, misses the WS
      upgrade + Fastify-native `/uploads/*`. **Finding A-4:** recommend a conservative non-zero default
      (`max: 300`/60s) — *deferred* (flipping default-off→on is behavior-changing, operator decision).
      **Finding A-2 (HIGH):** no per-account login lockout/backoff — `POST /auth/login` brute-forceable.
- [x] **Headers & CORS:** CORS **verified sound** (A-10 — no wildcard, no credentials, unknown origins fail
      closed, WS origin parity across all six gateways). Security headers were **all absent** → **A-3 quick-win
      applied**: `X-Content-Type-Options: nosniff` + `X-Frame-Options: SAMEORIGIN` + `Referrer-Policy` via a
      global hook (`lib/security-headers.ts`); CSP + HSTS documented as decisions (tune-to-export / TLS-terminator).
- [x] **Token & session lifecycle:** **A-1 (HIGH)** — the static bearer token leaves `req.user` unset →
      `RoleGuard` fails open → **all `@RequiresRole` bypassed**, remotely reachable on a non-loopback bind
      (needs a threat-model decision). **A-7 quick-win applied** — terminal token now uses a constant-time
      `safeEqual`. Documented: service tokens carry no scopes (A-5), no refresh reuse-detection (A-6),
      terminal-token TTL has no active sweep (A-8), `deleteExpired` is dead code (A-9). Confirmed done-right:
      refresh tokens hashed+rotated+revoked-on-logout, JWT pins HS256, service tokens hashed/revocable.
- [x] **Report:** [`todo/phase-60-findings/A-security-auth.md`](phase-60-findings/A-security-auth.md) — ranked
      findings + quick-wins-applied list.

## Theme B — Secrets, signatures & crypto paths audit — **M** — ✅ DONE (PR #346, 2026-07-07)

Everything secret-shaped, end to end.

- [x] **Inventory encrypted-at-rest columns** (`workflow_credentials.data`, `webhooks.secret`,
      `llm_providers.apiKey`, …) against [`crypto.service.ts`](../packages/gateway/src/crypto/crypto.service.ts)
      usage — flag any secret-bearing column **not** going through `CryptoService` (the earlier grounding
      flagged `llm_providers.apiKey` plaintext-fallback when `MIDNITE_SECRET_KEY` is unset; verify current state).
- [x] **Signature paths:** verify inbound HMAC (Phase 46 — raw-body verification, `timingSafeEqual`,
      per-source secrets) and outbound signing (Phase 44) haven't regressed; audit the Claude-hook path
      (`x-midnite-hook-secret` per session) for timing-safe compare + secret rotation on reattach.
- [x] **Leak surface:** grep for secrets in logs (`logger.*` calls that might serialize config/env/credential
      objects), verify the Phase 50 **env scrub** is on by default now or still opt-out, and check
      error responses never echo secrets/stack traces to clients in prod mode.
- [x] **Report:** `todo/phase-60-findings/B-secrets-signatures.md`.

## Theme C — Input validation & injection sweep — **M** — ✅ DONE (PR #357, 2026-07-07)

Every byte that crosses the boundary gets checked — verify that's actually true.

- [x] **Route-by-route zod coverage:** enumerated every gateway controller. No global `ZodValidationPipe` —
      validation is opt-in per route, but coverage is essentially complete (every JSON `@Body()` route
      `safeParse`s a `shared` schema). The two `unknown` bodies (workflow webhook trigger, inbound receiver)
      are arbitrary-by-design external payloads gated by path-token / provider-HMAC, not gaps. Logged a LOW
      systemic recommendation (add a global pipe or an architecture test) — finding C-3.
- [x] **Injection probes:** **FOUND + FIXED** a HIGH arbitrary-file-read via the media file-serve route
      (`GET /media/:id/file` served client-supplied absolute/`..` paths verbatim) — fix is a shared
      `isSafeMediaFilePath` schema refinement + a serve-time `resolveMediaPath` containment guard (finding C-1).
      FTS5 `MATCH` escaping (tokenized/quoted/param-bound), the Phase 49 import zip (known-key reads, no
      path-based extraction → no zip-slip), and all raw `sql\`\`` usage (no `sql.raw`, all values bound) —
      **verified safe** (findings C-4/C-5/C-6).
- [x] **SSRF surface:** documented (finding C-2, HIGH) — one best-effort `isSafeHttpUrl` guard fronts 4
      fetch sites (url-context, workflow http node, outbound webhooks, link-metadata proxy) but is DNS-blind,
      misses alternate IP encodings/IPv6, and never re-validates redirects. Remediation (resolve-then-check +
      IP-pin, redirect revalidation, encoding normalization) is a feature in its own right → **logged as a
      follow-up theme**, not fixed here (per the iteration's scoping decision).
- [x] **Report:** [`todo/phase-60-findings/C-input-validation.md`](phase-60-findings/C-input-validation.md)
      (+ the C-1 quick-win applied with full test coverage).

## Theme D — Dependency & supply-chain audit — **S-M** — ✅ DONE (PR #357, 2026-07-07)

What we ship that we didn't write.

- [x] `pnpm audit` (58 advisories, mostly transitive; many against versions *newer* than installed) + reachability
      triage. **Applied** the one safe, reachable, in-range bump — `ws` 8.18→8.21 (HIGH DoS, gateway WS), tests
      green. **Documented as follow-ups** (major bumps, out of [S] scope): `drizzle-orm` 0.36→0.45 (HIGH
      SQL-injection, reachable — mitigated by Theme C confirming no raw-`sql` interpolation), the Nest 10→11 /
      Fastify 4→5 stack (HIGH/CRIT, framework migration), `electron` (desktop-only), and dev/build-only advisories
      (esbuild/vitest-UI/webpack/tar/tmp/picomatch/js-yaml). Noted `glob` CLI advisory as **unreachable** (library
      API, not the `-c` CLI). A workspace-wide `pnpm update -r` was attempted but reverted — it regressed
      `site:typecheck` and produced unreviewable churn.
- [x] **Secrets:** no tracked `.env` (only `.example`), zero key/token pattern matches in tracked source, nothing
      credential-shaped ever committed to git history. **Lockfile:** 117 direct deps, none typosquat-shaped.
- [x] **Licenses:** no GPL/AGPL/SSPL/BUSL (copyleft) packages in the installed tree; secrets sourced from env, not
      committed.
- [x] **Report:** [`todo/phase-60-findings/D-supply-chain.md`](phase-60-findings/D-supply-chain.md) (+ the `ws`
      bump applied).

---

# Section II — Bugs & Correctness

## Theme E — State-machine, scheduler & concurrency correctness — **M-L** — ✅ DONE (PR #357, 2026-07-07)

The autonomous core: transitions, ticks, and races.

- [x] **Task state machine: FOUND + FIXED (2 HIGH + 2 MED).** The machine had no transition table/guard —
      `updateStatus` (and a board drag through it) committed any edge, incl. terminal→active revivals
      (`done`→`wip` zombie, `done`→`todo` dup PR, `abandoned`→`todo` archived-but-scheduled), and late
      Notification/Stop hooks revived `done`/`abandoned`→`waiting`/`done`. **Fix:** centralized
      `ALLOWED_TRANSITIONS` + `canTransition` + `isTerminal` in `shared/src/task.ts` (terminals have no
      outgoing edges), enforced in `updateStatus` (throws) + terminal-guards on `markWaiting`/`escalate`/
      `markDone`, with shared + gateway regression tests (findings SM-1..4).
- [x] **Scheduler races: DOCUMENTED (1 HIGH + 2 MED).** Slots/runs are keyed by `taskId` with no run
      generation, so `completeWithChecks`' slow `await checks.run` races a reclaimer → double-spawn + slot
      theft, and a stale async `onExit` frees the next run's slot. Fix = a per-run generation token (touches
      the autonomous core → follow-up, per scoping). Verified correct: synchronous idempotent `acquire`, the
      tick `running` guard, sync boot-recovery before the delayed first tick (findings SCHED-1..3).
- [x] **WS ordering (post-56): DOCUMENTED.** Seq allocation is verified synchronous/atomic + per-channel (no
      dup/backwards seq). Real gaps: no **epoch id**, so a stale resume cursor is silently accepted after a
      gateway restart (WS-2 HIGH), and the REST-seed vs. subscribe-watermark window (WS-3 MED). Fixes are
      protocol changes → follow-up.
- [x] **Transaction boundaries: DOCUMENTED (2 HIGH + 2 MED).** `createFromPrompt`/`createTasksFromBreakdown`
      (+ `createCouncil`/`createProject`) write across tables non-atomically (domain services lack a DB handle);
      a mid-write throw half-applies. Verified correct: Phase 49 import, `deleteTask`, workflow/council deletes
      are transactional; `createBulk` is intentionally partial-success. Fix = service DB handle / transactional
      repo methods → follow-up (findings TX-1..4).
- [x] **Report:** [`todo/phase-60-findings/E-state-concurrency.md`](phase-60-findings/E-state-concurrency.md)
      (+ the state-machine guard applied with regression tests).

## Theme F — Data integrity & boundary-condition bugs — **M** — ✅ DONE (PR #365, 2026-07-08)

The edges: nulls, empties, orphans, off-by-ones.

- [x] **Referential integrity: FOUND + FIXED 2 HIGH + 1 LOW.** `deleteProject` left `media.projectId` dangling
      (stranded media) and orphaned its milestones + tasks' `milestoneId` (phantom chip) — now cascade-cleaned
      in the delete tx (RI-1/2). `deleteWorkflow` leaked `workflow_storage` — now deleted (RI-7). Documented:
      repo delete/rename orphans `task.repo` by-name → wrong cwd/skipped checks (RI-3/4/8, HIGH, needs a
      cross-domain cascade + cascade-vs-409 call); `setProject` no existence check (RI-5); promoted-idea
      back-ref (RI-6).
- [x] **Pagination: FIXED.** All 5 offset-paginated `ORDER BY`s (tasks/ideas/audit/approval-log/notifications)
      lacked a unique `id` tiebreaker → dup/skip at a page edge on `createdAt` ties. Added the tiebreaker
      everywhere (PG-2..5). notifications' mutable `readAt` sort key + missing `total` documented as a keyset
      follow-up (PG-1). Verified: all endpoints cap `limit`, `total` matches the `where`.
- [x] **Time & ordering: FIXED the scheduler tie (TO-1).** `listReadyTodoTasks` shared the tiebreaker-less
      ordering → nondeterministic pick / starvation on `priority`+`createdAt` ties; the `id` tiebreaker fixes it.
      Verified safe: `nextRetryAt <= now` (UTC-ISO both sides), `projectCompletion` div-by-zero guard. Timezone/
      monotonicity sweep + null/empty sweep partially done (agents interrupted) — logged as a follow-up.
- [x] **Report:** [`todo/phase-60-findings/F-data-integrity.md`](phase-60-findings/F-data-integrity.md) (+ the
      RI-1/2/7 + PG/TO fixes applied with real-SQLite regression tests).

## Theme G — Error handling & failure-path correctness — **M** — ✅ DONE (PR #369, 2026-07-09)

What happens when things go wrong — on purpose and by accident. **13 findings, no P0** — the
codebase is broadly disciplined (crypto/HMAC/tokens fail-closed, scheduler gates fail-safe,
CLI/web API-error surfacing solid); the real gaps are two robustness bugs + one new fail-open.

- [x] **Swallowed errors:** **SW-1 (P1)** — `void completeWithChecks(...)` fired with no `.catch`
      and no internal try/catch (`pool/lifecycle-hook.controller.ts:65`, `agent-runner.service.ts:291`)
      → unhandled rejection + mitigated slot leak. **SW-2 (P1)** — no process-level
      `unhandledRejection`/`uncaughtException` handler at the gateway boundary. **SW-3 (P2)** —
      `HeartbeatScheduler.tick()` reads the DB before its guard. **SW-4 (P3)** — CLI `readAuth`
      swallows a corrupt auth file as "logged out". Everything else (dispatch/subscriber/WS-send/
      JSON-fallback catches) verified as intentional + logged.
- [x] **Fail-open vs fail-closed:** **FO-1 (P1, = A-1)** — static bearer token fails RBAC **open**
      (unset `req.user` → `RoleGuard` returns true); confirmed still live. **FO-2 (P2, new)** —
      approval decision path throws (unguarded `evaluate()` + `JSON.parse(rule.match)`) → gateway 500
      → PreToolUse hook fails open to `ask`, bypassing the blast-radius floor. **FO-3/FO-4 (P3)** —
      `onNoSubscriber` default `ask`; owner-less resources owned-by-everyone. Crypto/HMAC/token +
      scheduler gates verified fail-closed/fail-safe.
- [x] **Boundary error surfacing:** **ES-1 (P2)** — no global exception filter → latent
      500-where-4xx regression class. **ES-2 (P3)** — upstream outages surface as 500 not 502/503.
      **ES-3 (P3)** — inconsistent 400-vs-409 for uniqueness conflicts. **ES-4 (P3)** — web has no
      App Router error boundary. **ES-5 (P3)** — board silently swallows a failed task-detail fetch.
      Zod→400, Nest default no-stack-leak, domain-error mapping, bulk partial-success, CLI/web
      surfacing all verified correct.
- [x] **Report:** [`todo/phase-60-findings/G-error-handling.md`](phase-60-findings/G-error-handling.md)
      — ranked P1→P3 with evidence + a Theme-M backlog (SW-2 + ES-1 are the high-leverage
      convention-at-the-boundary fixes).

---

# Section III — UI/UX (direction-preserving)

> The product's look + direction are **liked as-is** — these themes hunt for the *overlooked*, never a
> redesign. Every UX finding is "this is missing/inconsistent/inaccessible," not "change the approach."

## Theme H — Consistency & flow sweep — **M** — ✅ DONE (PR #373, 2026-07-09)

The overlooked few things, made systematic. **15 findings, one P1, no P0** — from a **live
18-screenshot state capture** (each surface driven into empty/error/loading against the real e2e
gateway) + two static sweeps. Systemic: the shared `useApiData` list path collapses
loading/empty/error into one "empty" render (+toast). *(Capturing states first required fixing a
#370 gateway-boot cycle — landed as PR #371.)*

- [x] **State coverage matrix:** **SM-1 (P2, systemic)** — `error≈empty`: board/sessions/projects/
      workflows render their empty state + a transient toast on a 500 (dup-creation risk). **SM-2
      (P2)** — `loading≈empty`: no surface reads `useApiData`'s `loading` flag; **zero skeleton
      components** exist. **SM-3 (P2)** — toast-only errors, no inline retry. **SM-4** — slides/settings
      are local so a backend outage shows no signal (informational). Search is the reference (proper
      loading/empty/error machine).
- [x] **Interaction consistency:** **IC-1 (P1)** — Ideas detail dead-ends (no back-link on error;
      **infinite "Loading…"** on a deleted id). **IC-2 (P2)** — councils/workflows-edit/team-detail
      not-found without a back-link (team-detail renders blank). **IC-3 (P2)** — Ideas delete uses
      `window.confirm` (lone bypass of the shared `useConfirm()`). **IC-4 (P2)** — bulk-delete family
      (projects/workflows/councils/memory) silent — no toast/rollback. **IC-5 (P2)** — Ideas create/
      save mutate silently. **IC-6 (P3)** — optimistic-vs-await drift.
- [x] **Copy & affordance:** **CA-1 (P2)** — "New {noun}" (10 surfaces) vs "Add {noun}" (3 settings).
      **CA-2 (P2)** — disabled primary actions don't say why (`disabledHint` exists only in councils).
      **CA-3/CA-4/CA-5 (P3)** — search-placeholder ellipsis, delete-irreversibility copy, empty-state
      tier. No P1 affordance gap (icon-only buttons all labelled).
- [x] **Report:** [`todo/phase-60-findings/H-consistency-flow.md`](phase-60-findings/H-consistency-flow.md)
      — matrix + 15 ranked findings + a Theme-M backlog (three shared components — `<QueryState>`,
      `<NotFoundState>`, `runMutation` — close most of the theme). Cross-refs G ES-4/ES-5.

## Theme I — Accessibility & keyboard navigation — **M-L** — ✅ DONE (PR #374, 2026-07-09)

Usable without a mouse, legible to assistive tech. *(This slice deviated from analysis-only, approved
upfront: it applied the trivial ARIA quick-wins + promoted the design-system axe gate + added the
missing axe/keyboard story coverage; visual/systemic items — token contrast, a shared modal
focus-trap, a board `KeyboardSensor` — are documented for a remediation phase.)*

- [x] **`@midnite/ui` primitives:** audited + **fixed** the hand-rolled primitives — `Tabs` gained the
      WAI-ARIA roving-tabindex + arrow/Home/End keyboard model, `Accordion` wires `aria-controls`→a
      labelled region, `Collapse` marks collapsed content `inert`; the `@storybook/addon-a11y` axe gate
      was `test:'todo'` (never failed CI) → **promoted to `error`** (surfacing + fixing unlabelled
      input/textarea stories), with new keyboard/disclosure play-fns. (PR #374)
- [x] **Complex web interactions:** command palette rebuilt as a proper **combobox+listbox**
      (`aria-activedescendant`, `role=option`/`aria-selected`) with a Playwright probe; `ConfirmDialog`
      got a focus-trap + return-focus (exemplar); `media-type-picker`/`approvals-drawer` gained
      `aria-modal`. dnd-kit board keyboard-drag gap + the systemic per-dialog focus-trap documented. (PR #374)
- [x] **Global:** a WCAG **token contrast script** ([`packages/ui/scripts/contrast-audit.mjs`](../packages/ui/scripts/contrast-audit.mjs))
      computes every pair in both themes — found `destructive` (3.60:1) + `success` (3.37:1) fail AA
      normal-text (documented for a token pass); everything else passes. (PR #374)
- [x] **Report:** [`todo/phase-60-findings/I-accessibility.md`](phase-60-findings/I-accessibility.md)
      — 12 findings (7 fixed inline, 5 documented), ranked, each with evidence + a remediation backlog. (PR #374)

## Theme J — Mobile & responsive polish — **M** — ✅ DONE (PR #387, 2026-07-10)

The small-screen + PWA paths.

- [x] **Reflow audit** at the [`lib/breakpoints.ts`](../packages/web/lib/breakpoints.ts) cutoffs: the board on
      mobile (horizontal snap-scroll — does it work one-handed?), the cockpit panels (51/55 drawer vs. rail),
      the diff viewer (52) + slides (48) on a phone, tables that overflow (do they scroll in their own container
      per CLAUDE.md, or break the page?).
- [x] **Touch & PWA:** touch-target sizes (≥44px), the installed-PWA chrome (P24), safe-area insets vs. the mobile
      tab bar, no horizontal body scroll anywhere; xterm terminal read-only-on-touch behaves.
- [x] **JS vs CSS cutoffs:** confirm branch-on-viewport code uses the `useMediaQuery`/`useIsMobile` hooks (not
      hand-written widths) so CSS + JS agree (CLAUDE.md).
- [x] **Report:** [`todo/phase-60-findings/J-mobile-responsive.md`](phase-60-findings/J-mobile-responsive.md) —
      6 findings; J1–J5 (horizontal overflow ×4 + settings tables clip) fixed inline under the quick-win rule,
      locked by [`mobile-audit.shots.ts`](../packages/web/e2e/mobile-audit.shots.ts); J6 (sub-44px secondary
      touch targets) left as a follow-up.

---

# Section IV — Monorepo Hygiene (CLI · docs · site · ui · shared)

## Theme K — CLI robustness & coverage — **M** — ✅ DONE (PR #376, 2026-07-09)

The 35-command client, made trustworthy. Tracker drift: the grounding's "untested clusters" were
mostly already covered — the one real hole was **export/import**, now closed. Deliverable = the
tests + two small fixes; report in [`K-cli.md`](phase-60-findings/K-cli.md).

- [x] **Test the untested clusters (K-1):** bulk/guardrails/search/workflow/template/doctor/completions/
      ws/client already had specs; **export/import** did not. Extracted the pure logic into
      [`cli/src/portability.ts`](../packages/cli/src/portability.ts) (the `bulk.ts`/`search.ts` pure-helper
      pattern) + **15 tests** — `--mode` validation throws (no silent default), domain parse, preview/result
      render. Byte-identical command output.
- [x] **Consistency (K-6):** exit codes verified sound (top-level `.catch` → `exit(1)`; bulk/doctor/check set
      granular codes); `--json` threaded through ~59 sites incl. table commands. Deeper per-command `--json`-shape
      audit + help examples documented as a copy-only follow-up — no concrete gap found in the commands read.
- [x] **CI ergonomics (K-2):** added **`MIDNITE_TOKEN`** (the documented name) via `envToken()`, keeping
      `MIDNITE_AUTH_TOKEN` as a back-compat alias; precedence **stored JWT > env > `--token`** documented + tested.
- [x] **Boundary smell (K-4):** the lone `@midnite/gateway/bootstrap` import is the **sanctioned `serve`
      in-process boot** (public package entry, `serve`-only) — **confirmed OK**, not a violation.
- [x] **Report:** [`todo/phase-60-findings/K-cli.md`](phase-60-findings/K-cli.md) — coverage map, the applied
      fixes (incl. Theme G **SW-4** corrupt-auth warn), and the inline-command coverage follow-up (K-5).

## Theme L — Docs site, public site & `@midnite/ui` test gap — **M-L** — ✅ DONE (PR #375, 2026-07-09)

Truth-in-documentation + the design-system test hole. *(Deviated from analysis-only, approved: **fixed** the ui
test gap inline; docs authoring + site refresh stay follow-ups.)*

- [x] **Docs staleness:** inventoried — `@midnite/docs` isn't design-system-*only* (Phase 26 D surfaces repo
      developer markdown via `product-docs.tsx`), but there are **no user-facing product docs** (DOCS-2), 5 of 10
      primitives lack an MDX page (DOCS-3), and getting-started is UI-only (DOCS-4). **IA proposed + settled with
      the user (Decision §3): extend `@midnite/docs` with a product section, made the primary public-facing focus.** (PR #375)
- [x] **Public site accuracy:** links HTTP-probed — the **"Docs" nav link 404s** (DOCS-1); GitHub/releases/web-app
      + all anchors/legal verified live; feature copy is accurate but undersells the shipped surface (SITE-1). (PR #375)
- [x] **`@midnite/ui` test gap:** **FIXED** — added behavioral `play`-fn tests for the untested primitives
      (button/switch/select/styled-select/input/textarea; `ui:test` 46→54), and **verified `web/components/ui/`
      are pure re-export shims (no drift)** (UI-1, BND-1). (PR #375)
- [x] **Report:** [`todo/phase-60-findings/L-docs-site-ui.md`](phase-60-findings/L-docs-site-ui.md) — 7 findings
      (2 fixed, 5 documented), ranked, + the product-led docs IA + a remediation backlog. (PR #375)

---

# Section V — Synthesis

## Theme M — Cross-cutting synthesis & remediation backlog — **M**

Turn twelve reports into one plan. **Runs last.**

- [ ] Merge all `todo/phase-60-findings/*.md` into a single **ranked master list** (P0→P3, deduped, with the
      owning package/theme) — `todo/phase-60-findings/M-summary.md`.
- [ ] Identify **cross-cutting patterns** (a class of bug appearing in N places > a one-off) and call them out as
      systemic findings worth a dedicated fix.
- [ ] Propose the **follow-up remediation phases** the findings imply (e.g. "Phase 61 — Security enforcement (rate
      limits + headers)", "Phase 62 — a11y remediation", "Docs authoring") with rough sizing, so `/exec` has a
      clear next-step queue. **Recommend, don't create** the phases.
- [ ] **Report:** `todo/phase-60-findings/M-summary.md` — the executive read for the whole audit.

---

## Files this phase touches (map)

- **New:** [`todo/phase-60-findings/`](phase-60-findings/) — one report per theme (`A-security-auth.md` …
  `L-docs-site-ui.md`) + `M-summary.md`, all using the findings template above. **This is the primary output.**
- **Read-only audit targets** (no changes except the quick-win rules): the gateway
  ([`auth/`](../packages/gateway/src/auth/), [`crypto/`](../packages/gateway/src/crypto/),
  [`search/`](../packages/gateway/src/search/), [`agent/url-context.service.ts`](../packages/gateway/src/agent/url-context.service.ts),
  [`bootstrap.ts`](../packages/gateway/src/bootstrap.ts), the pool + tasks services), the web app
  (board, cockpits, dialogs, [`lib/breakpoints.ts`](../packages/web/lib/breakpoints.ts)), the
  [`cli/`](../packages/cli/src/), [`docs/`](../packages/docs/), [`ui/`](../packages/ui/src/), and
  [`shared/`](../packages/shared/src/) packages.
- **Quick-win edits only** (Section I §High+S, Theme D safe bumps, Theme K tests): the specific files a finding
  names — each landed as its own small `/exec` slice, referenced from the finding.
- **Reuse:** the findings template + severity scale is the single reporting contract across all themes.

---

## Verification

- [ ] Every theme A–L produced a `todo/phase-60-findings/<letter>-*.md` using the shared template; **no finding
      lacks evidence** (`file:line`, a repro, or a failing probe) — vibes-only findings are rejected.
- [ ] Stale-claim discipline held: any suspected gap already closed by Phases 50–57 was **re-verified against
      `main`** and dropped (not reported as if still broken).
- [ ] **Security section:** the perimeter (rate-limit posture, headers/CORS, token lifecycle), secrets/signatures,
      input-validation/zod coverage, injection/SSRF/zip-slip, and supply-chain are each covered; **quick wins**
      applied are limited to severity ≥ High **and** effort S, each with tests green.
- [ ] **Bugs section:** state-machine/scheduler/concurrency, data-integrity/boundaries, and error-handling each
      have a report with at least the high-severity items backed by a concrete repro or probe.
- [ ] **UX section:** the state-coverage matrix, an a11y/keyboard pass (incl. the hand-rolled `@midnite/ui`
      primitives + dnd-kit board), and a mobile/responsive pass are complete — **direction-preserving** (no
      finding proposes a redesign; each is a gap/inconsistency/omission).
- [ ] **Monorepo section:** CLI untested clusters have findings **and** the tests to cover them; docs/public-site
      staleness is inventoried with a proposed IA; the `@midnite/ui` unit-test gap + web re-export boundary are reported.
- [ ] **Theme M** merged everything into a ranked `M-summary.md` + proposed follow-up remediation phases.
- [ ] Any quick-win/test edits keep `moon run :typecheck` · `:lint` · `:test` green; **no schema changes, no new
      runtime deps** (analysis only); web tests run from the primary checkout, not a `.git` worktree.

---

## Decisions / open questions

1. **Findings-report mode, not a fix pass** *(settled).* Each theme analyzes + documents; remediation is deferred
   to follow-up phases Theme M proposes. Two narrow exceptions: Section I security **quick wins** (severity ≥ High
   **and** effort S) and Theme D **safe dependency bumps** (patch/minor, tests green) — everything else is a finding.
2. **Findings live in `todo/phase-60-findings/`** *(settled).* One markdown report per theme + an `M-summary.md`
   roll-up, colocated with the phase doc (not under `docs/`), so `/exec` and the trackers see them together.
3. **Docs strategy is a finding, not a decision made here** *(open — recommend).* The docs site is a pure
   `@midnite/ui` consumer (boundary-enforced); product docs (sessions/workflows/guardrails) have no home. Theme L
   *proposes* the IA (extend `docs` with a product section vs. a separate product-docs surface); **authoring the
   docs is a follow-up phase**, keeping Phase 60 analysis-only.
4. **Direction-preserving UX** *(settled).* Every UX finding is an overlooked gap/inconsistency/a11y issue — never
   "change the approach." The look + flows are liked as-is.
5. **Re-verify against `main` before reporting** *(settled).* Phases 50–57 moved fast and closed many known gaps;
   a finding based on a stale grounding must be re-checked on current `main` and dropped if fixed.
6. **Severity scale P0–P3 + effort S/M/L** *(settled).* One shared template + ranking across all reports so Theme M
   can merge them into a single prioritized backlog.
7. **Theme independence** *(settled).* Sections/themes are read-only (bar the quick-win rules), so they run in any
   order / in parallel as separate `/exec` slices; **M runs last**, after every report exists.
8. **Fable-scale thinking, Opus-executable slices** *(settled).* The audit *breadth* is ambitious, but each theme is
   a bounded, self-contained slice (named files, concrete greps/probes, a single report) so Opus 4.8 can execute one
   to completion in a run — the deep-thinking is in the analysis, not in cross-theme coordination.