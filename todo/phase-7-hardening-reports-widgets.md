# Phase 7 — Hardening, Reports & Widgets

> The app is now broad (tasks, projects, memory, councils, brainstorms, workflows, dashboard, desktop, site, multi-provider LLM). Phase 7 is a **consolidation phase**: make what exists trustworthy (hardening), let users get artifacts *out* (report export — councils first), and fill the genuinely-missing dashboard gaps. It deliberately does **not** chase new surfaces.

> Status legend: every box starts unchecked. Themes are independent — pick a slice (see "Recommended slice" at the bottom) rather than doing all of it.

---

## Theme A — Hardening (production-readiness)

The highest-value theme. These are real, verified gaps, not hypotheticals.

### A1. Encrypt provider API keys at rest — **M** — ✅ DONE (merged `a5ab124`, 2026-06-19)
- [x] Keys were **plaintext** — now AES-256-GCM at rest via a new `gateway/src/crypto/` module (`CryptoService`, env key **`MIDNITE_SECRET_KEY`**, per-value IV, self-describing `v1:` format).
- [x] `provider-credentials.repository.ts` encrypts on write / decrypts on read; legacy plaintext re-encrypted in place on next write + a one-time startup pass. No schema change needed.
- [x] **Fail-closed** (per decision): no env key ⇒ encrypted keys unusable (provider disabled) and writes rejected (→ 400) — never a silent plaintext fallback.

### A2. LLM usage & cost accounting — **M** (also powers a widget) — ✅ DONE (merged `a5ab124`, 2026-06-19)
- [x] `llm_usage` table (migration `0024`) + `usage/` module; `LlmService` records per-call usage (provider, model, feature, in/out tokens, est. cost) — adapters surface token counts; `GET /usage/summary` aggregates by day/provider/feature.
- [x] Feature tags: classifier/planner/project/agent/workflow. **Not tracked:** councils (they run via spawned CLI sessions, not `LlmService` — no SDK token counts).
- [x] **Soft-warn** budget warnings (advisory, never blocks), per the track+soft-warn decision. ⏳ Hard-stop caps intentionally **not** built (decided soft-warn only).

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

### B1. Export framework — **M** — ✅ DONE (merged `b5a1fcf`, 2026-06-19)
- [x] `shared/src/report.ts` — `ReportFormat` enum + server/client-rendered split helpers + `REPORT_CONTENT_TYPE`.
- [x] Gateway: pure per-domain markdown builder + a thin export controller (route shipped as `GET /councils/:id/runs/:runId/export?format=md`; serialization lives in the service, reusable by CLI).
- [x] Web: a reusable `ExportMenu` (Copy Markdown · Download .md · Download PDF) on the council run view.

### B2. Councils report — **M** (first consumer) — ✅ DONE (merged `b5a1fcf`, 2026-06-19)
- [x] **Format-aware** across the unified council formats; `buildCouncilRunReport()` consumes `prompt`, `format`, `members[]`, and per-format `syntheses[]`.
- [x] Assembles title + date → prompt → active synthesis (+ archived per-format syntheses) → per-member contributions; de-anonymizes A/B/C via the entry `labelMap` when anonymized.
- [x] Markdown export wired end-to-end (copy + download); 14 builder unit tests cover attributed/anonymized/multi-synthesis/failed-member cases.

### B3. PDF rendering — **S–M** — ✅ DONE (print-to-PDF), merged `b5a1fcf`
- [x] Print-to-PDF, no heavy server deps: `ExportMenu` renders the markdown into an isolated print container (`@media print` hides app chrome) and calls `window.print()` — yields a PDF in both browser and Electron.
- [ ] ⏳ Deferred: the true one-click Electron `webContents.printToPDF()` bridge (main IPC + preload) — `TODO(desktop)` left in `export-menu.tsx`. `window.print()` covers it for now.
- [x] **Rejected (as decided):** server-side puppeteer/headless-Chrome and `jsPDF`/`react-pdf`.

### B4. Extensibility (later, free once B1 lands) — **S each**
- [ ] Projects (plan + tasks + sources), Task threads (timeline + PR). *(Brainstorms is no longer separate — it's a council format, covered by B2.)*

---

## Theme C — New dashboard widgets (genuinely additive only)

> The registry is **already rich** ([`web/lib/dashboard-widgets.ts`](../packages/web/lib/dashboard-widgets.ts)): it ships `agents` (pool), `activity` (feed), `throughput`, `system-health`, `sessions`, `workflows`, `councils`, `memories`, plus tiles, clocks, weather, finances, etc. **Do not rebuild these.** Only the genuinely-missing ones below.

- [x] **LLM cost & usage** widget — spend by day / provider / feature + soft-warn banner. ✅ DONE (merged `a5ab124`, with A2).
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

1. ✅ **A1** encrypt provider keys + **A2** usage/cost accounting (substrate). — *shipped 2026-06-19*
2. ✅ **B1 + B2 + B3** councils export (MD + print-to-PDF). — *shipped 2026-06-19*
3. ◐ **C** cost/usage widget (✅ shipped with A2) + recent-PRs widget (todo).
4. **A3** seed web tests for the riskiest logic + a CI Playwright smoke. — *next up; the export + hardening web code has no tests yet*
5. **D** notifications (cheap delight). Command palette + tags = stretch.

Leave A5 (remote auth), A4's deeper bits, and Theme-D extras for a later pass unless they're explicitly wanted.

> **Progress (2026-06-19):** steps 1–2 + the cost widget shipped and merged to `main` (commits `b5a1fcf` councils export, `a5ab124` hardening). Remaining in this phase: web test coverage (A3), the recent-PRs widget, A4 durability, A6 task WS broadcast, and Theme D.

## Decisions (resolved 2026-06-19)

1. **PDF strategy** → ✅ **print-to-PDF**: Electron `webContents.printToPDF()` in the desktop app + `@media print` + `window.print()` in the browser. No puppeteer/jsPDF.
2. **Key-encryption failure mode** → ✅ **fail-closed**: no env key ⇒ encrypted providers are disabled (never silently fall back to plaintext).
3. **Remote access** → ✅ **local-only**: midnite stays local + desktop. **A5 (auth + rate limiting) is OUT of scope** for this phase.
4. **Cost controls** → ✅ **track + soft-warn**: record per-call usage/cost and surface warnings near a budget; never block calls.
