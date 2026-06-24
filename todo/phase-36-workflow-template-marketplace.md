# Phase 36 — Workflow Template Marketplace

> Workflows (Phases 6, 12, 14) are powerful but start from a blank canvas every time. Phase 36 adds a **template marketplace**: a curated library of reusable workflow blueprints that users can browse, preview, and install in one click. A workflow is already fully JSON-serializable (`trigger + nodes + edges`) — the hard work is the install UX (credential slot mapping), a built-in library of useful starting points, and the surfaces to browse and publish templates. The result: a new user can be running a "Notify on task completion" Slack workflow in under a minute, and a power user can turn any workflow into a shareable template for their team.

> **Builds on:** Phase 12 (expression engine, node types), Phase 14 (credential vault, integration executors), Phase 33 (user identity + team membership for scoping — templates are personal or team-visible). Phase 36 is independent of Phase 33 in the gateway layer (templates work without users — `authorId` is nullable); the team-scoping UI degrades gracefully when auth isn't shipped yet.

> **Scope guardrails (CLAUDE.md).** `WorkflowTemplate` is a new gateway module (`workflow-templates/`) following the same controller → service → repository layering as `workflows/`. The template `definition` JSON mirrors the `Workflow` graph shape already in `shared` — no new graph types. Credential slots are declared on the template, not inferred from node params. Install is a gateway service operation that calls `WorkflowsService.create()` — no duplication of create logic. Shared types (`WorkflowTemplate`, `InstallTemplateRequest`) live in `@midnite/shared`; `cli`/`web` are pure clients.

> Effort tags: **S** small · **M** medium · **L** large. Themes are ordered **A → B → C → D/E** (entity gates install gates seed gates UI). Every box starts unchecked — this is net-new work.

---

## Current baseline (what exists to build on)

- A `Workflow` is persisted as `trigger` (JSON) + `graph` (JSON `{ nodes, edges }`) in the `workflows` table. `hydrateWorkflow()` in [`workflows.repository.ts`](../packages/gateway/src/workflows/workflows.repository.ts) already deserialises this — templates share the same shape.
- `WorkflowsService.create(CreateWorkflowRequest)` generates new IDs, seeds the trigger node, and inserts the row. Install will call this after cloning the template definition — no new persistence logic needed.
- The credential vault (Phase 14) stores credentials by `id` in `credentials` table. Workflow nodes carry `credentialId?: string`. Templates need a level of indirection (a slot key) so the credential ID is resolved at install time per user.
- No `WorkflowTemplate` entity, no fork/duplicate endpoint, no template browse UI, no CLI template commands exist today.

---

## Theme A — Template entity & CRUD — **M**

The foundational data model and REST surface for workflow templates.

### A1. `workflow_templates` table + migration — **S**
- [x] New table in [`db/schema.ts`](../packages/gateway/src/db/schema.ts): `id` (UUIDv7), `slug` (unique, URL-safe), `name`, `description`, `category` (`monitoring` | `notifications` | `github` | `scheduling` | `ai` | `data`), `tags` (JSON array), `credential_slots` (JSON array — see A2), `definition` (JSON `{ trigger, nodes, edges }`), `thumbnail` (nullable text — URL or data URI), `published` (boolean, default false), `author_id` (nullable, FK-style to `users.id` — null for system templates), `created_at`, `updated_at`. Index on `(category, published)`, `(author_id)`.
- [x] Forward-only migration. No triggers.

### A2. Credential slots — **S**
- [x] Each template declares which credentials it needs via `credentialSlots: Array<{ key: string; type: string; description: string }>` stored as JSON. The `key` is a short label (e.g. `"slack-workspace"`); `type` is a credential type from [`node-types.ts`](../packages/shared/src/node-types.ts) (e.g. `"slack"`, `"github"`, `"smtp"`); `description` is a human-readable prompt ("Your Slack workspace integration"). Nodes in the definition reference slots via `credentialId: "slot:<key>"` — the `"slot:"` prefix is the sentinel that triggers resolution at install time.

### A3. `WorkflowTemplatesRepository` — **S**
- [x] [`workflow-templates/workflow-templates.repository.ts`](../packages/gateway/src/workflow-templates/workflow-templates.repository.ts): `insert`, `findById`, `findBySlug`, `list({ category?, published?, authorId? })`, `update`, `softDelete` (set `deleted_at` — never hard-delete system templates). Drizzle only.

