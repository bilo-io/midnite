# Phase 42 — Ideas pipeline: complete & self-tracking

> Phase 40 stood up the Ideas surface — the `ideas` + `idea_messages` tables, CRUD ([`ideas.service.ts`](../packages/gateway/src/ideas/ideas.service.ts)), the table/list/grid views ([`components/ideas/`](../packages/web/components/ideas/)), and the **chat backend** (`GET`/`POST /ideas/:id/messages` already live in [`ideas.controller.ts`](../packages/gateway/src/ideas/ideas.controller.ts)). What it never finished: the chat *UI*, promotion to a project, GitHub-backed phase docs, and the task seeder. **Phase 42 completes that pipeline end-to-end** — and adds the closing loop Phase 40 never envisioned: **phase docs that tick themselves** as the tasks they seeded reach `done`, so a `.midnite/phases/*.md` becomes a living progress tracker maintained from the board.

> **Scope guardrails (CLAUDE.md).** `shared` is the contract — the new `PhaseDoc` types + zod schemas go in [`@midnite/shared`](../packages/shared/src/index.ts); `web` and `cli` stay pure HTTP/WS clients. Reuse the **existing** machinery: chat uses `LlmService.chat` (already wired in Phase 40's backend), phase-doc I/O goes through the **GitHub Contents API** with the Phase 14 credential vault (`WorkflowCredentialsService`) — no local clone, the seeder extends `BreakdownService` **additively** (Phase 28's generate path is untouched), and sync-back subscribes to the existing **`TaskEventBus`** exactly as `SearchService` does ([`search.service.ts`](../packages/gateway/src/search/search.service.ts)) — `tasks.service` is never edited. Every DB change is a forward-only Drizzle migration. **Out of scope:** idea versioning / diffs, one idea → many projects, local-clone git writes, a merge-conflict UI beyond reload-and-retry, syncing back anything other than checkbox state.

> Effort tags: **S** small · **M** medium · **L** large. Themes ordered **A → B → C → D → E**; A–D complete Phase 40's outstanding work (corrected for what's already built), E is the new elevation layer. Every box starts unchecked.

---

## Theme A — Chat composer UI — **M**

The chat *backend* shipped with Phase 40 (`GET`/`POST /ideas/:id/messages`, `idea_messages` table). This theme is the **web side only** — the conversational surface that seeds and refines an idea.

