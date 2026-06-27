# Phase 40 — Ideas: AI-composed, project-linked, phase-planned

> midnite already knows how to run work — what it can't do is help you **think up** that work in a structured way, let it evolve with AI, and seamlessly turn an idea into a sequenced project. The machinery that exists: project creation ([`projects.service.ts`](../packages/gateway/src/projects/projects.service.ts)), the LLM planner ([`LlmService`](../packages/gateway/src/agent/llm/llm.service.ts)), the structured breakdown from Phase 28 ([`BreakdownService`](../packages/gateway/src/agent/breakdown.service.ts)), GitHub executor credentials from Phase 14's credential vault, and `Repo.ownerRepo` wired in Phase 37. **Phase 40 adds an Ideas surface** — a new top-level sidenav section where raw ideas are born, expanded by AI conversation, refined over time, and eventually promoted to projects, with phase docs living as real `.md` files in the project's repository and seeding the task board.

> **Scope guardrails (CLAUDE.md).** `shared` is the contract — new `Idea`, `IdeaMessage`, `PhaseDoc` types and their zod schemas go in `@midnite/shared`; `web` and `cli` stay pure HTTP/WS clients. The ideas feature uses the **existing LLM infrastructure** (`LlmService.chat`) rather than a new AI service. Phase doc file I/O goes through the **GitHub Contents API** using the credential vault already built in Phase 14 — no filesystem cloning. The `BreakdownService.parseDoc` extension is **additive** (the existing generate path is untouched). Cross-domain FTS5 registration follows the established `SearchIndexService` pattern (Phase 20). Every DB table change gets a forward-only Drizzle migration. **Out of scope:** idea versioning / diffs, one idea → multiple projects, offline fallback when no repo/credential is linked, local-clone git writes.

> Effort tags: **S** small · **M** medium · **L** large. Themes ordered **A → B → C → D → E → F → G**.

> **Canonical doc (consolidated 2026-06-27).** This is the single source of truth for the Ideas pipeline — it subsumes the former `phase-42-ideas-pipeline-complete.md`, which was a parallel restatement of the same work. Theme C (chat composer UI) landed in PR #232, Theme E (phase-doc editor) in PR #229, Theme F (task seeder) in PR #233; Theme G (sync-back) is folded in from the old Phase 42 Theme E. Outstanding: **D** (promote idea → project) and **G** (sync-back).

---

## Theme A — Idea entity + sidenav — **S** ✅ DONE (PR #215, 2026-06-26)

The data model and the entry point everything else builds on.

- [x] **`ideas` table** in [`gateway/src/db/schema.ts`](../packages/gateway/src/db/schema.ts): `id` (UUIDv7), `teamId`, `createdBy`, `title`, `body` (markdown), `status` (`'draft' | 'refined' | 'promoted'`), `projectId` (nullable FK → projects), `tags` (JSON array), `createdAt`, `updatedAt`. Forward-only Drizzle migration.
- [x] **`idea_messages` table** in the same migration: `id` (UUIDv7), `ideaId` (FK → ideas), `role` (`'user' | 'assistant'`), `content` (text), `createdAt`. Index on `(ideaId, createdAt)`.
- [x] **`IdeaStatus`**, **`Idea`**, **`IdeaMessage`** types + zod schemas in [`@midnite/shared`](../packages/shared/src/idea.ts) (new file). `CreateIdeaRequestSchema`, `UpdateIdeaRequestSchema`, `IdeaChatRequestSchema`. Barrel export.
- [x] **`IdeaRepository`** ([`ideas.repository.ts`](../packages/gateway/src/ideas/ideas.repository.ts)): `create`, `findById`, `findByTeam` (pageable), `update`, `delete`, `promote` (sets `projectId` + `status`).
- [x] **`IdeaService`** ([`ideas.service.ts`](../packages/gateway/src/ideas/ideas.service.ts)): CRUD + scoped list (by `teamId`) + team-ownership guard. Registers/removes from `SearchIndexService` (title + body, type `'idea'`) on write.
- [x] **`IdeaController`** ([`ideas.controller.ts`](../packages/gateway/src/ideas/ideas.controller.ts)): `GET /ideas`, `POST /ideas`, `GET /ideas/:id`, `PATCH /ideas/:id`, `DELETE /ideas/:id`. `@RequiresRole('member')` on write routes. Thin — zod-validate body, delegate to service.
- [x] **`IdeaModule`** ([`ideas.module.ts`](../packages/gateway/src/ideas/ideas.module.ts)) registered in `AppModule`.
- [x] **`💡 Ideas` sidenav entry** in the web sidenav component, above Projects, linking to `/ideas`.

