# Phase 60 Theme M — Cross-cutting synthesis & remediation backlog

**Date:** 2026-07-11 · **Scope:** merge Themes A–L into one ranked, deduplicated master list + name the follow-up remediation phases the findings imply · **Method:** read all twelve `todo/phase-60-findings/*.md` reports, normalized their severities to the shared P0–P3 scale, collapsed cross-referenced duplicates into one canonical entry, and grouped every finding under the remediation phase that would fix it (severity-sorted within each group). **Runs last** — every A–L report exists.

> **This is the executive read for the whole audit.** The master list below is grouped by *proposed remediation phase* (Decision: "by proposed remediation phase") rather than flat P0→P3, so each group maps directly to a schedulable `/exec` slice; a severity roll-up table gives the triage view. Duplicates (e.g. A-1 = FO-1, A-7 = B-6, G SW-4 = K-3) are merged into a single canonical row that lists every source ref. **Recommend, don't create** — the phases below are proposals with rough sizing, not new phase docs.

---

## Executive summary

Twelve audit themes swept the whole product — the gateway perimeter, secrets/crypto, input validation, dependencies, the state-machine/scheduler/concurrency core, data integrity, error paths, UI state/flow, accessibility, mobile, the CLI, and the docs/site/ui packages.

- **No P0.** Nothing is remotely-exploitable-unauthenticated or silently data-losing on current `main`. The codebase is broadly disciplined: crypto/HMAC/token machinery is uniformly fail-**closed**, the scheduler's kill-switch/spend-cap/readiness gates fail-**safe**, and CLI/web API-error surfacing is solid.
- **~30 fixes already landed inline** during the audit (security quick-wins + the state-machine guard + data-integrity cascades/tiebreakers + a11y ARIA wins + mobile overflow fixes + CLI/ui test gaps). See [Fixed during Phase 60](#fixed-during-phase-60).
- **The open backlog is real but bounded.** The highest-leverage items cluster into a handful of *convention-at-the-boundary* fixes (a process-level rejection handler, a domain→HTTP exception filter, a scheduler run-generation token, a shared `<QueryState>`/`<NotFoundState>`/`runMutation` web trio) that each neutralize a whole class of latent failure.
- **The two standout security decisions** are both **A-1/FO-1** (the static bearer token fails RBAC *open*) and **B-2** (spawn-env scrub default-off hands agents the master key) — each a one-to-few-line change gated on a threat-model call, not a mechanical fix.

### Severity roll-up (all findings)

| Severity | Fixed in P60 | Open | Total |
|----------|-------------|------|-------|
| **P0** | 0 | 0 | 0 |
| **P1** (real bug / serious gap) | 9 | 13 | 22 |
| **P2** (quality / consistency) | 14 | 28 | 42 |
| **P3** (nice-to-have) | 3 | 24 | 27 |
| **Totals** | **26** | **65** | **91** |

*(Counts treat merged duplicates as one finding and exclude the ~20 "verified safe / verified clean" call-outs that were confirmed non-issues. "Fixed in P60" = landed inline under the quick-win / Theme-deliverable rules; "Open" = documented for a follow-up.)*

---

## Fixed during Phase 60

Landed inline under the Section-I security quick-win rule (severity ≥ High **and** effort S), the Theme-D safe-bump rule, or a theme's explicit test/fix deliverable — each with tests:

- **Security:** A-3 baseline security headers (`nosniff`/`X-Frame-Options`/`Referrer-Policy`); A-7 (= B-6) terminal token constant-time compare; B-1 workflow `$env` master-secret leak closed; B-7 stale plaintext schema comment; **C-1 media-serve arbitrary-file-read** (schema refinement + serve-time containment).
- **State machine:** E SM-1..4 — centralized `ALLOWED_TRANSITIONS`/`canTransition`/`isTerminal` in `shared`, terminal-revival edges rejected, late-hook revival no-op'd (2 HIGH + 2 MED at one seam).
- **Data integrity:** F RI-1/2 project-delete cascade (media + milestones + tasks' `milestoneId`); RI-7 workflow-storage cleanup; PG-2..5 + TO-1 unique `id` tiebreaker on all five offset-paginated `ORDER BY`s **and** the scheduler ready-set.
- **Dependencies:** `ws` 8.18→8.21 (HIGH DoS, reachable, in-range).
- **Accessibility:** I A11Y-1..7 — `Tabs` roving-tabindex keyboard model, `Collapse` `inert`, palette combobox/listbox, `Accordion` region association, two modals' `aria-modal`, `ConfirmDialog` focus-trap exemplar, axe story gate `todo`→`error`.
- **Mobile:** J J1..J5 — horizontal-overflow fixes on `/projects`, `/ops`, `/schedules`, `/workflows` + settings-table scroll, locked by a shots spec.
- **CLI:** K K-1 export/import extracted + 15 tests; K-2 `MIDNITE_TOKEN` env fallback; K-3 (= G SW-4) corrupt-auth-file warn.
- **UI library:** L UI-1 — 8 behavioral `play`-fn tests for the untested primitives (`ui:test` 46→54).

---

## Master remediation backlog (grouped by proposed phase)

Severity within each group is descending. **Status:** `📋` documented (open) · `✅` fixed in P60 · `◐` partially fixed. **Src** names the origin theme(s); a merged duplicate lists all refs.

### Group 1 — Security enforcement & hardening

The perimeter + secrets + SSRF. The two P1 decisions here are the audit's highest-severity open items.

| ID | Sev | Finding | Status | Effort | Src |
|----|-----|---------|--------|--------|-----|
| **A-1** / FO-1 | P1 | Static bearer token bypasses **all** `@RequiresRole` — unset `req.user` → `RoleGuard` fails **open**; remotely reachable on a non-loopback bind (also cross-team service-token leak) | 📋 | M | A, G |
| **A-2** | P1 | No per-account login lockout/backoff → `POST /auth/login` brute-forceable | 📋 | M | A |
| **B-2** | P1 | Spawn-env scrub default-**off** → every spawned agent inherits `MIDNITE_SECRET_KEY`/JWT/auth token | 📋 | S* | B |
| **C-2** | P1 | SSRF: one DNS-blind guard fronts 4 outbound-fetch sites; misses alt IP encodings/IPv6, never re-validates redirects | 📋 | L | C |
| **FO-2** | P2 | Approval decision path throws (unguarded `evaluate()` + `JSON.parse(rule.match)`) → gateway 500 → PreToolUse hook fails **open to `ask`**, bypassing the blast-radius floor on unattended agents | 📋 | M | G |
| **A-4** | P2 | Rate-limit guard default-off (`max: 0`) — inert out of the box | 📋 | S* | A |
| **A-5** | P2 | Service tokens carry no scopes → a CI/script key acts with full creator role | 📋 | M | A |
| **A-6** | P2 | No refresh-token reuse detection / family revocation on replay | 📋 | S–M | A |
| **B-3** | P2 | Webhook + inbound-source HMAC secrets fall back to **plaintext-at-rest** when `MIDNITE_SECRET_KEY` unset (fail-open) | 📋 | S | B |
| **FO-4** | P3 | `isOwner` treats owner-less resources as owned-by-everyone → admin-promotion doesn't bite for null-`createdBy` rows | 📋 | S | G |
| **FO-3** | P3 | `onNoSubscriber` defaults to `ask` (vs `onTimeout`=`deny`) for an escalate verdict with no viewer | 📋 | S | G |
| **A-8** | P3 | Terminal token map: no active TTL sweep (lazy cleanup only) | 📋 | S | A |
| **A-9** | P3 | `refresh_tokens.deleteExpired` is dead code → stale hashed-credential rows accumulate | 📋 | S | A |
| **B-4** | P3 | `team_invites.token` stored plaintext (every other bearer token is hashed) | 📋 | S | B |
| **B-5** | P3 | OAuth token-exchange error-response **body** logged at error level | 📋 | S | B |

\* *S in code, but a behavior-changing default flip → needs an operator/threat-model decision, not a silent quick-win.*

### Group 2 — Core correctness: state, scheduler, concurrency & transactions

The autonomous core's races + non-atomic writes + cross-domain referential integrity.

| ID | Sev | Finding | Status | Effort | Src |
|----|-----|---------|--------|--------|-----|
| **SCHED-1** (+2/3) | P1 | `completeWithChecks`' slow `await checks.run` races a reclaimer → double-spawn + slot theft; stale `onExit` frees the next run's slot (no run generation) | 📋 | M–L | E |
| **TX-1** | P1 | `createFromPrompt` writes task+edges+attachments+event non-atomically → half-applied task, no `task.created` broadcast | 📋 | M | E |
| **TX-2** | P1 | `createTasksFromBreakdown` builds a dependency graph non-atomically → partially-wired DAG | 📋 | M | E |
| **WS-2** | P1 | No epoch id → a stale resume cursor is silently accepted after a gateway restart (board stays stale) | 📋 | M | E |
| **RI-3/4/8** | P1 | Repo delete/rename orphans `task.repo` (by-name) → agent spawns in wrong cwd, checks silently skipped, phantom chip; dangling `phaseDocSyncRepoId` throws | 📋 | M | F |
| **TX-3/4** | P2 | `createCouncil` / `createProject` half-seed on a mid-write throw | 📋 | M | E |
| **RI-5** | P2 | `setProject` accepts a non-existent `projectId` (no existence check; circular-dep hazard) | 📋 | S–M | F |
| **RI-6** | P2 | `deleteProject` leaves promoted `idea.projectId` dangling + idea stuck `promoted` | 📋 | S–M | F |
| **PG-1** | P2 | Notifications feed: mutable `readAt` sort key + offset + no filtered `total` → needs keyset | ◐ | M | F |
| **WS-3** | P2 | REST snapshot vs. subscribe-watermark window → a then-idle channel stays stale | 📋 | S–M | E |
| **SCHED-2/3** | P2 | Auto-fix respawn assumes slot ownership; kill→async `onExit` releases the next run's slot (both closed by the SCHED-1 generation token) | 📋 | — | E |
| **SM-5** | P3 | `completeWithChecks` not idempotent → duplicate `checks.*` events/rows on repeated Stop | 📋 | S | E |
| **WS-5** | P3 | Client advances cursor across a skipped seq — no positive gap detection | 📋 | S | E |
| **WS-6** | P3 | Per-process in-memory seq/ring → mismatched watermark under horizontal scaling | 📋 | — | E |
| **NE/TO** | P3 | Unfinished sweeps: null/empty on render/serialize paths (empty graph, zero-slide deck, huge-diff tokenizer, unicode `.slice`) + timezone/monotonicity assumptions | 📋 | M | F |

### Group 3 — Error-boundary hardening

The two most valuable fixes are both *convention-at-the-boundary* changes that convert a scattered latent-failure class into one enforced default.

| ID | Sev | Finding | Status | Effort | Src |
|----|-----|---------|--------|--------|-----|
| **SW-2** | P1 | No process-level `unhandledRejection`/`uncaughtException` handler → a reachable rejection has no backstop (Node default = terminate) | 📋 | S | G |
| **SW-1** | P1 | Unguarded `void completeWithChecks(...)` (no `.catch`, no internal try/catch) → unhandled rejection + mitigated slot leak | 📋 | S | G |
| **SW-3** | P2 | `HeartbeatScheduler.tick()` reads the DB before its guard → a DB throw rejects the interval callback | 📋 | S | G |
| **ES-1** | P2 | No global exception filter — ~40 per-controller `if (err instanceof …)` lines; a new/omitted map silently returns 500-where-4xx (regression class) | 📋 | M | G |
| **ES-2** | P3 | Upstream-provider outages surface as **500** (should be 502/503) + echo raw upstream message | 📋 | S | G |
| **ES-3** | P3 | Uniqueness conflicts inconsistent: user/template → 400, repo/council → 409 (folds into ES-1's convention filter) | 📋 | S | G |
| **ES-4** | P3 | Web App Router has no `error.tsx`/`global-error.tsx` → bare "Application error" on a non-query render throw | 📋 | S | G, H |
| **ES-5** | P3 | Board silently swallows a failed task-detail fetch (`.catch(() => setSelected(null))`) — no toast | 📋 | S | G, H |

### Group 4 — Web state & flow consistency

The `useApiData` list path collapses loading/empty/error into one render; a shared component trio closes most of it. Direction-preserving — every item extends an existing spine (`useConfirm`/`useToast`/`EmptyState`).

| ID | Sev | Finding | Status | Effort | Src |
|----|-----|---------|--------|--------|-----|
| **IC-1** | P1 | Ideas detail dead-ends: bare error text with **no back-link**; a deleted/unknown id renders **"Loading…" forever** | 📋 | S | H |
| **H-SM-1** | P2 | `error≈empty` (systemic): board/sessions/projects/workflows render their empty state + a transient toast on a 500 (dup-creation risk) | 📋 | M | H |
| **H-SM-2** | P2 | `loading≈empty` (systemic): no surface reads `useApiData`'s `loading` flag; **zero skeleton components** exist | 📋 | M | H |
| **H-SM-3** | P2 | Errors are toast-only, no inline retry (Search alone has inline error, still no Retry) | 📋 | S | H |
| **IC-2** | P2 | Councils/workflows-edit/team-detail not-found without a back-link (team-detail renders blank via `return null`) | 📋 | S–M | H |
| **IC-3** | P2 | Ideas delete uses `window.confirm` — the lone bypass of the shared `useConfirm()` | 📋 | S | H |
| **IC-4** | P2 | Bulk-delete family (projects/workflows/councils/memory) silent — no toast/rollback | 📋 | M | H |
| **IC-5** | P2 | Ideas create/save mutate silently (create swallows its error) | 📋 | S | H |
| **CA-1** | P2 | "New {noun}" (10 surfaces) vs "Add {noun}" (3 settings) for the same create action | 📋 | S | H |
| **CA-2** | P2 | Disabled primary actions don't say why (`disabledHint` exists only in the council composer) | 📋 | M | H |
| **IC-6** | P3 | Optimistic-vs-await inconsistent across list mutations (unified by the `useBulkDelete` wrapper) | 📋 | M | H |
| **CA-3** | P3 | Search-placeholder ellipsis inconsistency (11 vs 3) | 📋 | S | H |
| **CA-4** | P3 | Delete-irreversibility copy diverges 3 ways; some confirms omit it | 📋 | M | H |
| **CA-5** | P3 | Empty-state tier inconsistent (rich `EmptyState` vs bare one-liners vs board's "Nothing here") | 📋 | M | H |
| **H-SM-4** | P3 | Slides/Settings are local → a backend outage shows no signal (informational) | 📋 | — | H |

*Shared components that close most of this group: `<QueryState>` (skeleton/empty/error-with-retry off a `useApiData` result → H-SM-1/2/3), `<NotFoundState backHref>` (→ IC-1/2), `runMutation`/`useBulkDelete` (→ IC-3/4/5/6).*

### Group 5 — Accessibility & responsive remediation

The visual/systemic a11y items I documented rather than applied (direction-affecting) + the one deferred touch-target pass.

| ID | Sev | Finding | Status | Effort | Src |
|----|-----|---------|--------|--------|-----|
| **A11Y-8** | P2 | `destructive-foreground` on `destructive` = **3.60:1** — fails AA 4.5:1 for normal text (both themes) | 📋 | S–M | I |
| **A11Y-9** | P2 | `success-foreground` on `success` = **3.37:1** — fails AA 4.5:1 for normal text (both themes) | 📋 | S–M | I |
| **A11Y-10** | P2 | Focus-trap/return-focus is per-dialog — absent across ~36 `aria-modal` surfaces (needs a shared `useFocusTrap`/`<Modal>`) | 📋 | M | I |
| **A11Y-11** | P2 | dnd-kit board wires no `KeyboardSensor` → no keyboard drag (mitigated by ⌘K move + arrow-nav) | 📋 | M | I |
| **A11Y-12** | P3 | `Tabs`/palette `role=option`→external-panel `aria-controls` wiring is caller-owned | 📋 | S | I |
| **J6** | P3 | Secondary icon buttons render at 28–32px — below the 44px touch target | 📋 | M | J |

### Maintenance tracks (already-known / settled follow-ups, not finding-remediation phases)

Kept out of the five remediation phases because they're upgrades/authoring, not fixes to a documented defect.

| ID | Sev | Item | Status | Effort | Src |
|----|-----|------|--------|--------|-----|
| **D-1** | P1 | `drizzle-orm` 0.36→0.45 (HIGH SQL-injection advisory, reachable; mitigated — Theme C confirmed no raw-`sql` interpolation) | 📋 | M | D |
| **D-2** | P1 | Nest 10→11 / Fastify 4→5 stack (HIGH/CRIT middleware/path-normalization advisories; framework migration) | 📋 | L | D |
| **D-3** | P2 | `electron` desktop advisories (major-version, desktop-only) | 📋 | M | D |
| **D-4** | P3 | Dev/build-only advisories (reconcile `@vitest/coverage-v8@^4`↔`vitest@^3`, then sweep esbuild/webpack/tar/tmp/picomatch/js-yaml/postcss per-package) | 📋 | S–M | D |
| **DOCS-2** | P2 | No user-facing product docs — extend `@midnite/docs` with a product-led section (IA settled with the user, Decision §3) | 📋 | L | L |
| **DOCS-1** | P2 | Public-site "Docs" nav link 404s (point `DOCS_URL` at the real deploy, or hide until it exists) | 📋 | S | L |
| **DOCS-3** | P3 | 5 of 10 ui primitives have no MDX page (accordion/collapse/select/styled-select/textarea) | 📋 | M | L |
| **DOCS-4** | P3 | `getting-started.mdx` covers only the UI-library on-ramp, not the product | 📋 | S | L |
| **SITE-1** | P3 | Public site undersells the shipped surface (advertises the Phase 1–3 MVP; omits workflows/office/slides/ideas/guardrails/cockpits/search/teams) | 📋 | M | L |
| **C-3** | P3 | No global `ZodValidationPipe` — per-route validation is opt-in (coverage complete today; add a pipe or an architecture test to keep it so) | 📋 | M | C |
| **K-5** | P3 | Inline `index.ts` CLI commands have no direct command-level tests (extract incrementally as touched) | 📋 | M | K |
| **K-6** | P3 | Deeper per-command `--json`-shape audit + help examples (no concrete gap found) | 📋 | S | K |
| **C-5 nit** | P3 | Import zip archive buffered fully into memory with no size cap (zip-bomb/large-upload DoS — a resilience nit) | 📋 | S | C |

---

## Cross-cutting systemic patterns

Classes of the same defect appearing in N places — each worth a single shared fix rather than N one-offs:

1. **Fail-open where it should fail-closed (security).** A-1/FO-1 (RBAC skips on unset `req.user`), FO-2 (approval throw → `ask`), FO-4 (owner-less = owned-by-all), B-2/B-3 (secrets default to inheritance/plaintext). The pattern: *"absence of a principal/secret is treated as permission"*. The fix is to make the boundary default to deny/encrypt and require an explicit opt-in for the permissive path.
2. **No convention at the gateway boundary.** SW-2 (no process rejection handler) + ES-1 (no global exception filter) + the ~40 hand-repeated domain→HTTP maps: each latent-failure class is scattered per-call-site with no enforced default. Two small additions (`process.on(...)` + one `DomainExceptionFilter`) convert both classes to log-and-survive / correct-status-by-default.
3. **Run/version identity is missing from stateful keys.** SCHED-1/2/3 (slots keyed by `taskId`, no run generation) and WS-2/WS-6 (no epoch on the seq line) are the same shape — a late async callback acts on a superseded generation. A generation/epoch token closes both.
4. **Non-atomic multi-table writes.** TX-1/2/3/4 all stem from domain services lacking a DB handle (only `PortabilityImportService` has one). One structural change — a transactional repo method / service DB handle — fixes the class.
5. **Cross-domain referential integrity is an unenforced app-layer invariant.** RI-1/2/6/7 (project/workflow deletes) + RI-3/4/8 (repo by-name refs): with no cross-domain FKs, every delete/rename must remember to cascade, and several didn't. A delete-cascade convention (or an audited checklist per delete path) is the systemic answer.
6. **The web three-state render collapses to one.** H-SM-1/2/3 across every `useApiData` surface: loading + empty + error all render "empty". One `<QueryState>` wrapper is the systemic fix (plus `<NotFoundState>` and `runMutation` for the flow siblings).
7. **Design-system a11y is per-component, not shared.** A11Y-6 fixed one dialog's focus-trap; A11Y-10 shows ~36 more need it. A shared `useFocusTrap`/`<Modal>` primitive is the systemic close.

---

## Proposed follow-up remediation phases (recommend, don't create)

Five finding-remediation phases + the maintenance tracks. Sizing is rough; each is a coherent, independently-shippable `/exec` scope.

1. **Security enforcement & hardening** — **L.** Group 1. Lead with the two P1 decisions (A-1/FO-1 static-token RBAC, B-2 spawn-env scrub) since both need a threat-model call; then A-2 login lockout, C-2 SSRF wrapper (a feature in its own right — could split out), FO-2 fail-closed approval floor, and the P2/P3 token-lifecycle + secret-at-rest hardening. *Re-verify the Theme A perimeter checks after.*
2. **Core correctness: state, scheduler & transactions** — **L.** Group 2. The single highest-value core fix is the **scheduler run-generation token** (SCHED-1/2/3) with careful tick/watchdog/onExit interleaving tests; then transactional create paths (TX-1..4), the WS epoch id (WS-2/3), and the repo delete/rename cascade (RI-3/4/8). Finish the null/empty + timezone sweeps.
3. **Error-boundary hardening** — **M.** Group 3. The two convention fixes first (SW-2 process rejection handler, ES-1 `DomainExceptionFilter` — the latter folds in ES-3), then SW-1/SW-3 guards and the P3 status-class + web-error-boundary polish.
4. **Web state & flow consistency** — **M.** Group 4. Build the shared trio (`<QueryState>`, `<NotFoundState>`, `runMutation`/`useBulkDelete`) and adopt across board/sessions/projects/workflows/ideas; fix the IC-1 Ideas dead-end first; land the copy/affordance conventions (CA-1..5).
5. **A11y & responsive remediation** — **M.** Group 5. Token-contrast pass (A11Y-8/9, re-run the contrast script as a CI gate), a shared `useFocusTrap`/`<Modal>` (A11Y-10), board `KeyboardSensor` + announcements (A11Y-11), and the mobile touch-target pass (J6).

**Maintenance tracks (parallel, lower-coupling):**

- **Dependency & framework upgrades** — **L.** D-1 drizzle-orm 0.36→0.45 (dedicated bump + full gateway suite), D-2 Nest 10→11 / Fastify 4→5 (framework migration; re-run Theme A after), D-3 electron, D-4 dev-tooling sweep. Each is its own PR with the test gate.
- **Product docs authoring & public-site refresh** — **L.** DOCS-1..4 + SITE-1, building the product-led IA already settled in Theme L / Decision §3. C-3 (global validation pipe / architecture test) and K-5/K-6 (CLI coverage top-up) are small hygiene riders.

---

## Deduplication notes

Merged cross-referenced duplicates (counted once above, all source refs listed):

- **A-1 = FO-1** — the static-bearer-token RBAC fail-open (Theme A found it; Theme G re-verified it still live). Canonical: A-1.
- **A-7 = B-6** — terminal `verifyToken` non-constant-time compare (Themes A + B both flagged; **fixed** as A-7).
- **G SW-4 = K-3** — CLI `readAuth` swallows a corrupt auth file (Theme G documented; **fixed** in Theme K). Canonical status: ✅ fixed.
- **G ES-4/ES-5** also surface in Theme H's cross-references (render-throw + board-swallow counterparts to H's data-error gaps) — listed once under Group 3 with both sources.
- **E TO-1** and **F TO-1** are the same scheduler ready-set tiebreaker (Theme E documented; **fixed** in Theme F). Counted once.
- Naming collision resolved: Theme E `SM-*` = *state machine*; Theme H `SM-*` = *state matrix* — the latter is written `H-SM-*` here.
