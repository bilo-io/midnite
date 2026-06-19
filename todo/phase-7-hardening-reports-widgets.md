# Phase 7 — Hardening, Reports & Widgets

> The app is now broad (tasks, projects, memory, councils, brainstorms, workflows, dashboard, desktop, site, multi-provider LLM). Phase 7 is a **consolidation phase**: make what exists trustworthy (hardening), let users get artifacts *out* (report export — councils first), and fill the genuinely-missing dashboard gaps. It deliberately does **not** chase new surfaces.

> Status legend: every box starts unchecked. Themes are independent — pick a slice (see "Recommended slice" at the bottom) rather than doing all of it.

---

## Theme A — Hardening (production-readiness)

The highest-value theme. These are real, verified gaps, not hypotheticals.

### A1. Encrypt provider API keys at rest — **M**
- [ ] Keys are **plaintext today** — [`db/schema.ts`](../packages/gateway/src/db/schema.ts) (`api_key` column comment admits it). Anyone with the SQLite file reads every provider key.
- [ ] Encrypt with AES-256-GCM using a key from an env var — **reuse the vault design already specced for workflows** (`workflows.encryptionKeyEnv` / `MIDNITE_WORKFLOWS_KEY` in [`config.ts`](../packages/shared/src/config.ts)); generalise it into a small `gateway/src/crypto/` module so workflow credentials (P9) and provider keys share one implementation.
- [ ] Migration to encrypt existing rows in place; graceful fallback if the env key is absent (read-only / disabled, not crash).
- **Decision:** fail-closed (no key ⇒ providers disabled) vs. fall back to plaintext with a loud warning.