---

## Theme B — Ideas views (table / list / grid) — **S–M** ✅ DONE (PR #215, 2026-06-26)

The browsable surface for all ideas.

- [x] **`/ideas` route** ([`packages/web/app/ideas/page.tsx`](../packages/web/app/ideas/page.tsx)): top-level page with view-mode toggle (table / list / grid) persisted to `localStorage`.
- [x] **`IdeaTable`** ([`components/ideas/IdeaTable.tsx`](../packages/web/components/ideas/IdeaTable.tsx)): sortable columns (title, status, created, project); status chip (`draft` / `refined` / `promoted`); project tag chip (name + link) when promoted; click row → idea detail.
- [x] **`IdeaList`** ([`components/ideas/IdeaList.tsx`](../packages/web/components/ideas/IdeaList.tsx)): compact row — title, excerpt (first 120 chars of body), status, project chip; keyboard navigable.
- [x] **`IdeaGrid`** ([`components/ideas/IdeaGrid.tsx`](../packages/web/components/ideas/IdeaGrid.tsx)): card view — title, body excerpt, status badge, project chip; hover shows "Open" / "Chat" shortcuts.
- [x] **Filter bar**: status multi-select (`all / draft / refined / promoted`) + debounced text search against global FTS5 (`GET /search?q=...&type=idea`).
- [x] **TanStack Query** `useIdeas(filters)` hook; invalidate on `idea.created`, `idea.updated`, `idea.deleted` WS events (subscribe via the existing `useTaskEvents`-pattern WS hook).
- [x] **`/ideas/:id` route** ([`packages/web/app/ideas/[id]/page.tsx`](../packages/web/app/ideas/[id]/page.tsx)): idea detail with title, rendered markdown body, status, project chip (if promoted), message history preview, "Open chat" + "Promote" buttons.

---

## Theme C — AI chat composer — **M** ✅ DONE (backend PR #215; UI PR #232, 2026-06-27)

The heart of the feature: an AI conversation that seeds and refines an idea.

- [x] **`POST /ideas/:id/messages`** in `IdeaController`: appends the user message, calls the LLM (`IdeaService.chat` → `LlmService`) with `IDEA_COMPOSER_SYSTEM_PROMPT`, saves the assistant reply, returns `{ userMessage, assistantMessage }`. Fails open to a deterministic "AI is not configured" reply when no provider is set.
- [x] **`GET /ideas/:id/messages`** — returns full `IdeaMessage[]` for the idea, ordered by `createdAt`.
- [x] **`IDEA_COMPOSER_SYSTEM_PROMPT`** in [`ideas.prompts.ts`](../packages/gateway/src/ideas/ideas.prompts.ts): product thinking-partner that clarifies/expands/structures the idea; does *not* auto-create anything.
- [x] **`IdeaChatDrawer`** ([`components/ideas/IdeaChatDrawer.tsx`](../packages/web/components/ideas/IdeaChatDrawer.tsx)): slides over the idea detail. Left = chat thread (user/assistant bubbles); right = live "Refined body preview". Send on `⌘Enter`.
- [x] **"Apply to idea"** button — writes the assistant's last reply back to `idea.body` via `PATCH /ideas/:id`; status advances `draft → refined`.
- [x] **New idea flow**: "+ New idea" → `POST /ideas` (empty draft) → deep-links straight into `IdeaChatDrawer` (`?chat=open`). No blank-page create form.
- [x] **Modify existing idea**: "Open chat" re-opens `IdeaChatDrawer` with full history restored from `GET /ideas/:id/messages`.
- [x] Unit tests: `IdeaService` chat append + message history; `IdeaChatDrawer` RTL; Playwright e2e flow (`ideas-chat.e2e.ts`).

