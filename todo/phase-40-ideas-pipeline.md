# Phase 40 — Ideas: AI-composed, project-linked, phase-planned

> midnite already knows how to run work — what it can't do is help you **think up** that work in a structured way, let it evolve with AI, and seamlessly turn an idea into a sequenced project. The machinery that exists: project creation ([`projects.service.ts`](../packages/gateway/src/projects/projects.service.ts)), the LLM planner ([`LlmService`](../packages/gateway/src/agent/llm/llm.service.ts)), the structured breakdown from Phase 28 ([`BreakdownService`](../packages/gateway/src/agent/breakdown.service.ts)), GitHub executor credentials from Phase 14's credential vault, and `Repo.ownerRepo` wired in Phase 37. **Phase 40 adds an Ideas surface** — a new top-level sidenav section where raw ideas are born, expanded by AI conversation, refined over time, and eventually promoted to projects, with phase docs living as real `.md` files in the project's repository and seeding the task board.

> **Scope guardrails (CLAUDE.md).** `shared` is the contract — new `Idea`, `IdeaMessage`, `PhaseDoc` types and their zod schemas go in `@midnite/shared`; `web` and `cli` stay pure HTTP/WS clients. The ideas feature uses the **existing LLM infrastructure** (`LlmService.chat`) rather than a new AI service. Phase doc file I/O goes through the **GitHub Contents API** using the credential vault already built in Phase 14 — no filesystem cloning. The `BreakdownService.parseDoc` extension is **additive** (the existing generate path is untouched). Cross-domain FTS5 registration follows the established `SearchIndexService` pattern (Phase 20). Every DB table change gets a forward-only Drizzle migration. **Out of scope:** idea versioning / diffs, one idea → multiple projects, offline fallback when no repo/credential is linked, local-clone git writes.

> Effort tags: **S** small · **M** medium · **L** large. Themes ordered **A → B → C → D → E → F**. Every box starts unchecked.

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

## Theme C — AI chat composer — **M**

The heart of the feature: an AI conversation that seeds and refines an idea.

- [ ] **`POST /ideas/:id/messages`** in `IdeaController`: accepts `IdeaChatRequestSchema` (`{ content: string }`), appends the user message to `idea_messages`, calls `LlmService.chat(history, IDEA_COMPOSER_SYSTEM_PROMPT)`, saves the assistant reply, returns `{ userMessage, assistantMessage }`.
- [ ] **`GET /ideas/:id/messages`** — returns full `IdeaMessage[]` for the idea, ordered by `createdAt`.
- [ ] **`IDEA_COMPOSER_SYSTEM_PROMPT`** in [`ideas.prompts.ts`](../packages/gateway/src/ideas/ideas.prompts.ts): instructs the model to act as a product thinking partner — help clarify, expand, and structure the idea, asking focused questions and proposing structure. Does *not* auto-create anything.
- [ ] **`IdeaChatDrawer`** ([`components/ideas/IdeaChatDrawer.tsx`](../packages/web/components/ideas/IdeaChatDrawer.tsx)): slides over the idea detail. Left panel: chat thread (user/assistant bubbles, streaming via SSE or WS); right panel: live idea body preview. Send on `⌘Enter`.
- [ ] **"Apply to idea"** button in the drawer — writes the assistant's last refined body back to `idea.body` via `PATCH /ideas/:id`; status advances to `'refined'`.
- [ ] **New idea flow**: "+ New idea" button → `POST /ideas` (creates draft with empty body) → immediately opens `IdeaChatDrawer`. No blank-page create form.
- [ ] **Modify existing idea**: "Open chat" button on idea detail re-opens `IdeaChatDrawer` with full history restored from `GET /ideas/:id/messages`.
- [ ] Unit tests: `IdeaService` chat append + message history; `IdeaChatDrawer` RTL (renders thread, calls API on send, "Apply" patches body).

---

## Theme D — Promote idea → project — **S–M**

One click from idea to a live project, with a bidirectional link preserved.

- [ ] **`Project.ideaId`** (nullable) column in [`gateway/src/db/schema.ts`](../packages/gateway/src/db/schema.ts) (additive migration). Exposed in the `Project` shared type + `project.ts` zod schema.
- [ ] **`POST /ideas/:id/promote`** in `IdeaController`: accepts `{ name: string, repoId?: string }` (zod-validated), creates a `Project` via `ProjectsService.create(...)` with `ideaId` set, updates `idea.projectId = newProject.id` and `idea.status = 'promoted'`, emits `idea.updated` WS event, returns `{ idea, project }`. `@RequiresRole('member')`.
- [ ] **`PromoteModal`** ([`components/ideas/PromoteModal.tsx`](../packages/web/components/ideas/PromoteModal.tsx)): project name field (prefilled from idea title), optional repo picker (existing `RepoSelector`), confirm button. Opens from "Promote to project" in idea detail + idea card overflow menu.
- [ ] **Project chip on idea card/detail**: once promoted, idea card and detail show a `<ProjectChip>` (project name + link to `/projects/:id`). Status reads `promoted`.
- [ ] **"Created from idea 💡" badge on project**: project detail header shows an `IdeaSourceBadge` linking back to `/ideas/:id` when `project.ideaId` is set.
- [ ] Idea persists at `/ideas/:id` after promotion — it is **not deleted or archived**; status is `'promoted'` and the project chip is the navigational link.
- [ ] Unit tests: `IdeaService.promote` creates project + updates idea; UI: `PromoteModal` submits correct payload, chips render on both sides.

