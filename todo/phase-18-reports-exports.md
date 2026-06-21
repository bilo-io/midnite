# Phase 18 — Reports & exports across the app

> Phase 7 ([phase-7-hardening-reports-widgets.md](phase-7-hardening-reports-widgets.md)) Theme B shipped report export **councils-first**, and in doing so built a clean, reusable seam: [`shared/src/report.ts`](../packages/shared/src/report.ts) is the contract (`REPORT_FORMATS = ['md','pdf']`, `isServerRenderedReportFormat`, `REPORT_CONTENT_TYPE`) with a deliberate architecture — **markdown is built on the gateway** by a pure per-domain `toMarkdown()` serializer; **PDF is rendered client-side** by printing that markdown (Electron `printToPDF` / browser print), so there's **no server-side headless-Chrome / puppeteer / jsPDF** dependency. The councils path is the worked example end-to-end: gateway [`@Get(':id/runs/:runId/export')`](../packages/gateway/src/councils/councils.controller.ts) → `exportRunMarkdown()` → pure [`council-report.ts`](../packages/gateway/src/councils/lib/council-report.ts); web [`export-menu.tsx`](../packages/web/components/export-menu.tsx) + client renderer [`council-html-export.ts`](../packages/web/lib/council-html-export.ts) + the typed client in [`api.ts`](../packages/web/lib/api.ts). **Phase 18 generalizes that proven pattern to the rest of the app** — tasks, projects, and workflow runs — so users can get every artifact *out* as a portable document.

> **Scope guardrails (CLAUDE.md).** This phase **reuses the Phase 7 contract verbatim** — same `ReportFormat`, same `md`-server / `pdf`-client split, same `ExportMenu`. Each domain adds **one pure `toMarkdown()` serializer + one thin export route in its own module** (tasks route in the tasks module, project route in the projects module, run route in the workflows module) — **not** a central "export module", which would have to reach across domain boundaries to read tasks/projects/runs and violate the one-way dependency graph. Serializers are **pure functions** (input domain object → markdown string), unit-tested like [`council-report.ts`](../packages/gateway/src/councils/lib/council-report.ts). Controllers stay thin (validate `format` against `ReportFormatSchema`, set `REPORT_CONTENT_TYPE`, delegate). `shared` stays the contract; `cli`/`web` stay pure clients. **No new runtime deps** — especially no server-side PDF engine.

> Effort tags: **S** small · **M** medium · **L** large. **Theme D is the shared substrate** (do it first or alongside A); **A / B / C are independent domain slices** — pick one, they don't depend on each other. Every box starts unchecked.

---

## Current state (baseline to build on)

- **shared:** [`report.ts`](../packages/shared/src/report.ts) — `REPORT_FORMATS`, `ReportFormatSchema`, `SERVER_RENDERED_REPORT_FORMATS = ['md']`, `isServerRenderedReportFormat()`, `REPORT_CONTENT_TYPE` (covered by a schema test). This is **already domain-agnostic** — Phase 18 adds *consumers*, not new contract.
- **gateway (councils, the template):** [`councils.controller.ts`](../packages/gateway/src/councils/councils.controller.ts) `@Get(':id/runs/:runId/export')` validates `format` (rejects non-server-rendered → 400), serves `text/markdown`; [`council-report.ts`](../packages/gateway/src/councils/lib/council-report.ts) is the pure serializer (+ [`council-report.test.ts`](../packages/gateway/src/councils/lib/council-report.test.ts)).
- **web (councils, the template):** [`export-menu.tsx`](../packages/web/components/export-menu.tsx) (the `ExportMenu` — md download + pdf-via-print), used in [`council-run-tabs.tsx`](../packages/web/components/council-run-tabs.tsx); [`council-html-export.ts`](../packages/web/lib/council-html-export.ts) renders the markdown to printable HTML for PDF; client call in [`api.ts`](../packages/web/lib/api.ts).
- **Not yet exportable:** **tasks** (a task + its `task_events` timeline), **projects** (overview + tasks + linked memory/notes/sources), **workflow runs** (per-node input/resolved-params/output from Phase 12). No `ExportMenu` on those views.

---

## Theme D — Generalize the renderer & reuse (shared substrate) — **S–M**