---

## Theme D — Promote idea → project — **S–M** ✅ DONE (PR #234, 2026-06-27)

One click from idea to a live project, with a bidirectional link preserved.

> **Decision (settled with the human):** no repo picker on promote — a project can span **multiple** repos, so there's no `project.repoId` (per Themes C/E, repos are per-request). The promote payload is just `{ name }`; repos are wired per-task/phase-doc afterwards.

- [x] **`Project.ideaId`** — column already existed in schema; now persisted by `createProject` (additive `ideaId` on `CreateProjectRequest`) and surfaced via `hydrate`. Exposed on the `Project` shared type + zod schema.
- [x] **`POST /ideas/:id/promote`** in `IdeaController`: accepts `{ name }` (`PromoteIdeaRequest`), creates a `Project` via `ProjectsService.createProject(...)` with `ideaId` set, updates `idea.projectId` + `idea.status = 'promoted'`, emits `idea.updated`, returns `{ idea, project }`. `@RequiresRole('member')`; `ConflictException` if already promoted.
- [x] **`PromoteModal`** ([`components/ideas/PromoteModal.tsx`](../packages/web/components/ideas/PromoteModal.tsx)): project name field (prefilled from idea title), confirm → routes to the new project. Opens from "Promote to project" on idea detail.
- [x] **Project chip on idea detail**: once promoted, shows a `<ProjectChip>` (project name + link via the `/projects?open=<id>` deep-link). Status reads `promoted`.
- [x] **"Created from idea 💡" badge on project**: `IdeaSourceBadge` in the `ProjectModal` Details tab, back-linking to the idea when `project.ideaId` is set.
- [x] Idea persists after promotion — **not deleted or archived**; status `'promoted'`, fully editable, the chip is the navigational bridge.
- [x] Tests: `IdeaService.promote` unit (links, defaults, conflict, scope); `PromoteModal` RTL (prefill, payload, route, blank guard); `ideas-promote.e2e.ts` flow + screenshots.

---

## Theme E — Phase doc editor (GitHub-backed) — **M–L** ✅ DONE (PR #229, 2026-06-26)

Phase docs live as real `.md` files in the project's linked repository, under `.midnite/phases/`.

> **Plan deviations (settled with the human before building):** the prerequisite infra the original plan assumed didn't exist, so — (1) **project→repo:** no `project.repoId`; the UI picks a repo explicitly and `ownerRepo` is resolved server-side via `ReposService` (`?repoId=`); (2) **GitHub auth:** the local **`gh` CLI** (mirrors `PrStatusService`), not `WorkflowCredentialsService` — GitHub failures map to `502`; (3) **UI host:** a **"Phase docs" tab inside `ProjectModal`** (no `/projects/[id]` route exists). `PhaseDocList`/`PhaseDocEditor` are folded into one `PhaseDocsTab` reusing the toggle-mode `MarkdownEditor` (not a split-pane).

- [x] **`PhaseDoc`** shared type in [`@midnite/shared`](../packages/shared/src/phase-doc.ts) + `Create`/`UpdatePhaseDocRequestSchema` + `phaseDocFilename` slug helper; barrel export.
- [x] **`PhaseDocsService`** ([`phase-docs.service.ts`](../packages/gateway/src/phase-docs/phase-docs.service.ts)): `list`/`get`/`create` (PUT no-SHA)/`update` (PUT w/ SHA)/`delete` over the GitHub Contents API via `gh api`. Stale-SHA → `PhaseDocConflictError`; 404 → `PhaseDocNotFoundError`; gh down/unauth → `GithubUnavailableError`.
- [x] **`PhaseDocsController`** ([`phase-docs.controller.ts`](../packages/gateway/src/phase-docs/phase-docs.controller.ts)): `GET`/`POST /projects/:id/phase-docs`, `GET`/`PUT`/`DELETE /projects/:id/phase-docs/:filename`. Resolves `ownerRepo` from `?repoId=`; maps domain errors → `409`/`404`/`502`; rejects `../`-traversal filenames.
- [x] **`PhaseDocsModule`** registered in `AppModule`; imports `ProjectsModule`, `ReposModule`.
- [x] **"Phase docs" tab** in [`ProjectModal`](../packages/web/components/project-modal.tsx) → [`PhaseDocsTab`](../packages/web/components/projects/phase-docs/PhaseDocsTab.tsx): repo picker + empty-states; file list with "+ New phase doc" / open / delete; `MarkdownEditor`; stale-SHA `409` → reload-and-retry notice.
- [x] Repo path `.midnite/phases/<slug>.md`, slug via `phaseDocFilename` kebab-case sanitisation.
- [x] Tests: `PhaseDocsService` unit + `PhaseDocsController` spec + `PhaseDocsTab` RTL + Playwright screenshot spec.

