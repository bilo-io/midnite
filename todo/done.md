# Completed work

Append new entries at the **top**. Each entry: one heading with the date, a short summary, and the tickbox list of what landed.

---

## 2026-06-04 — Projects feature

New **Projects** space: group work under a project with an (AI-assistable) description, up to 10 source links (auto-detected kind + best-effort OpenGraph/oEmbed title), and a project tag (user color, auto-contrast text) that tasks carry. From a project you can draft a markdown plan (one-shot Claude call) and turn checked items into tasks. One project per task via a nullable `tasks.projectId`. Branch: `feature/projects`.

- [x] `shared`: `project.ts` (zod schemas + `MAX_SOURCES_PER_PROJECT`/`MAX_TAG_LENGTH`), `color.ts` (WCAG contrast → readable text), `source.ts` (`detectSourceKind`), `plan.ts` (checklist parse/serialize), `task.ts` +`projectId`
- [x] `gateway`: `projects` + `project_sources` tables, `tasks.project_id` (+ migration `0001_cheerful_argent`); `projects` module (controller/service/repository), `lib/opengraph.ts` (SSRF-guarded fetch + YouTube oEmbed), AI prompts; `AnthropicService.getPlanModel()`; `TasksService.createForProject`; `tasks?projectId=` filter
- [x] `web`: `/projects` page (grid/list toggle), create/edit modal (AI description, color picker, sources), `ProjectTag`, `SourceIcon`, plan panel (draft → interactive checklist → create tasks), board cards show the project tag
- [x] Tests: shared (color/source/plan) + gateway (opengraph/service/repository incl. `:memory:` migration) — 35 passing; `:typecheck`, `web build`, and a live REST E2E (create/limit/validation/oEmbed/create-tasks/filter/delete-unlinks) all green
- [ ] Follow-ups: CLI commands; spawn agents/sessions from project tasks; extract source-doc contents for richer plans

---

## 2026-05-28 — Phase 0 scaffold

Initial empty monorepo skeleton based on [`docs/INITIAL_PLAN.md`](../docs/INITIAL_PLAN.md). Stack overrides confirmed: Nest.js (Fastify adapter) for the gateway, Next.js App Router for the web.

- [x] Workspace root: `.prototools`, `.moon/{workspace,toolchain,tasks}.yml`, `pnpm-workspace.yaml`, root `package.json`, `tsconfig.base.json`, `.gitignore`, `.editorconfig`
- [x] `midnite.json` sample config
- [x] `knowledge/` placeholder folder
- [x] `packages/shared` — zod config schema (`config.ts`), task types (`task.ts`)
- [x] `packages/gateway` — Nest.js + Fastify adapter, `/health` controller, drizzle dir placeholder
- [x] `packages/cli` — commander program with `add` / `list` / `move` / `serve` stubs
- [x] `packages/web` — Next.js App Router with placeholder kanban layout (5 columns)
- [x] `todo/` tracker folder
- [x] `CLAUDE.md` brief

> Verification (`pnpm install`, `moon run gateway:dev`, `moon run web:dev`, `node packages/cli/dist/index.js add hello`) is the next implementer's responsibility — see [phase-0-scaffold.md](phase-0-scaffold.md) for the unchecked verification items.