### A4. `WorkflowTemplatesService` + `WorkflowTemplatesController` — **S–M**
- [x] Service owns: `createTemplate`, `listTemplates`, `getTemplate`, `updateTemplate`, `deleteTemplate` (reject on system templates).
- [ ] `createFromWorkflow(workflowId)` — export existing workflow as template (deferred to D3).
- [x] Controller routes: `POST /workflow-templates`, `GET /workflow-templates?category=&published=`, `GET /workflow-templates/:id`, `PATCH /workflow-templates/:id`, `DELETE /workflow-templates/:id`, `GET /:id/slots`, `POST /:id/install`.
- [x] Register `WorkflowTemplatesModule` in [`app.module.ts`](../packages/gateway/src/app.module.ts).

### A5. Shared types + API client — **S**
- [x] New [`packages/shared/src/workflow-template.ts`](../packages/shared/src/workflow-template.ts): `WorkflowTemplate`, `WorkflowTemplateCredentialSlot`, `CreateTemplateRequest`, `UpdateTemplateRequest`, `InstallTemplateRequest`, `WorkflowTemplateSummary`, `TemplateSlotsResponse`. Zod schemas + barrel export.

---

## Theme B — Install & fork — **M**

The core user action: turn a template into a runnable workflow.

### B1. `POST /workflow-templates/:id/install` — **M**
- [x] `WorkflowTemplatesService.install(templateId, InstallTemplateRequest)` — the install flow:
  1. Load the template definition (`trigger`, `nodes`, `edges`).
  2. Deep-clone the graph; generate fresh UUIDv7 for every `node.id` and `edge.id` (edges reference node IDs — remap after cloning).
  3. Resolve credential slots: for each node with `credentialId` matching `"slot:<key>"`, look up the `credentialMap[key]` from the request body. If a slot has no mapping, leave `credentialId` unresolved (install proceeds — see Decision §2).
  4. Call `WorkflowsService.create({ name, description, trigger, nodes, edges, enabled: false })`. The new workflow starts disabled — the user enables it after verifying slots.
  5. Set `installedFromTemplateId` on the created workflow (new nullable column on `workflows` — forward-only migration).
  6. Return the created `Workflow`.
- [x] `InstallTemplateRequest` in shared: `{ name?: string; description?: string; credentialMap: Record<string, string> }`.
- [x] `GET /workflow-templates/:id/slots` — returns `credentialSlots[]` + which are satisfied by the user's existing credentials (credential type match).

### B2. `POST /workflows/:id/duplicate` — **S**
- [x] Quick fork of an existing workflow — clones graph with fresh node+edge UUIDs, appends `" (copy)"` to name, sets `enabled = false`. Returns existing `Workflow` type.

### B3. Provenance column — **S**
- [x] Add `installed_from_template_id TEXT` (nullable) to `workflows` table (migration 0043). `WorkflowsRepository` includes it in the hydrated `Workflow`; shared `Workflow` type gains `installedFromTemplateId?: string`. No enforcement beyond record-keeping in Phase 36.

---

## Theme C — Built-in template library — **S–M**

Six curated system templates seeded on boot so the marketplace is useful from day one.

### C1. Seed on `onModuleInit` — **S**
- [x] `WorkflowTemplatesService.onModuleInit()` seeds from [`workflow-templates/seeds/`](../packages/gateway/src/workflow-templates/seeds/). Idempotent: skips slugs already present. System templates have `published = true` and cannot be edited or deleted.

### C2. Built-in templates — **S–M**
- [x] **`notify-on-task-done`** (category: `notifications`) — Webhook trigger; sends a Slack message when a task transitions to `done`. Slot: `slack-workspace`.
- [x] **`webhook-relay`** (category: `monitoring`) — Webhook trigger; forwards payload to a configurable URL. No credential slot.
- [x] **`ai-code-review`** (category: `github`) — Webhook trigger; reviews GitHub PRs with Claude on push. Slot: `github-token`. (Phase 37B)
- [ ] **`github-pr-ready-check`** (category: `github`) — Schedule trigger; polls for PRs with all checks passing. Slot: `github-token`.
- [ ] **`daily-digest`** (category: `scheduling`) — Schedule trigger (daily 08:00); markdown digest of `wip` tasks via email/Slack.
- [ ] **`ai-task-summariser`** (category: `ai`) — Manual trigger; AI summary of a task's events.
- [ ] **`scheduled-task-cleanup`** (category: `scheduling`) — Weekly cleanup of abandoned tasks.

---

## Theme D — Web marketplace UI — **M**

Browse, preview, install, and publish templates from the web app.

### D1. `/workflows/templates` browse page — **M**
- [x] New page [`app/(main)/workflows/templates/page.tsx`](../packages/web/app/(main)/workflows/templates/page.tsx): grid of template cards with category filter chips + text search. "Templates" link added to Workflows page header.