---

## Theme F — Phase doc → task seeder — **M** ✅ DONE (PR #233, 2026-06-27)

Parse a phase doc into a curated, project-linked task board slice — and tag each task so Theme G can find its line again.

- [x] **`BreakdownService.parseDoc(content)`** ([`breakdown.service.ts`](../packages/gateway/src/agent/breakdown.service.ts), additive): LLM-assisted extraction (`PHASE_DOC_PARSE_SYSTEM_PROMPT`) of `- [ ]` items / heading-implied tasks, kind, priority, dependency edges → the existing Phase 28 `Breakdown`. **Fails open** to a deterministic checkbox parse when the LLM is disabled; both paths compute the same stable `anchor`.
- [x] **`PHASE_DOC_PARSE_SYSTEM_PROMPT`** in [`projects.prompts.ts`](../packages/gateway/src/projects/projects.prompts.ts): extract tasks from midnite-style docs (checkboxes, `S/M/L` tags, theme headings) → `Breakdown`.
- [x] **`phaseItemAnchor(line)`** in [`phase-doc.ts`](../packages/shared/src/phase-doc.ts) + `anchor` on `BreakdownTask` — stable slug computed identically at seed time and sync time (enables Theme G).
- [x] **`POST .../phase-docs/:filename/seed`** (preview only, creates nothing) + **`POST .../seed-tasks`** in `PhaseDocsController`: creates project-linked, edge-wired tasks tagged `phase-doc:<filename>` + `phase-item:<anchor>` (via an additive optional `tagsFor` callback on `createTasksFromBreakdown`).
- [x] **`SeedTasksModal`** ([`components/projects/phase-docs/SeedTasksModal.tsx`](../packages/web/components/projects/phase-docs/SeedTasksModal.tsx)): reuses Phase 28's `BreakdownEditor` to curate the extracted list; "🌱 Seed tasks" entry in `PhaseDocsTab`.
- [x] Unit tests: `breakdown.service.spec` (LLM + deterministic fallback, stable anchors); `phase-docs.controller.spec` (seed preview + seed-tasks, filename guard); `SeedTasksModal` RTL.

---

## Theme G — Phase-doc ↔ board sync-back — **M–L** *(open)*

The closing loop: as seeded tasks complete, their checkboxes tick themselves in the GitHub `.md` — midnite running its own `todo/` workflow on itself. *(Folded in from the former Phase 42 Theme E.)*

- [ ] **`PhaseDocSyncService`** ([`phase-doc-sync.service.ts`](../packages/gateway/src/phase-docs/phase-doc-sync.service.ts)): subscribes to `TaskEventBus` in `onApplicationBootstrap` (mirroring `SearchService` — `tasks.service` is **not** touched). On a transition it inspects the task's tags for `phase-doc:<filename>` + `phase-item:<anchor>`; absent → ignored.
- [ ] **Tick on done / un-tick on reopen** (symmetric): a task entering `done` flips its line `- [ ]` → `- [x]`; leaving `done` flips it back. The doc always reflects live board state.
- [ ] **Line resolution**: match `phase-item:<anchor>` against each line's recomputed `phaseItemAnchor` — exact first, fuzzy fallback; unmatched task logs `warn` + skips (no guessing-writes).
- [ ] **Idempotent writes**: if the target line already holds the desired state, skip the `PUT` (no empty commits).
- [ ] **Per-doc serialized queue + 409 retry + debounce**: writes to a given `.md` run one-at-a-time through an in-memory per-doc mutex; a stale-SHA `409` triggers a bounded refetch-and-retry; rapid completions per doc coalesce into one commit.
- [ ] **Resilience**: best-effort — any failure (no credential, repo unreachable, unmatched line) logs `warn` once and **never blocks the task transition**.
- [ ] **Sync toggle**: a project-level `phaseDocSync` flag, auto-on when the project has a linked repo + GitHub credential, switchable off in project settings.
- [ ] Unit tests: `PhaseDocSyncService` with fakes — done ticks the right line; reopen un-ticks; already-correct skips the PUT; unmatched anchor logs + skips; concurrent completions serialize; disabled flag short-circuits.

