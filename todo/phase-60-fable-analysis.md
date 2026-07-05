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

## Theme A — Auth, transport & headers audit — **M**

The perimeter: who can reach what, and what the wire looks like.

- [ ] **Rate limiting posture:** verify [`auth/rate-limit.guard.ts`](../packages/gateway/src/auth/rate-limit.guard.ts)
      is still default-off; enumerate which routes it covers vs. exempts (`/health`, auth paths, the WS
      upgrade, webhook receivers); assess brute-force exposure on `POST /auth/login` + token mint +
      inbound receivers. Recommend per-route defaults (finding), enable any zero-risk default (quick win).
- [ ] **Headers & CORS:** probe a running gateway for security headers (CSP where applicable,
      `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, HSTS posture behind TLS) and audit
      the CORS origin allowlist in [`bootstrap.ts`](../packages/gateway/src/bootstrap.ts) (wildcards?
      null-origin handling? does the WS path enforce the same origin policy?). Missing cheap headers = quick win.
- [ ] **Token & session lifecycle:** audit `refresh_tokens` rotation/revocation (logout invalidates?),
      service-token scoping (Phase 38) + hashing, terminal-token TTL + the passive-cleanup leak
      (grounded earlier in [`terminal.service.ts`](../packages/gateway/src/terminal/terminal.service.ts)),
      and the static-token legacy path (`req.user` unset ⇒ role guard passes — confirm the intended
      loopback-only story holds).
- [ ] **Report:** `todo/phase-60-findings/A-security-auth.md` — ranked findings + quick-wins-applied list.

## Theme B — Secrets, signatures & crypto paths audit — **M**

Everything secret-shaped, end to end.

- [ ] **Inventory encrypted-at-rest columns** (`workflow_credentials.data`, `webhooks.secret`,
      `llm_providers.apiKey`, …) against [`crypto.service.ts`](../packages/gateway/src/crypto/crypto.service.ts)
      usage — flag any secret-bearing column **not** going through `CryptoService` (the earlier grounding
      flagged `llm_providers.apiKey` plaintext-fallback when `MIDNITE_SECRET_KEY` is unset; verify current state).
- [ ] **Signature paths:** verify inbound HMAC (Phase 46 — raw-body verification, `timingSafeEqual`,
      per-source secrets) and outbound signing (Phase 44) haven't regressed; audit the Claude-hook path
      (`x-midnite-hook-secret` per session) for timing-safe compare + secret rotation on reattach.
- [ ] **Leak surface:** grep for secrets in logs (`logger.*` calls that might serialize config/env/credential
      objects), verify the Phase 50 **env scrub** is on by default now or still opt-out, and check
      error responses never echo secrets/stack traces to clients in prod mode.
- [ ] **Report:** `todo/phase-60-findings/B-secrets-signatures.md`.

## Theme C — Input validation & injection sweep — **M**

Every byte that crosses the boundary gets checked — verify that's actually true.

- [ ] **Route-by-route zod coverage:** enumerate every controller route (gateway-wide) and confirm
      body/query/params are zod-parsed against `shared` schemas ("untyped JSON over the wire" is an
      anti-pattern per CLAUDE.md) — list any route accepting `unknown`/raw without a `safeParse` gate.
- [ ] **Injection probes:** FTS5 search-query escaping ([`search/`](../packages/gateway/src/search/) — can a
      crafted query break the MATCH syntax or reach `bm25()` oddly?); **path traversal** in attachment/media
      upload+serve paths and the Phase 49 **import archive** (zip-slip: entry names with `../`); SQL is
      Drizzle-parameterized — verify no raw `sql` template interpolates user input.
- [ ] **SSRF surface:** [`url-context.service.ts`](../packages/gateway/src/agent/url-context.service.ts) and
      outbound webhook/workflow HTTP nodes fetch user-supplied URLs — check for private-range/localhost/
      metadata-endpoint blocking (or the absence thereof), redirect handling, and response-size caps.
- [ ] **Report:** `todo/phase-60-findings/C-input-validation.md` (+ any S-effort quick wins applied).

## Theme D — Dependency & supply-chain audit — **S-M**

What we ship that we didn't write.

- [ ] Run `pnpm audit` + `pnpm outdated` across the workspace; triage advisories by reachability (is the
      vulnerable path actually imported?); **apply safe patch/minor bumps** (tests green) as the quick-win
      exception; log majors + reachable advisories as findings.
- [ ] Audit for **committed secrets** (grep the tree + git history spot-check for keys/tokens), a stray
      `.env`, or fixtures with real credentials; check the lockfile for unexpected/typosquat-shaped deps.
- [ ] Confirm no runtime dep pulls in network/telemetry the product doesn't intend; note license outliers.
- [ ] **Report:** `todo/phase-60-findings/D-supply-chain.md` (+ any safe bumps applied).

---

# Section II — Bugs & Correctness

## Theme E — State-machine, scheduler & concurrency correctness — **M-L**

The autonomous core: transitions, ticks, and races.

- [ ] **Task state machine:** map every transition site (the ad-hoc machine across
      [`shared/src/task.ts`](../packages/shared/src/task.ts),
      [`web/lib/task-transitions.ts`](../packages/web/lib/task-transitions.ts),
      [`tasks.service.ts`](../packages/gateway/src/tasks/tasks.service.ts),
      [`agent-runner.service.ts`](../packages/gateway/src/pool/agent-runner.service.ts)) and look for
      **illegal or unguarded transitions** (e.g. `done`→`wip`, double-`complete`, a `waiting` task that can
      never leave). Cross-check the Phase 53 `waitReason`/escalation paths for holes.
- [ ] **Scheduler races:** re-read the tick ([`agent-pool-scheduler.service.ts`](../packages/gateway/src/pool/agent-pool-scheduler.service.ts))
      + the Phase 54 watchdog + slot acquire/release for **TOCTOU** windows (a slot freed mid-tick, a task
      picked twice, a watchdog reclaiming a slot the runner is still using) now that both run on one tick.
- [ ] **WS ordering (post-56):** with seq+resume landed, probe for **apply-out-of-order** on the client and
      **seq allocation under concurrency** on the gateway (two mutations in one tick — do seqs stay monotonic
      per channel?).
- [ ] **Transaction boundaries:** verify multi-table writes (dependency edits, Phase 49 import, bulk create)
      are inside one `db.transaction` and can't half-apply on a mid-write throw.
- [ ] **Report:** `todo/phase-60-findings/E-state-concurrency.md`.

## Theme F — Data integrity & boundary-condition bugs — **M**

The edges: nulls, empties, orphans, off-by-ones.

- [ ] **Referential integrity without FKs:** the schema avoids cross-domain FKs (by design) — enumerate the
      app-layer invariants (task→project, task→milestone (P58), dependency edges, session→task) and find
      **orphan-producing paths** (delete a project with tasks? a blocker task? a repo in use?) that leave
      dangling refs.
- [ ] **Pagination boundaries (post-57):** with cursor/keyset pagination landing, probe boundary bugs —
      duplicate/skipped rows at page edges under concurrent inserts, empty-page handling, unstable sort ties.
- [ ] **Null/empty/limits:** empty board, a task with no repo, a deck with zero slides, a workflow with no
      nodes, extremely long titles/prompts, unicode/emoji, huge diffs (P52) — find the render/serialize paths
      that assume non-empty.
- [ ] **Time & ordering:** timestamps are ISO strings — check any string-vs-Date comparison, timezone
      assumptions, and `desc(priority), asc(createdAt)` tie-breaking under identical timestamps.
- [ ] **Report:** `todo/phase-60-findings/F-data-integrity.md`.

## Theme G — Error handling & failure-path correctness — **M**

What happens when things go wrong — on purpose and by accident.

- [ ] **Swallowed errors:** grep for `catch` blocks that log-and-continue or `catch {}` (CLAUDE.md forbids
      silent swallow) and unhandled promise rejections in fire-and-forget paths (event emits, usage record,
      audit, notifications) — a broken subscriber shouldn't corrupt a mutation, but a swallowed *data* error is a bug.
- [ ] **Fail-open vs fail-closed:** confirm each is intentional — approvals fail-safe (P23/50), preflight
      fail-fast (P54), PR-status fail-open (P52), watchdog fail-open (P53/54). Flag any path that fails the
      *wrong* way (e.g. a security check that fails open).
- [ ] **Boundary error surfacing:** services throw, handlers map to HTTP (CLAUDE.md) — find routes that leak a
      500 where a 4xx belongs, or return 200 on a partial failure; verify the CLI + web render these errors
      legibly (not a raw stack).
- [ ] **Report:** `todo/phase-60-findings/G-error-handling.md`.

---

# Section III — UI/UX (direction-preserving)

> The product's look + direction are **liked as-is** — these themes hunt for the *overlooked*, never a
> redesign. Every UX finding is "this is missing/inconsistent/inaccessible," not "change the approach."

## Theme H — Consistency & flow sweep — **M**

The overlooked few things, made systematic.

- [ ] **State coverage matrix:** for each major surface (board, sessions 51, project 55, workflows, diff review
      52, slides 48, ideas, search, settings) confirm it has a **loading**, **empty**, and **error** state —
      list the ones that show a blank/spinner-forever/dead end instead.
- [ ] **Interaction consistency:** destructive actions all confirm the same way? success/failure **toasts**
      consistent? optimistic vs. await behavior uniform? back-links/breadcrumbs present on every detail/deep-link
      (a bookmarked `?id=` that 404s to nowhere is a dead end)?
- [ ] **Copy & affordance:** button labels/tooltips/placeholders consistent in voice; disabled controls explain
      *why*; irreversible ops signposted. Report a **consistency findings list** + a proposed shared pattern where
      one is missing (no redesign — just the gap).
- [ ] **Report:** `todo/phase-60-findings/H-consistency-flow.md`.

## Theme I — Accessibility & keyboard navigation — **M-L**

Usable without a mouse, legible to assistive tech — no visual change required.

- [ ] **`@midnite/ui` primitives:** audit the **hand-rolled** accordion/collapse/tabs for ARIA roles + keyboard
      (arrow keys, Home/End, Enter/Space, focus management); confirm `@storybook/addon-a11y` axe checks actually
      run and add the missing story coverage as findings.
- [ ] **Complex web interactions:** the **dnd-kit board** (keyboard drag/reorder?), hand-rolled **dialogs/modals**
      (focus trap, `Esc`, `aria-modal`, return focus), the **command palette** (P41), the **cockpits** (51/55) —
      tab order, focus rings, screen-reader labels.
- [ ] **Global:** contrast on the token palette (WCAG AA — the dark theme raised `--destructive` for this, verify
      the rest), image `alt`, form label associations, live-region announcements for async board updates.
- [ ] **Report:** `todo/phase-60-findings/I-accessibility.md` (rank P1 for keyboard-trap/unreachable-control).

## Theme J — Mobile & responsive polish — **M**

The small-screen + PWA paths.

- [ ] **Reflow audit** at the [`lib/breakpoints.ts`](../packages/web/lib/breakpoints.ts) cutoffs: the board on
      mobile (horizontal snap-scroll — does it work one-handed?), the cockpit panels (51/55 drawer vs. rail),
      the diff viewer (52) + slides (48) on a phone, tables that overflow (do they scroll in their own container
      per CLAUDE.md, or break the page?).
- [ ] **Touch & PWA:** touch-target sizes (≥44px), the installed-PWA chrome (P24), safe-area insets vs. the mobile
      tab bar, no horizontal body scroll anywhere; xterm terminal read-only-on-touch behaves.
- [ ] **JS vs CSS cutoffs:** confirm branch-on-viewport code uses the `useMediaQuery`/`useIsMobile` hooks (not
      hand-written widths) so CSS + JS agree (CLAUDE.md).
- [ ] **Report:** `todo/phase-60-findings/J-mobile-responsive.md`.

---

# Section IV — Monorepo Hygiene (CLI · docs · site · ui · shared)

## Theme K — CLI robustness & coverage — **M**

The 35-command client, made trustworthy.

- [ ] **Test the untested clusters** (findings + the tests themselves count as the deliverable here): bulk ops,
      guardrails pause/resume, import/export, search — assert exit codes (0/1), `--json` shape, and
      gateway-down/401 messaging per command.
- [ ] **Consistency:** every mutating command sets an explicit `process.exitCode` on failure; `--json` output is
      valid JSON for *table* commands too (not just single-object); help text has examples for the fuzzy ones.
- [ ] **CI ergonomics:** add/verify an **env-var token fallback** (`MIDNITE_TOKEN`) so CI needn't write
      `~/.midnite/auth` to disk.
- [ ] **Boundary smell:** audit the `@midnite/gateway` import in [`cli/src/`](../packages/cli/src/) — confirm it's
      types-only / a REST wrapper, not reaching gateway internals (CLAUDE.md: clients are pure API consumers);
      report if it crosses the line.
- [ ] **Report:** `todo/phase-60-findings/K-cli.md`.

## Theme L — Docs site, public site & `@midnite/ui` test gap — **M-L**

Truth-in-documentation + the design-system test hole.

- [ ] **Docs staleness ([`packages/docs/`](../packages/docs/)):** it's **design-system-only** — inventory what
      the *product* has shipped (sessions, slides, workflows, guardrails, cockpits, CLI) with **no doc coverage**,
      and decide the structural question (Decision §3): extend `docs` with a product section, or a separate
      product-docs surface. `getting-started.mdx` covers only the UI on-ramp — flag it. Report the gap list +
      a proposed IA; **writing the docs is a follow-up phase**, not this one.
- [ ] **Public site accuracy:** audit the Phase 11 public site copy/screenshots/feature claims against what's
      actually shipped — stale promises, dead links, missing recent surfaces, broken live examples.
- [ ] **`@midnite/ui` test gap:** the 10 primitives have **0 unit tests** (only stories) — enumerate the
      behavioral coverage needed (keyboard, controlled/uncontrolled, edge props) as findings; verify the
      `web/components/ui/` re-export wrappers don't drift or override lib styles (boundary clarity).
- [ ] **Report:** `todo/phase-60-findings/L-docs-site-ui.md`.

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