### D2. Template detail + install flow — **M**
- [x] Inline install modal on browse page: `GET /:id/slots` fetches credential requirements; per-slot credential dropdowns (filtered by type); "Add credential" link when none found; `POST /:id/install` + navigate to editor.
- [ ] Separate template detail page with read-only ReactFlow canvas (deferred — install modal covers the core UX).

### D3. "Save as template" in the editor — **S**
- [ ] Action in the workflow editor toolbar (or overflow menu): opens a sheet/dialog: template name (pre-filled from workflow name), description, category picker, tags input, visibility toggle (personal / team). On submit: calls `POST /workflow-templates` with `definition` extracted from the current workflow graph + `credentialSlots` auto-detected (any node with a `credentialId` becomes a slot, user can label and describe each). Returns to the editor with a success toast linking to the new template.

### D4. "Duplicate" on workflow cards — **S**
- [x] `onDuplicate` prop on `WorkflowCard` shows a Copy icon on hover (grid + list). `workflows-view.tsx` calls `duplicateWorkflow()` and refreshes the list.

### E — CLI template commands — **S**

- [ ] `midnite template list [--category <c>]` ([`cli/src/commands/template.ts`](../packages/cli/src/commands/template.ts)): fetches `GET /workflow-templates`, renders a table (name, category, slug, trigger type). `--category` filters.
- [ ] `midnite template install <slug-or-id> [--name "My Workflow"] [--cred slot=credId ...]`: fetches the template, maps `--cred` flags to the slot credential map, calls `POST /workflow-templates/:id/install`, prints the new workflow ID. Unresolved slots are listed as warnings.
- [ ] `midnite template create --from-workflow <workflowId> [--name "Template name"] [--category notifications]`: calls `WorkflowTemplatesService.createFromWorkflow`, prints the new template slug.

---

## Out of scope (named, not built here)

- **Community / external marketplace** — no external registry, no third-party template submissions, no cross-instance sharing. Phase 36 is a private in-app library.
- **Template versioning + update notifications** — "your workflow is based on template v1.2; v1.3 is available" is a meaningful feature but adds significant complexity. `installedFromTemplateId` is the provenance hook for a future phase.
- **Template ratings / reviews / download counts** — deferred.
- **Required field validation at install time** — template nodes can have placeholder values (e.g. `params.channelId = ""`); Phase 36 does not add a param schema layer to flag required fields. The install-time slot mapping covers credentials; other required params are the user's responsibility in the editor.
- **Search index for templates** — templates are not added to the FTS5 `search_index` in Phase 36 (the search scope gap from Phase 35 already exists). The browse page uses client-side filter over the loaded list.
- **Import / export as JSON file** — `POST /workflow-templates` already accepts a definition, so a CLI workaround exists; a dedicated import/export UI is deferred.

---

## Files this phase touches (map)

- **shared:** new [`workflow-template.ts`](../packages/shared/src/workflow-template.ts) (`WorkflowTemplate`, `WorkflowTemplateSummary`, `WorkflowTemplateCredentialSlot`, `CreateTemplateRequest`, `UpdateTemplateRequest`, `InstallTemplateRequest`); extend [`workflow.ts`](../packages/shared/src/workflow.ts) with `installedFromTemplateId?: string`; barrel + typed API client methods (`listTemplates`, `getTemplate`, `createTemplate`, `updateTemplate`, `deleteTemplate`, `installTemplate`, `duplicateWorkflow`, `getTemplateSlots`).
- **gateway — DB:** new `workflow_templates` table + `installed_from_template_id` column on `workflows` in [`db/schema.ts`](../packages/gateway/src/db/schema.ts); forward-only migrations.
- **gateway — workflow-templates module:** new [`workflow-templates/workflow-templates.module.ts`](../packages/gateway/src/workflow-templates/workflow-templates.module.ts), [`workflow-templates.repository.ts`](../packages/gateway/src/workflow-templates/workflow-templates.repository.ts), [`workflow-templates.service.ts`](../packages/gateway/src/workflow-templates/workflow-templates.service.ts), [`workflow-templates.controller.ts`](../packages/gateway/src/workflow-templates/workflow-templates.controller.ts); seed files in [`workflow-templates/seeds/`](../packages/gateway/src/workflow-templates/seeds/).
- **gateway — workflows:** [`workflows/workflows.repository.ts`](../packages/gateway/src/workflows/workflows.repository.ts) + [`workflows.service.ts`](../packages/gateway/src/workflows/workflows.service.ts) (add `POST /workflows/:id/duplicate`; include `installedFromTemplateId` in hydration); [`workflows/workflows.controller.ts`](../packages/gateway/src/workflows/workflows.controller.ts) (duplicate route).
- **gateway — app.module.ts:** register `WorkflowTemplatesModule`.
- **web:** new [`app/(main)/workflows/templates/page.tsx`](../packages/web/app/(main)/workflows/templates/page.tsx), [`app/(main)/workflows/templates/[id]/page.tsx`](../packages/web/app/(main)/workflows/templates/[id]/page.tsx); update [`workflows-view.tsx`](../packages/web/app/(main)/workflows/workflows-view.tsx) (Duplicate action, Templates nav link); update workflow editor (Save as template action); new `hooks/use-templates.ts`.
- **cli:** new [`cli/src/commands/template.ts`](../packages/cli/src/commands/template.ts) (`template list`, `template install`, `template create`); register in the commander root.
- **Docs:** append to [`done.md`](done.md) as slices land; update README (template marketplace section).