---

## Files this phase touches (map)

**Shared (`@midnite/shared`):**
- New [`packages/shared/src/idea.ts`](../packages/shared/src/idea.ts) — `IdeaStatus`, `Idea`, `IdeaMessage`, request/response schemas
- New [`packages/shared/src/phase-doc.ts`](../packages/shared/src/phase-doc.ts) — `PhaseDoc`, `CreatePhaseDocRequestSchema`, `UpdatePhaseDocRequestSchema`
- [`packages/shared/src/index.ts`](../packages/shared/src/index.ts) — barrel exports
- New `promoteIdea`, `listIdeas`, `createIdea`, `patchIdea`, `deleteIdea`, `sendIdeaMessage`, `listIdeaMessages`, `promoteIdeaToProject`, `listPhaseDocs`, `getPhaseDoc`, `createPhaseDoc`, `updatePhaseDoc`, `deletePhaseDoc`, `seedPhaseDoc` in the typed API client

**Gateway:**
- [`packages/gateway/src/db/schema.ts`](../packages/gateway/src/db/schema.ts) — `ideas` + `idea_messages` tables + `projects.ideaId` column
- New migration in [`packages/gateway/src/db/migrations/`](../packages/gateway/src/db/migrations/)
- New [`packages/gateway/src/ideas/`](../packages/gateway/src/ideas/) — `ideas.module.ts`, `ideas.controller.ts`, `ideas.service.ts`, `ideas.repository.ts`, `ideas.prompts.ts`
- New [`packages/gateway/src/phase-docs/`](../packages/gateway/src/phase-docs/) — `phase-docs.module.ts`, `phase-docs.controller.ts`, `phase-docs.service.ts`
- [`packages/gateway/src/agent/breakdown.service.ts`](../packages/gateway/src/agent/breakdown.service.ts) — additive `parseDoc` method
- [`packages/gateway/src/agent/breakdown.prompts.ts`](../packages/gateway/src/agent/breakdown.prompts.ts) — `PHASE_DOC_PARSE_SYSTEM_PROMPT`
- [`packages/gateway/src/projects/projects.service.ts`](../packages/gateway/src/projects/projects.service.ts) — `ideaId` on create
- [`packages/gateway/src/app.module.ts`](../packages/gateway/src/app.module.ts) — register `IdeaModule`, `PhaseDocsModule`
- [`packages/gateway/src/search/lib/index-mappers.ts`](../packages/gateway/src/search/lib/index-mappers.ts) — idea index mapper

**Web (`packages/web`):**
- New [`app/ideas/page.tsx`](../packages/web/app/ideas/page.tsx), [`app/ideas/[id]/page.tsx`](../packages/web/app/ideas/[id]/page.tsx)
- New [`components/ideas/`](../packages/web/components/ideas/) — `IdeaCard.tsx`, `IdeaTable.tsx`, `IdeaList.tsx`, `IdeaGrid.tsx`, `IdeaChatDrawer.tsx`, `PromoteModal.tsx`
- New [`components/projects/phase-docs/`](../packages/web/components/projects/phase-docs/) — `PhaseDocList.tsx`, `PhaseDocEditor.tsx`, `SeedTasksModal.tsx`
- [`components/layout/Sidenav.tsx`](../packages/web/components/layout/Sidenav.tsx) (or equivalent) — `💡 Ideas` entry
- [`app/projects/[id]/page.tsx`](../packages/web/app/projects/[id]/page.tsx) — "Phase docs" tab + `IdeaSourceBadge`
- New `useIdeas()`, `useIdeaMessages()`, `usePhaseDocs()` TanStack Query hooks in [`hooks/`](../packages/web/hooks/)