Do this first (or alongside A) so A/B/C just plug in. Today the client-side PDF/HTML rendering lives in a councils-specific file; lift it so every domain shares one path.

- [ ] **Generic client renderer** — lift [`council-html-export.ts`](../packages/web/lib/council-html-export.ts) into a domain-agnostic `report-html-export.ts` (markdown string + a title → printable HTML → `printToPDF`/print). Councils switches to it (no behaviour change); A/B/C reuse it.
- [ ] **`ExportMenu` stays the single component** — confirm [`export-menu.tsx`](../packages/web/components/export-menu.tsx) takes a generic `{ fetchMarkdown, filename, title }` shape (refactor if it's councils-coupled) so each view drops it in identically.
- [ ] **"Copy as markdown" quick action** — add a copy-to-clipboard affordance to `ExportMenu` (same server markdown, no download), since copying into a doc/chat is the most common path.
- [ ] **Gateway helper (optional)** — a tiny shared export-response helper so each controller route sets `REPORT_CONTENT_TYPE` + `Content-Disposition` identically (kept as a thin util, not a module that owns domain logic).

---

## Theme A — Task export — **M**

A task's thread as a portable document.

- [ ] **Pure serializer** `task-report.ts` in the tasks module: `taskToMarkdown(task, events, sources)` → title, kind/status, priority/repo/project, a **status-history / `task_events` timeline**, and linked sources. Pure + unit-tested (mirror [`council-report.test.ts`](../packages/gateway/src/councils/lib/council-report.test.ts)).
- [ ] **Export route** `@Get('tasks/:id/export')` in [`tasks.controller.ts`](../packages/gateway/src/tasks/tasks.controller.ts): validate `format`, delegate to a `TasksService.exportMarkdown(id)` that loads the task + its events; 404 on unknown id, 400 on a non-server-rendered format.
- [ ] **Web:** `ExportMenu` in the task **thread modal**; typed `exportTask` client in [`api.ts`](../packages/web/lib/api.ts).
- [ ] Gateway test (`:memory:`): a task with a few `task_events` serializes to markdown containing the title + timeline; unknown id → 404.

---

## Theme B — Project export (full bundle) — **M–L**

"Everything about this project" — overview + its tasks + linked knowledge.

- [ ] **Pure serializer** `project-report.ts` in the projects module: `projectToMarkdown(project, tasks, memory, notes, sources)` → project overview/description, a **task list** (title · kind · status) grouped by column, then **linked memory / notes / sources** as their own sections (Decision §2 — full bundle). Pure + unit-tested.
- [ ] **Export route** `@Get('projects/:id/export')` in [`projects.controller.ts`](../packages/gateway/src/projects/projects.controller.ts) → `ProjectsService.exportMarkdown(id)` which gathers the project's tasks (+ memory/notes/sources for this project). Keep the gather inside the service; **don't** import other domains' repositories directly — call their services (boundary-clean).
- [ ] **Web:** `ExportMenu` in the project view; typed `exportProject` client.
- [ ] Gateway test: a project with 2 tasks + a note + a source serializes with all sections present; empty sections omitted cleanly.

> **Boundary note:** the bundle spans tasks + memory + notes + sources. Compose via their **services** (already injectable), not by reaching into repositories — keeps the projects service the orchestrator and respects the layering.

---

## Theme C — Workflow-run export — **M**

A run as a debuggable, shareable document — the payoff of Phase 12's persisted resolved params.

- [ ] **Pure serializer** `run-report.ts` in the workflows module: `runToMarkdown(workflow, run, nodeRuns)` → workflow name + trigger, run status/timing, then **per node: input → resolved params → output** (the [`NodeRun.resolvedParams`](../packages/shared/src/run.ts) field from Phase 12) and any error/log. Pure + unit-tested.
- [ ] **Export route** `@Get('workflows/:id/runs/:runId/export')` (mirrors the councils route shape) → a `exportRunMarkdown(id, runId)` on the workflows service.
- [ ] **Web:** `ExportMenu` in the **run-output panel** ([`use-workflow-run.ts`](../packages/web/lib/use-workflow-run.ts) view); typed `exportWorkflowRun` client.
- [ ] Gateway test: a completed run with 2 node-runs serializes with input/resolved/output per node; a failed node shows its error.

---

## Out of scope (named, not built here)

- **Server-side PDF** (puppeteer / headless Chrome / jsPDF) — the contract deliberately renders PDF **client-side** from markdown; keep it that way (no new heavy dep).
- **CSV / structured-data export** — these reports are human-readable documents, not data dumps. A `csv` format would need its own contract; defer.
- **Scheduled / emailed reports** — generating a report on a cron and delivering it pairs naturally with a future **notifications** phase + the Phase 14 integration executors; not here.
- **Report templating / theming** — a single clean default layout per domain; no user-customisable templates this phase.
- **Bulk / board-wide export** (zip of every task, a whole-board snapshot) — possible follow-on once the per-domain serializers exist; out of scope now.

---

## Files this phase touches (map)

- **shared:** [`report.ts`](../packages/shared/src/report.ts) reused as-is (no contract change expected); add typed client functions for the new export routes in the web/cli clients. Barrel/tests only if the contract needs a tweak.
- **gateway:** new pure serializers — `tasks/lib/task-report.ts`, `projects/lib/project-report.ts`, `workflows/.../run-report.ts` (+ tests); export routes on [`tasks.controller.ts`](../packages/gateway/src/tasks/tasks.controller.ts), [`projects.controller.ts`](../packages/gateway/src/projects/projects.controller.ts), and the workflows controller, each delegating to an `exportMarkdown()` service method; optional thin export-response util.
- **web:** generalize [`council-html-export.ts`](../packages/web/lib/council-html-export.ts) → `report-html-export.ts`; make [`export-menu.tsx`](../packages/web/components/export-menu.tsx) generic (+ "copy as markdown"); drop `ExportMenu` into the task thread modal, project view, and workflow run panel; `exportTask`/`exportProject`/`exportWorkflowRun` in [`api.ts`](../packages/web/lib/api.ts).
- **cli (optional):** `midnite task export <id>` / `project export <id>` if cheap — thin client calls writing markdown to stdout/file. Defer if it bloats the slice.
- **Docs:** update [`CLAUDE.md`](../CLAUDE.md) (reports generalized beyond councils) + README; append to [`done.md`](done.md) as slices land; this completes Phase 7 Theme B's "export beyond councils" intent.

---

## Verification

- [ ] **Councils still works** after Theme D's renderer lift — md download + pdf-via-print unchanged (no regression on the existing path).
- [ ] **Task:** open a task thread → `ExportMenu` → markdown download contains the title, status history, and `task_events` timeline; PDF prints the same content; "copy as markdown" copies it.
- [ ] **Project:** export a project → markdown has the overview, a task list grouped by column, and memory/notes/sources sections (empty sections omitted); PDF renders.
- [ ] **Workflow run:** export a completed run → markdown shows per-node input → resolved params → output (and a failed node's error); PDF renders.
- [ ] Every export route validates `format`: `?format=pdf` to a server route is rejected (pdf is client-rendered); an unknown id → 404; the served `Content-Type` is `text/markdown`.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across the graph; `moon ci` green. (Run web tests from the **primary checkout**, not a `.git` worktree.)

---

## Decisions / open questions

1. **Domains in scope** *(settled in brainstorm: all).* Tasks + projects + workflow runs all get export this phase, on top of the shared renderer (Theme D). Councils already ships.
2. **Project export depth** *(settled in brainstorm: full bundle).* Project + its tasks **+ linked memory/notes/sources** as sections — the "everything about this project" document, not just a task list.
3. **PDF rendering** *(settled by the existing contract: client-side).* PDF is printed from the server markdown on the client (`printToPDF`/print) — no server-side PDF engine. Phase 18 keeps this; it's why there are no new deps.
4. **Route placement** *(recommend: per-module).* Each export route lives in its **own** domain module's controller, not a central export module — a central one would have to import across domains and break the dependency graph. The councils route already follows this.
5. **Project bundle boundary** *(recommend: compose via services).* The projects service gathers tasks/memory/notes/sources through their **services**, not their repositories, to keep the projects module the orchestrator without reaching into other domains' internals.
6. **CLI export** *(open / recommend: include if cheap).* `midnite task export` / `project export` writing markdown to stdout is a thin, useful add; include if it doesn't expand the slice, else defer to a follow-on.
7. **"Copy as markdown"** *(recommend: include in D).* Cheap, high-use — copying a report into a doc/chat is more common than downloading a file.