---

## Verification

- [ ] `POST /workflow-templates` creates a template; `GET /workflow-templates` returns it; `GET /workflow-templates/:slug` resolves by slug; `PATCH` updates name/description; `DELETE` removes it (rejects on system templates).
- [ ] `POST /workflow-templates/:id/install` with a full `credentialMap` creates a new `Workflow` with correct node/edge UUIDs (no collisions with the template's IDs), `enabled = false`, and `installedFromTemplateId` set. Installing the same template twice produces two independent workflows.
- [ ] Installing with an **unresolved slot** (missing from `credentialMap`) succeeds — the workflow is created with `credentialId: "slot:<key>"` left on the node (visible as a warning in the editor).
- [ ] `POST /workflows/:id/duplicate` creates a copy with new IDs, `" (copy)"` suffix, `enabled = false`, and no `installedFromTemplateId`.
- [ ] On first `onModuleInit`, all 6 built-in templates are seeded; a second boot does not duplicate them. Built-in templates cannot be deleted via `DELETE /workflow-templates/:id`.
- [ ] The `/workflows/templates` browse page loads, category filter narrows the list, and the "Use template" button navigates to the detail page.
- [ ] The install flow: a template with one Slack slot — the detail page shows the slot as "needs mapping"; selecting a Slack credential and clicking "Install" creates the workflow and navigates to the editor with the info banner.
- [ ] "Save as template" from the editor creates a template with `published = false`; it appears under "My templates" but not in the "Built-in" tab.
- [ ] "Duplicate" on a workflow card creates a copy and the list refreshes to show it.
- [ ] `midnite template list` prints a table of templates; `midnite template install <slug>` creates a workflow and prints its ID; `midnite template create --from-workflow <id>` creates a template and prints its slug.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across the graph; `moon ci` green.

---

## Decisions / open questions

1. **Credential slot sentinel format** *(settled: `"slot:<key>"` in `credentialId`).* Nodes in the template definition carry `credentialId: "slot:slack-workspace"`. The `"slot:"` prefix is the install-time resolution signal. At runtime (after install), the resolved credential ID replaces the sentinel — the workflow engine never sees `"slot:"`.
2. **Unresolved slots at install** *(settled: install proceeds, workflow disabled).* If a slot has no mapping in `credentialMap`, the sentinel remains. The workflow is created with `enabled = false` and the editor surfaces a "credential not connected" warning per node. This prevents a hard-block on install while still making the gap visible.
3. **System template protection** *(settled: reject delete/edit by non-system).* `author_id = null` marks system templates. `deleteTemplate` and `updateTemplate` return 403 when `author_id IS NULL`. System template content is managed via seed files + migrations, not the API.
4. **"Save as template" credential handling** *(open).* When `createFromWorkflow` exports a workflow, nodes with real `credentialId` values need to be converted to slots. Auto-detect: any node with a non-null `credentialId` becomes a slot (key = credential type + index, description = credential name). The user can rename slots before saving. Confirm this auto-detection approach in the D3 PR.
5. **Team-scoped visibility** *(settled: `published = true` → visible to team members, `published = false` → personal only).* Requires Phase 33's `team_id` on the template (`author_id`'s team). In Phase 36 without Phase 33 shipped, visibility is personal only regardless of `published` — team scoping activates once Phase 33 lands. The browse page degrades gracefully.
6. **Template thumbnail** *(recommend: defer generation, allow manual upload).* Auto-generating a thumbnail from the ReactFlow canvas (html2canvas or canvas export) is feasible but fragile. Phase 36 stores a nullable `thumbnail` URL; the built-in templates use a simple category icon (SVG) as a placeholder. A polished thumbnail generator is a later enhancement.
7. **Install idempotency** *(open).* Should installing the same template twice be rejected or allowed (two independent workflows)? Recommend: allow — it's a valid use case (two identical notification workflows for two different Slack channels). Confirm in the B1 PR.