---

## Theme E — Phase doc editor (GitHub-backed) — **M–L**

Phase docs live as real `.md` files in the project's linked repository.

- [ ] **`PhaseDoc`** shared type in [`@midnite/shared`](../packages/shared/src/phase-doc.ts): `{ name: string, path: string, sha: string, content: string, updatedAt: string }`. `CreatePhaseDocRequestSchema` (`{ name, content }`), `UpdatePhaseDocRequestSchema` (`{ content, sha }`). Barrel export.
- [ ] **`PhaseDocsService`** ([`phase-docs.service.ts`](../packages/gateway/src/phase-docs/phase-docs.service.ts)): wraps the GitHub Contents API. Methods: `list(ownerRepo, token)` → `GET /repos/:o/:r/contents/.midnite/phases/`; `get(...)` → single file; `create(...)` → `PUT` with no SHA (new file); `update(...)` → `PUT` with SHA; `delete(...)` → `DELETE` with SHA. Resolves the GitHub token from `WorkflowCredentialsService` using the project's linked repo credential. Throws a `NoCredentialError` if no token is configured.
- [ ] **`PhaseDocsController`** ([`phase-docs.controller.ts`](../packages/gateway/src/phase-docs/phase-docs.controller.ts)): `GET /projects/:id/phase-docs`, `POST /projects/:id/phase-docs`, `GET /projects/:id/phase-docs/:filename`, `PUT /projects/:id/phase-docs/:filename`, `DELETE /projects/:id/phase-docs/:filename`. Resolves `ownerRepo` from the project's linked repo via `ReposService`. Returns `404` if project has no linked repo or `403` if no GitHub credential.
- [ ] **`PhaseDocsModule`** registered in `AppModule`; imports `ReposModule`, `WorkflowCredentialsModule`.
- [ ] **"Phase docs" tab** on the project detail page ([`packages/web/app/projects/[id]/page.tsx`](../packages/web/app/projects/[id]/page.tsx) or its tab component). Only rendered when the project has a linked repo. Shows a "No repo or credential configured" empty state otherwise.
- [ ] **`PhaseDocList`** ([`components/projects/phase-docs/PhaseDocList.tsx`](../packages/web/components/projects/phase-docs/PhaseDocList.tsx)): file list (name, last updated from SHA/GitHub); "+ New phase doc" button; per-item "Edit" / "Seed tasks" / "Delete" actions.
- [ ] **`PhaseDocEditor`** ([`components/projects/phase-docs/PhaseDocEditor.tsx`](../packages/web/components/projects/phase-docs/PhaseDocEditor.tsx)): split-pane markdown editor (textarea left, rendered preview right) with a save button. On save: `PUT` if existing (passes SHA), `POST` if new. Optimistic update on success.
- [ ] File path in repo: `.midnite/phases/<slug>.md` where `slug` is the user-supplied name run through `kebab-case` sanitisation.

---

## Theme F — Phase doc → task seeder — **M**

Parse a phase doc and turn its items into a project-linked task board slice.

- [ ] **`BreakdownService.parseDoc(content: string)`** in [`breakdown.service.ts`](../packages/gateway/src/agent/breakdown.service.ts) (additive method): sends the phase doc markdown to `LlmService.generateStructured` with a `PHASE_DOC_PARSE_SYSTEM_PROMPT` that instructs extraction of `- [ ]` items, implied tasks from headings/prose, kind, priority, and dependency edges where explicit. Returns `Breakdown` (existing Phase 28 type). Fails open to a deterministic `- [ ]` parse if LLM is disabled.
- [ ] **`PHASE_DOC_PARSE_SYSTEM_PROMPT`** in [`breakdown.prompts.ts`](../packages/gateway/src/agent/breakdown.prompts.ts) (or a new `phase-docs.prompts.ts`): instructs the model to extract tasks from midnite-style phase docs (checkboxes, `S/M/L` effort tags, theme headings) and emit a `Breakdown`.
- [ ] **`POST /projects/:id/phase-docs/:filename/seed`** in `PhaseDocsController`: fetches file content, calls `BreakdownService.parseDoc`, returns `BreakdownPreviewResponse` (existing shared type). Does **not** create tasks itself — preview only.
- [ ] **`SeedTasksModal`** ([`components/projects/phase-docs/SeedTasksModal.tsx`](../packages/web/components/projects/phase-docs/SeedTasksModal.tsx)): reuses the `BreakdownEditor` from Phase 28 (edit/remove tasks + blocker chips) to let the user curate the extracted list before committing. Confirm → `POST /tasks/bulk` creating tasks linked to the project. Tasks include a `tags` entry of the form `phase-doc:<filename>` for traceability.
- [ ] **"🌱 Seed tasks" button** per phase doc in `PhaseDocList` and `PhaseDocEditor`; opens `SeedTasksModal`.
- [ ] Unit tests: `BreakdownService.parseDoc` (parses checkbox items + headings; LLM-disabled deterministic fallback); `SeedTasksModal` RTL (renders extracted list, confirm calls bulk create).

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