### A2. LLM usage & cost accounting — **M** (also powers a widget + budget caps)
- [ ] No token/cost tracking exists anywhere. Every feature (agents, councils, brainstorms, classifier, planner, workflows `ai.*`) calls the LLM blind.
- [ ] Record per-call usage (provider, model, feature, input/output tokens, est. cost) in a `llm_usage` table; aggregate by day/feature/provider.
- [ ] Optional **budget caps** (daily/monthly) that soft-warn then hard-stop non-interactive calls.
- **Why now:** bulk add (outstanding #2) + autonomous pool + councils/brainstorms can fan out a lot of paid calls. Cost visibility should precede turning the pool on by default.

### A3. Web test coverage — **M**
- [ ] **The web package has 0 automated tests** (gateway has 47). All web verification has been manual Playwright drive-throughs.
- [ ] Wire Vitest + @testing-library/react (already the documented stack) for the highest-risk pure logic first: `use-local-storage` (had a real double-write bug — see done.md), `dashboard-widgets` registry, `lib/api.ts` client, `detectPlatform`, optimistic board moves.
- [ ] Add a small Playwright smoke suite to CI (the drive-throughs exist ad-hoc; commit a few).

### A4. Resilience & data durability — **S–M**
- [ ] SQLite WAL mode + a one-command **backup/restore** (`midnite backup` → copy DB + uploads). Single-file store with no backup path today.
- [ ] Audit/normalise restart recovery: tasks requeue orphaned `wip`, councils/brainstorms fail stale runs — make sure workflows runs and any new long-runners do the same consistently.
- [ ] Confirm graceful shutdown kills all PTYs (exists for terminal sessions; verify pool + managed runs).

### A5. Optional remote-access auth — **S–M** — ❌ OUT OF SCOPE (decided local-only)
- [ ] Gateway is loopback-only with per-session hook secrets + terminal tokens, but the **REST API itself is unauthenticated**. Fine for localhost; unsafe the moment someone binds `0.0.0.0` or tunnels it.
- [ ] Optional bearer token (config / env) enforced by a Nest guard when `host` is non-loopback; basic per-IP rate limiting.
- **Decision:** is remote access even a goal? If midnite stays strictly local + desktop, this is low priority.

### A6. `task.*` WebSocket broadcast — **M** (pulled from [outstanding.md](outstanding.md) #1)
- [ ] Replace polling with event-driven board updates — both a UX and a load-reliability win. See outstanding #1 for the full plug-in plan.

---

## Theme B — Reports & export (the headline feature)

**Build a generic export framework, ship Councils first.** Each report type provides (1) a `toMarkdown()` serializer and (2) a print-friendly view; the same two hooks unlock every other report later.

### B1. Export framework — **M**
- [ ] `shared/src/report.ts` — `ReportFormat = 'md' | 'pdf'`, a `ReportDescriptor` shape, response types.
- [ ] Gateway: per-domain `toMarkdown()` builders + a thin export controller (`GET /councils/:id/export?format=md` returns text/markdown; `format=pdf` see B3). Keep serialization in the service layer (testable, reusable by CLI).
- [ ] Web: a reusable `ExportMenu` (Copy Markdown · Download .md · Download .pdf) dropped onto a report header.

### B2. Councils report — **M** (first consumer)
- [ ] **Format-aware** (brainstorms were merged into councils — a run now has a `CouncilFormat`: brainstorm / debate / analyse / critique / motivate / demotivate / custom). A `CouncilRun` carries: `prompt`, `format`, `members[]` (each with provider/role snapshot + captured output), and `syntheses[]` — **one `CouncilSynthesisEntry` per format** the run was synthesized in, each with its own `anonymize` flag and optional `labelMap` (label→runMemberId).
- [ ] Assemble: title + date → prompt → the **active synthesis** (and optionally each archived per-format synthesis) → per-member contributions. **De-anonymize** member responses using that entry's `labelMap` when `anonymize` is true; attribute by name otherwise.
- [ ] Markdown export wired end-to-end; copy + download.

### B3. PDF rendering — **S–M** (decision-gated)
- [ ] **Recommended:** print-to-PDF, no heavy server deps.
  - Desktop (Electron): `webContents.printToPDF()` on a hidden/print route — high fidelity, Chromium already bundled.
  - Browser: a `/report/print` route with an `@media print` stylesheet + `window.print()`.
- [ ] **Rejected for now:** server-side puppeteer / headless Chrome (large dep, ops burden) and `jsPDF`/`react-pdf` (re-implements layout). Revisit only if one-click serverless PDF becomes a hard requirement.
- **Decision:** accept "PDF = print dialog / desktop print" for v1, or invest in headless rendering?

### B4. Extensibility (later, free once B1 lands) — **S each**
- [ ] Projects (plan + tasks + sources), Task threads (timeline + PR). *(Brainstorms is no longer separate — it's a council format, covered by B2.)*

---

## Theme C — New dashboard widgets (genuinely additive only)

> The registry is **already rich** ([`web/lib/dashboard-widgets.ts`](../packages/web/lib/dashboard-widgets.ts)): it ships `agents` (pool), `activity` (feed), `throughput`, `system-health`, `sessions`, `workflows`, `councils`, `memories`, plus tiles, clocks, weather, finances, etc. **Do not rebuild these.** Only the genuinely-missing ones below.

- [ ] **LLM cost & usage** widget — spend by day / provider / feature. *Depends on A2.* Highest value; nothing like it exists.
- [ ] **Recent PRs / shipped work** — `done` tiles count completions but nothing lists recent done tasks *with their PR links*. A "what shipped" feed.

> ~~Brainstorms widget~~ — dropped: brainstorms was merged into councils (a format), so the existing `councils` widget already covers it.
- [ ] **Quick capture** — add a task (and optionally bulk-paste, outstanding #2) straight from the dashboard.
- [ ] (If repos go first-class, outstanding #4) a **per-repo status** widget — in-flight agents / queue depth per repo.

---

## Theme D — New features (smaller, opportunistic)

- [ ] **Global search / command palette** (⌘K) across tasks, projects, memory, councils, brainstorms, workflows. The app has many surfaces and no unified find. — **M**
- [ ] **Notifications** on `wip→waiting` (needs input) and `→done`: Electron native notifications + web Notification API. Closes the loop on autonomous runs. — **S–M**
- [ ] **Tags/labels + saved filters** on tasks. — **M**

---

## Critical analysis — what to cut, what to sequence

- **Theme A is the point of this phase.** A1 (plaintext keys) and A3 (zero web tests) are concrete liabilities; A2 (cost tracking) is a prerequisite for safely scaling autonomous/bulk runs. Do these even if nothing else ships.
- **Theme B is the headline you asked for.** The win is the *framework* (B1) — don't hand-roll a one-off council exporter. PDF (B3) should ride the Chromium you already bundle (Electron printToPDF) rather than adding puppeteer; treat that as the default and only escalate if it's insufficient.
- **Theme C is small on purpose.** The dashboard already covers most of what a v1 would want; the only standout new widget is **cost/usage**, and it's blocked on A2 — which is a nice forcing function to do A2 first.
- **Theme D is optional.** Notifications are the cheapest high-delight item; the command palette is the most "product-maturing" but is pure addition, not hardening — defer if time-boxed.
- **Cross-cutting dependency:** A2 (usage table) → C (cost widget) and → optional budget caps. B1 (framework) → all other report types. Build the substrate first in each theme.

## Recommended slice for a focused Phase 7

1. **A1** encrypt provider keys + **A2** usage/cost accounting (substrate).
2. **B1 + B2 + B3** councils export (MD now, PDF via Electron/print).
3. **C** cost/usage widget (falls out of A2) + recent-PRs widget.
4. **A3** seed web tests for the riskiest logic + a CI Playwright smoke.
5. **D** notifications (cheap delight). Command palette + tags = stretch.

Leave A5 (remote auth), A4's deeper bits, and Theme-D extras for a later pass unless they're explicitly wanted.

## Decisions (resolved 2026-06-19)

1. **PDF strategy** → ✅ **print-to-PDF**: Electron `webContents.printToPDF()` in the desktop app + `@media print` + `window.print()` in the browser. No puppeteer/jsPDF.
2. **Key-encryption failure mode** → ✅ **fail-closed**: no env key ⇒ encrypted providers are disabled (never silently fall back to plaintext).
3. **Remote access** → ✅ **local-only**: midnite stays local + desktop. **A5 (auth + rate limiting) is OUT of scope** for this phase.
4. **Cost controls** → ✅ **track + soft-warn**: record per-call usage/cost and surface warnings near a budget; never block calls.