---

## Verification

- [ ] `💡 Ideas` appears in the sidenav; navigating to `/ideas` shows the list in the selected view mode; switching table / list / grid persists across page reloads.
- [ ] "+ New idea" creates a draft idea and immediately opens the AI chat drawer; sending a message returns an AI reply; "Apply to idea" writes the refined body back and advances status to `refined`.
- [ ] Returning to an existing idea and opening chat restores the full conversation history; the thread continues correctly.
- [ ] Filtering by `promoted` and searching by keyword (via FTS5) returns correct results; WS event from another tab invalidates the list.
- [ ] "Promote to project" opens the modal, prefills the name, creates the project, and immediately shows a project chip on the idea card with a working link to the project; the project detail shows "Created from idea 💡" with a working back-link. The idea still exists at `/ideas/:id`.
- [ ] Inside a project with a linked repo + GitHub credential: the "Phase docs" tab lists `.midnite/phases/*.md` files from the repo; creating a new doc commits it to the repo; editing + saving updates the file (passes SHA); deleting removes it.
- [ ] "Phase docs" tab on a project with **no linked repo** shows a clear empty-state notice, not a crash.
- [ ] "🌱 Seed tasks" on a phase doc: the extraction preview shows the parsed tasks (title, kind, priority, blockers); the user can edit/remove before confirm; confirming creates the tasks linked to the project and tagged with `phase-doc:<filename>`; tasks appear on the board.
- [ ] `BreakdownService.parseDoc` with LLM disabled falls back to deterministic checkbox extraction — creation still works.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across the graph.

---

## Decisions / open questions

1. **Idea → project cardinality** *(settled in brainstorm).* **One idea → one project.** `idea.projectId` is a single nullable FK. Multiple-project spawning is not in scope here.
2. **Chat history persistence** *(settled in brainstorm).* **Persisted per idea** in `idea_messages` table. Conversations survive page refresh and can be resumed indefinitely.
3. **Phase doc storage** *(settled in brainstorm).* **GitHub Contents API** — docs are real `.md` files committed to `.midnite/phases/` in the project's linked repo. Requires `Repo.ownerRepo` + a GitHub token in the credential vault (Phase 14). Gateway never clones locally.
4. **Task seeding strategy** *(settled in brainstorm).* **LLM-assisted** via `BreakdownService.parseDoc` — sends the full doc to Claude for structured extraction. Falls back to deterministic `- [ ]` parse if LLM is disabled.
5. **GitHub write path** *(settled in brainstorm).* **GitHub Contents API** (PUT/DELETE `repos/:owner/:repo/contents/...`), not local clone. Token resolved from `WorkflowCredentialsService`.
6. **No-repo empty state** *(recommend: graceful).* "Phase docs" tab renders a notice ("Link a repo with a GitHub credential to author phase docs here") rather than hiding the tab. Makes the feature discoverable even before a repo is wired.
7. **Idea `promoted` status vs soft-delete** *(recommend: status only).* Promoted ideas stay fully editable and visible in the list with a `promoted` chip — they are not archived or read-only. The project link is the navigational bridge; the idea remains a living document.
8. **Chat streaming transport** *(open — recommend SSE).* `POST /ideas/:id/messages` could stream the assistant reply via SSE (simpler, uni-directional) or use the existing WS. SSE is the simpler fit here since the request is already HTTP; confirm when building Theme C.
9. **`BreakdownService.parseDoc` prompt home** *(recommend: `breakdown.prompts.ts`).* The new prompt lives alongside the existing breakdown prompts, not in a separate file, to keep all LLM prompts co-located.
10. **Phase doc SHA caching** *(open).* The GitHub API requires the current SHA for updates/deletes. The web client must cache the SHA from the last `GET` response and pass it on `PUT`/`DELETE`. A stale SHA returns a 409 from GitHub — handle with a "reload and retry" notice in the editor.
