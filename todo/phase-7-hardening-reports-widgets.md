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

### A3. Web test coverage — **M** — ◐ PARTIAL (toolchain + seed suites shipped `e3ad2f2`)
- [x] Web had **0 automated tests** — now Vitest + @testing-library/react + jsdom are wired with a `test` task, so `moon ci` runs web tests too.
- [x] Seeded the highest-risk pure/hook logic: `use-local-storage` (the double-write bug), `dashboard-widgets` registry, `task-events` pub/sub, plus a `command-palette` render+keyboard suite (15 tests). _(`lib/api.ts`/optimistic-board tests still worth adding.)_
- [ ] Add a small Playwright smoke suite to CI (the drive-throughs exist ad-hoc; commit a few).

### A4. Resilience & data durability — **S–M** — ✅ DONE (recovery audit: PR #99, 2026-06-22 — see [done.md](done.md))
- [x] WAL was already on; added `synchronous=NORMAL` + `busy_timeout=5000`, and a consistent online **backup** via `POST /admin/backup` (DB snapshot + uploads copy). Restore is a documented manual stop-and-copy; CLI `midnite backup` wrapper deferred.
- [x] Audit/normalise restart recovery: tasks requeue orphaned `wip`, councils fail stale runs — now **workflow runs** do too (`WorkflowRecoveryService.onModuleInit` fails runs left `running` + their in-flight node-runs, emits `run.failed`). PR #99.
- [x] Confirm graceful shutdown kills all PTYs: the real gap was that **shutdown hooks were never enabled** — `app.enableShutdownHooks()` now makes `onModuleDestroy` fire on SIGINT/SIGTERM (terminal kills under `pty` / detaches under `tmux`; managed agent-run PTYs are pinned handles in that same teardown, so they're covered). PR #99.

### A5. Optional remote-access auth — **S–M** — ❌ OUT OF SCOPE (decided local-only)
- [ ] Gateway is loopback-only with per-session hook secrets + terminal tokens, but the **REST API itself is unauthenticated**. Fine for localhost; unsafe the moment someone binds `0.0.0.0` or tunnels it.
- [ ] Optional bearer token (config / env) enforced by a Nest guard when `host` is non-loopback; basic per-IP rate limiting.
- **Decision:** is remote access even a goal? If midnite stays strictly local + desktop, this is low priority.

### A6. `task.*` WebSocket broadcast — **M** — ✅ DONE (`e2b9b73`)
- [x] Event-driven board updates: `TaskEventBus` + `TasksGateway` (`/ws/tasks`) publish a `TaskBoardEvent` on every transition; the web `useTaskEvents` hook invalidates the cache. Polling kept as fallback. Also powers notifications (Theme D).

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
- [x] **Recent PRs / shipped work** — "Shipped" widget lists recent done tasks with their PR links. ✅ DONE (`33d3380`).

> ~~Brainstorms widget~~ — dropped: brainstorms was merged into councils (a format), so the existing `councils` widget already covers it.
- [x] **Quick capture** — add a task (and optionally bulk-paste, outstanding #2) straight from the dashboard. ✅ DONE (PR #91): a placeable `QuickCaptureWidget` (single → `POST /tasks`, Bulk toggle → `POST /tasks/bulk`); status defaults to `todo` (triaged) and the repo is inferred (PR #88). RTL + registry + Playwright e2e coverage.
- [x] (repos went first-class, outstanding #4 done) a **per-repo status** widget — in-flight agents / queue depth per repo. ✅ DONE (PR #97): `RepoStatusWidget` + pure `summarizeByRepo` rollup (running=wip+waiting, queued=todo, +backlog/done; every registered repo, Unassigned last, sorted by activity). Unit + RTL + e2e.

---

## Theme D — New features (smaller, opportunistic)

- [x] **Command palette** (⌘K) — fast switcher across every enabled surface (navigation v1; content search extensible). ✅ DONE (`0fad41c`).
- [x] **Notifications** on `→waiting` / `→done` via the web Notification API (works in Electron too); opt-in in Settings. ✅ DONE (`7384897`).
- [x] **Tags/labels + saved filters** — tags on tasks (chips, modal editor) + a board tag filter backed by the `tags` query param (shareable/bookmarkable "saved filter"). ✅ DONE (`d31cc00` data, `cdee3ec` UI).

---

## Critical analysis — what to cut, what to sequence

- **Theme A is the point of this phase.** A1 (plaintext keys) and A3 (zero web tests) are concrete liabilities; A2 (cost tracking) is a prerequisite for safely scaling autonomous/bulk runs. Do these even if nothing else ships.
- **Theme B is the headline you asked for.** The win is the *framework* (B1) — don't hand-roll a one-off council exporter. PDF (B3) should ride the Chromium you already bundle (Electron printToPDF) rather than adding puppeteer; treat that as the default and only escalate if it's insufficient.
- **Theme C is small on purpose.** The dashboard already covers most of what a v1 would want; the only standout new widget is **cost/usage**, and it's blocked on A2 — which is a nice forcing function to do A2 first.
- **Theme D is optional.** Notifications are the cheapest high-delight item; the command palette is the most "product-maturing" but is pure addition, not hardening — defer if time-boxed.
- **Cross-cutting dependency:** A2 (usage table) → C (cost widget) and → optional budget caps. B1 (framework) → all other report types. Build the substrate first in each theme.

## Recommended slice for a focused Phase 7

1. ✅ **A1** encrypt provider keys + **A2** usage/cost accounting (substrate). — *shipped*
2. ✅ **B1 + B2 + B3** councils export (MD + print-to-PDF). — *shipped*
3. ✅ **C** cost/usage widget + recent-PRs ("Shipped") widget. — *shipped*
4. ◐ **A3** web test toolchain + seed suites shipped; CI Playwright smoke still todo.
5. ✅ **D** notifications, ⌘K command palette, and tags + saved filters. — *shipped*
6. ✅ **A6** task WS broadcast + ◐ **A4** backup/WAL (restore + recovery-audit still todo). — *shipped*

Leave A5 (remote auth), A4's deeper bits, and Theme-D extras for a later pass unless they're explicitly wanted.

> **Progress (2026-06-19):** Phase 7 is **essentially complete.** Shipped & merged to `main`: A1+A2 hardening (`a5ab124`), councils export B1–B3 (`b5a1fcf`), A6 task WS broadcast (`e2b9b73`), Shipped/PRs widget (`33d3380`), notifications (`7384897`), A4 backup+WAL (`05acd6d`), ⌘K palette (`0fad41c`), web test toolchain A3 (`e3ad2f2`), tags data+UI (`d31cc00`, `cdee3ec`).
>
> **Deliberately deferred** (not blockers): A5 remote-auth (out of scope — local-only); hard-stop budget caps (decided soft-warn only); Electron one-click `printToPDF` bridge (window.print covers it); CLI `midnite backup` wrapper; live-restore; A4 restart-recovery audit + shutdown verification; CI Playwright smoke; command-palette content search; tags-on-create.

## Decisions (resolved 2026-06-19)

1. **PDF strategy** → ✅ **print-to-PDF**: Electron `webContents.printToPDF()` in the desktop app + `@media print` + `window.print()` in the browser. No puppeteer/jsPDF.
2. **Key-encryption failure mode** → ✅ **fail-closed**: no env key ⇒ encrypted providers are disabled (never silently fall back to plaintext).
3. **Remote access** → ✅ **local-only**: midnite stays local + desktop. **A5 (auth + rate limiting) is OUT of scope** for this phase.
4. **Cost controls** → ✅ **track + soft-warn**: record per-call usage/cost and surface warnings near a budget; never block calls.