- [ ] **`IdeaChatDrawer`** ([`components/ideas/IdeaChatDrawer.tsx`](../packages/web/components/ideas/IdeaChatDrawer.tsx)): slides over the idea detail. Left panel: chat thread (user/assistant bubbles); right panel: live idea body preview. Send on `⌘Enter`.
- [ ] **Streaming the assistant reply** via SSE (see decision 5) — render tokens as they arrive; fall back to a single response if streaming is unavailable.
- [ ] **"Apply to idea"** button — writes the assistant's last refined body back to `idea.body` via `PATCH /ideas/:id`; status advances `draft` → `refined`.
- [ ] **New idea flow**: "+ New idea" → `POST /ideas` (empty draft) → immediately opens `IdeaChatDrawer`. No blank-page create form.
- [ ] **Resume existing chat**: "Open chat" on idea detail re-opens the drawer with full history restored from `GET /ideas/:id/messages`.
- [ ] **`useIdeaMessages(ideaId)`** TanStack Query hook + typed client methods `sendIdeaMessage`, `listIdeaMessages` (add to the shared API client if not already present from Phase 40's backend work).
- [ ] Unit tests: `IdeaChatDrawer` RTL — renders thread, calls API on send, "Apply" patches body and flips status; history restore on re-open.

---

## Theme B — Promote idea → project — **S–M**

One click from idea to a live project, with a bidirectional link preserved.

- [ ] **`Project.ideaId`** (nullable) column in [`gateway/src/db/schema.ts`](../packages/gateway/src/db/schema.ts) (additive forward-only migration). Exposed on the `Project` shared type + `project.ts` zod schema.
- [ ] **`POST /ideas/:id/promote`** in [`ideas.controller.ts`](../packages/gateway/src/ideas/ideas.controller.ts): accepts `{ name: string, repoId?: string }` (zod-validated), creates a `Project` via `ProjectsService.create(...)` with `ideaId` set, updates `idea.projectId = newProject.id` + `idea.status = 'promoted'`, emits `idea.updated` over the idea WS gateway, returns `{ idea, project }`. `@RequiresRole('member')`.
- [ ] **`projects.service.ts`** — accept `ideaId` on create (additive, optional param).
- [ ] **`PromoteModal`** ([`components/ideas/PromoteModal.tsx`](../packages/web/components/ideas/PromoteModal.tsx)): project name field (prefilled from idea title), optional repo picker (existing `RepoSelector`), confirm. Opens from "Promote to project" on idea detail + the idea card overflow menu.
- [ ] **Bidirectional chips**: promoted idea shows a `<ProjectChip>` (name + link to `/projects/:id`); project detail header shows an `IdeaSourceBadge` ("Created from idea 💡") back-linking to `/ideas/:id` when `project.ideaId` is set.
- [ ] Idea **persists** at `/ideas/:id` after promotion — not deleted/archived; status `promoted`, fully editable (see decision in Phase 40: status-only, not soft-delete).
- [ ] Unit tests: `IdeaService.promote` creates project + updates idea; `PromoteModal` submits correct payload; chips render on both sides.

---

## Theme C — Phase doc editor (GitHub-backed) — **M–L**

Phase docs live as real `.md` files in the project's linked repository, under `.midnite/phases/`.

- [ ] **`PhaseDoc`** shared type in [`packages/shared/src/phase-doc.ts`](../packages/shared/src/phase-doc.ts) (new file): `{ name: string, path: string, sha: string, content: string, updatedAt: string }`. `CreatePhaseDocRequestSchema` (`{ name, content }`), `UpdatePhaseDocRequestSchema` (`{ content, sha }`). Barrel export from [`index.ts`](../packages/shared/src/index.ts).
- [ ] **`PhaseDocsService`** ([`phase-docs.service.ts`](../packages/gateway/src/phase-docs/phase-docs.service.ts)): wraps the GitHub Contents API — `list(ownerRepo, token)` → `GET …/contents/.midnite/phases/`; `get`; `create` (`PUT`, no SHA); `update` (`PUT`, with SHA); `delete` (`DELETE`, with SHA). Resolves the GitHub token from `WorkflowCredentialsService` via the project's linked-repo credential. Throws `NoCredentialError` when no token is configured.
- [ ] **`PhaseDocsController`** ([`phase-docs.controller.ts`](../packages/gateway/src/phase-docs/phase-docs.controller.ts)): `GET`/`POST /projects/:id/phase-docs`, `GET`/`PUT`/`DELETE /projects/:id/phase-docs/:filename`. Resolves `ownerRepo` from the project's linked repo via `ReposService`; `404` when no linked repo, `403` when no credential.
- [ ] **`PhaseDocsModule`** registered in [`app.module.ts`](../packages/gateway/src/app.module.ts); imports `ReposModule`, `WorkflowCredentialsModule`. (Note: `PhaseDocsService` is reused by Theme E — keep its write methods callable from another service.)
- [ ] **"Phase docs" tab** on the project detail page ([`app/projects/[id]/page.tsx`](../packages/web/app/projects/[id]/page.tsx)). Renders a clear empty-state ("Link a repo with a GitHub credential to author phase docs here") when there's no repo/credential — the tab is discoverable, not hidden.
- [ ] **`PhaseDocList`** ([`components/projects/phase-docs/PhaseDocList.tsx`](../packages/web/components/projects/phase-docs/PhaseDocList.tsx)): file list (name, last updated); "+ New phase doc"; per-item "Edit" / "🌱 Seed tasks" / "Delete".
- [ ] **`PhaseDocEditor`** ([`components/projects/phase-docs/PhaseDocEditor.tsx`](../packages/web/components/projects/phase-docs/PhaseDocEditor.tsx)): split-pane markdown editor (textarea + rendered preview), save button. `PUT` (with cached SHA) if existing, `POST` if new; optimistic update; on a stale-SHA `409`, surface a "reload and retry" notice (decision 3).
- [ ] Repo path: `.midnite/phases/<slug>.md`, slug = user name run through kebab-case sanitisation.
- [ ] Unit tests: `PhaseDocsService` (PUT-with/without-SHA, credential-missing throws); `PhaseDocEditor` RTL (save calls correct verb, 409 shows reload notice).

---

## Theme D — Phase doc → task seeder — **M**

Parse a phase doc into a curated, project-linked task board slice — and tag each task so Theme E can find its line again.

- [ ] **`BreakdownService.parseDoc(content: string)`** ([`breakdown.service.ts`](../packages/gateway/src/agent/breakdown.service.ts), additive): sends the doc to `LlmService.generateStructured` with `PHASE_DOC_PARSE_SYSTEM_PROMPT`, extracting `- [ ]` items + implied tasks from headings, kind, priority, and explicit dependency edges. Returns the existing Phase 28 `Breakdown` type. **Fails open** to a deterministic `- [ ]` parse when the LLM is disabled.
- [ ] **`PHASE_DOC_PARSE_SYSTEM_PROMPT`** in [`breakdown.prompts.ts`](../packages/gateway/src/agent/breakdown.prompts.ts) (co-located with existing breakdown prompts — Phase 40 decision #9): extract tasks from midnite-style docs (checkboxes, `S/M/L` tags, theme headings) → `Breakdown`.
- [ ] **`POST /projects/:id/phase-docs/:filename/seed`** in `PhaseDocsController`: fetches content, calls `parseDoc`, returns `BreakdownPreviewResponse` (existing shared type). **Preview only** — creates nothing.
- [ ] **`SeedTasksModal`** ([`components/projects/phase-docs/SeedTasksModal.tsx`](../packages/web/components/projects/phase-docs/SeedTasksModal.tsx)): reuses the Phase 28 `BreakdownEditor` (edit/remove tasks + blocker chips). Confirm → `POST /tasks/bulk` creating tasks linked to the project.
- [ ] **Anchor tagging (enables Theme E)**: each seeded task carries two `tags` entries — `phase-doc:<filename>` and `phase-item:<anchor>`, where `<anchor>` is a stable slug derived from the source checkbox text (decision 1). The deterministic parse path computes the same anchor so sync-back works even without the LLM.
- [ ] Unit tests: `parseDoc` (LLM path + deterministic fallback both emit items with stable anchors); `SeedTasksModal` RTL (renders extracted list, confirm calls bulk create with anchor tags).

---

## Theme E — Phase-doc ↔ board sync-back — **M–L** *(new)*

The closing loop: as seeded tasks complete, their checkboxes tick themselves in the GitHub `.md`. midnite running its own `todo/` workflow on itself.

- [ ] **`PhaseDocSyncService`** ([`phase-doc-sync.service.ts`](../packages/gateway/src/phase-docs/phase-doc-sync.service.ts)): subscribes to `TaskEventBus` in `onApplicationBootstrap` (mirroring `SearchService` — `tasks.service` is **not** touched). On a task transition it inspects the task's tags for `phase-doc:<filename>` + `phase-item:<anchor>`; if absent, ignores the event.
- [ ] **Tick on done / un-tick on reopen** (decision 2 — symmetric): a task entering `done` flips its line `- [ ]` → `- [x]`; a task **leaving** `done` (reopen/abandon→active) flips it back. The doc always reflects live board state.
- [ ] **Line resolution** (decision 1): match the `phase-item:<anchor>` against each checkbox line's computed anchor — exact first, then a fuzzy fallback; an unmatched task logs `warn` (with task id + anchor) and is skipped. No guessing-writes.
- [ ] **Idempotent writes**: if the target line already holds the desired state, **skip the `PUT`** entirely (no empty commits, no churn).
- [ ] **Per-doc serialized queue + 409 retry** (decision 3): writes to a given `.md` run one-at-a-time through an in-memory per-doc mutex; a stale-SHA `409` triggers a bounded refetch-and-retry. **Debounce** rapid completions per doc so a burst coalesces into one commit (decision 6).
- [ ] **Resilience**: all sync-back work is best-effort — any failure (no credential, repo unreachable, unmatched line) logs `warn` once and **never blocks or fails the task transition**.
- [ ] **Sync toggle** (decision 4): a project-level `phaseDocSync` flag, **auto-on when the project has a linked repo + GitHub credential**, switchable off in project settings. The service short-circuits when disabled.
- [ ] **Commit identity**: writes use the credential's GitHub identity with a message like `chore(midnite): tick "<item>" — task done` (decision 7).
- [ ] Unit tests: `PhaseDocSyncService` with a fake `TaskEventBus` + fake `PhaseDocsService` — done ticks the right line; reopen un-ticks; already-correct state skips the PUT; unmatched anchor logs + skips; concurrent completions serialize without a lost update; disabled flag short-circuits.

---

## Files this phase touches (map)

**Shared (`@midnite/shared`):**
- New [`packages/shared/src/phase-doc.ts`](../packages/shared/src/phase-doc.ts) — `PhaseDoc` + create/update request schemas
- [`packages/shared/src/project.ts`](../packages/shared/src/project.ts) — `ideaId` on `Project`
- [`packages/shared/src/index.ts`](../packages/shared/src/index.ts) — barrel exports
- Typed API client — `promoteIdeaToProject`, `sendIdeaMessage`, `listIdeaMessages`, `listPhaseDocs`, `getPhaseDoc`, `createPhaseDoc`, `updatePhaseDoc`, `deletePhaseDoc`, `seedPhaseDoc`

**Gateway:**
- [`packages/gateway/src/db/schema.ts`](../packages/gateway/src/db/schema.ts) — `projects.ideaId` column + forward-only migration in [`db/migrations/`](../packages/gateway/src/db/migrations/)
- [`packages/gateway/src/ideas/ideas.controller.ts`](../packages/gateway/src/ideas/ideas.controller.ts) + [`ideas.service.ts`](../packages/gateway/src/ideas/ideas.service.ts) — `promote` route + service method
- [`packages/gateway/src/projects/projects.service.ts`](../packages/gateway/src/projects/projects.service.ts) — `ideaId` on create
- New [`packages/gateway/src/phase-docs/`](../packages/gateway/src/phase-docs/) — `phase-docs.module.ts`, `phase-docs.controller.ts`, `phase-docs.service.ts`, `phase-doc-sync.service.ts`
- [`packages/gateway/src/agent/breakdown.service.ts`](../packages/gateway/src/agent/breakdown.service.ts) + [`breakdown.prompts.ts`](../packages/gateway/src/agent/breakdown.prompts.ts) — additive `parseDoc` + prompt
- [`packages/gateway/src/app.module.ts`](../packages/gateway/src/app.module.ts) — register `PhaseDocsModule`

**Web (`packages/web`):**
- New [`components/ideas/IdeaChatDrawer.tsx`](../packages/web/components/ideas/IdeaChatDrawer.tsx), [`components/ideas/PromoteModal.tsx`](../packages/web/components/ideas/PromoteModal.tsx)
- New [`components/projects/phase-docs/`](../packages/web/components/projects/phase-docs/) — `PhaseDocList.tsx`, `PhaseDocEditor.tsx`, `SeedTasksModal.tsx`
- [`app/projects/[id]/page.tsx`](../packages/web/app/projects/[id]/page.tsx) — "Phase docs" tab + `IdeaSourceBadge`
- [`app/ideas/[id]/page.tsx`](../packages/web/app/ideas/[id]/page.tsx) — wire "Open chat" / "Promote" / project chip
- New `useIdeaMessages()`, `usePhaseDocs()` TanStack Query hooks in [`hooks/`](../packages/web/hooks/)

---

## Verification

- [ ] "+ New idea" creates a draft and immediately opens the chat drawer; sending a message streams an AI reply; "Apply to idea" writes the refined body back and advances status to `refined`; re-opening restores full history.
- [ ] "Promote to project" opens the modal, prefills the name, creates the project, and shows a working project chip on the idea + an "Created from idea 💡" back-link on the project. The idea still exists at `/ideas/:id`.
- [ ] In a project **with** a linked repo + GitHub credential: the "Phase docs" tab lists `.midnite/phases/*.md`; creating/editing/deleting a doc commits the change (passes SHA); a stale SHA shows a reload-and-retry notice rather than crashing.
- [ ] "Phase docs" tab on a project with **no** linked repo shows the empty-state notice, not a crash.
- [ ] "🌱 Seed tasks" previews the parsed tasks (title, kind, priority, blockers), is editable before confirm, and on confirm creates project-linked tasks tagged `phase-doc:<filename>` + `phase-item:<anchor>`; tasks appear on the board.
- [ ] `BreakdownService.parseDoc` with the LLM disabled falls back to deterministic checkbox extraction (still emits stable anchors).
- [ ] **Sync-back:** moving a seeded task to `done` flips its `- [ ]`→`- [x]` in the repo `.md`; moving it back un-ticks; an already-correct line produces **no** commit; an unmatched anchor logs a `warn` and is skipped; a burst of completions on one doc coalesces into a single commit with no lost update; sync-back failure never blocks the task transition.
- [ ] Disabling `phaseDocSync` on a project stops further writes.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across the graph.

---

## Decisions / open questions

1. **Task → checkbox-line mapping** *(recommend: anchor slug).* At seed time (Theme D) each task is tagged `phase-item:<anchor>`, where `<anchor>` is a stable slug derived from the source checkbox text. Sync-back matches the anchor against each line's recomputed anchor — exact first, fuzzy fallback, log+skip on no match. Line numbers are **not** used (they shift when the doc is edited).
2. **Un-tick on reopen** *(recommend: yes — symmetric).* A task entering `done` ticks the box; a task leaving `done` un-ticks it. The doc tracks live board state rather than a one-way "ever completed" mark. Cheap given the matching machinery already exists.
3. **GitHub write concurrency** *(recommend: per-doc serial queue + bounded 409 refetch-retry).* The Contents API needs the current SHA; concurrent writes race. An in-memory per-doc mutex serialises writes; a `409` triggers a bounded refetch-and-retry. The editor (Theme C) shows a reload notice for user-driven `409`s; sync-back (Theme E) retries silently.
4. **Sync-back toggle** *(recommend: auto-on with linked repo + credential, off-switch in project settings).* Makes the loop work out of the box where it can, without surprising projects that don't want their docs rewritten.
5. **Chat streaming transport** *(recommend: SSE — carried from Phase 40 decision #8).* `POST /ideas/:id/messages` streams the assistant reply via SSE (uni-directional, already an HTTP request) rather than the WS bus.
6. **Coalescing rapid completions** *(recommend: per-doc debounce).* When several seeded tasks complete in a burst, debounce per doc so the ticks land in one commit instead of N — avoids commit spam and SHA churn.
7. **Commit message + author for sync-back** *(recommend: credential identity + descriptive message).* Writes use the resolved GitHub credential's identity with `chore(midnite): tick "<item>" — task done`, so repo history reads cleanly.
8. **Where `PhaseDocSyncService` lives** *(settled).* In the `phase-docs/` module (reuses `PhaseDocsService`'s write methods), subscribing to `TaskEventBus` like `SearchService` — never editing `tasks.service`.
