# Phase 13 — Repos as a first-class entity

> midnite is pitched as a **multi-repo** orchestrator, but `repos` is still half-wired. `RepoConfig` is just `{ name, path }` ([`config.ts`](../packages/shared/src/config.ts)), `config.repos` defaults to `[]` and is only populated by hand-editing `midnite.json`, and `task.repo` is a **nullable free-text name** ([`task.ts`](../packages/shared/src/task.ts)) with exactly one consumer — [`resolveCwd`](../packages/gateway/src/terminal/terminal.service.ts) maps `task.repo` (name) → `config.repos[].path` to pick the PTY cwd, and **silently falls through** to a fallback dir on a typo or empty list. The new-task UI has no repo picker, and inference never sets it. **Phase 13 promotes `repos` to a managed, DB-backed entity the workflow can actually revolve around** — a registry users CRUD in the app, a picker in task creation, and references that *resolve to a known repo* instead of no-op-ing on a typo.

> **Scope guardrails (CLAUDE.md).** Repos are a new gateway feature module: `controller → service → repository`, Drizzle queries only in the repository, business logic in the service, thin controller validating against zod schemas in [`@midnite/shared`](../packages/shared/src/). The repo wire shapes (entity, create/update requests) live in `shared` — `cli` and `web` stay pure HTTP clients. New table gets a **forward-only** migration; no foreign keys across logical domains (a task references a repo by its registry-unique **name**, not a cross-domain FK). `shared` is the contract.

> **This phase is deliberately tight: Themes A + B only** (the registry + making it selectable/validated). The richer payoffs that *depend* on a real repo entity — inference guessing, per-repo concurrency caps, branch/PR templates, UI surfacing — are scoped as **deferred follow-ons** below, not built here.

> Effort tags: **S** small · **M** medium · **L** large. Themes are ordered A → B (A is the prerequisite). Every box starts unchecked — this is net-new work.

---

## Current state (baseline to build on)

- **shared:** `RepoConfigSchema = { name, path }` ([`config.ts:5`](../packages/shared/src/config.ts)); `config.repos` defaults to `[]`. `task.repo` is `z.string().optional()` ([`task.ts:58`](../packages/shared/src/task.ts)); `CreateTaskRequestSchema` already accepts an optional `repo`.
- **gateway:** `tasks.repo` is a nullable `text('repo')` column ([`db/schema.ts`](../packages/gateway/src/db/schema.ts)). The **only** consumer is [`resolveCwd`](../packages/gateway/src/terminal/terminal.service.ts) (priority: project workDir → `task.repo`→`config.repos[].path` → profile fallback → `process.cwd()`). A missing/mismatched name silently skips to the fallback. Inference (`classifier.service.ts` / `planner.service.ts`) **never** touches repo.
- **web:** no repo picker in the new-task flow; repo is never surfaced on cards or threads.
- **cli:** `add` has no `--repo` flag.
- **No repo CRUD anywhere** — the list lives only in `midnite.json`.

---

## Theme A — Repo registry (DB-backed) — **M** — ✅ DONE (PR #45, 2026-06-21)

Repos are now a managed, DB-backed entity users CRUD in the app — not an empty config array. (Class names landed plural — `ReposService`/`ReposController`/`ReposRepository`/`ReposModule` — to match the existing `projects` module convention.) See [done.md](done.md). **Theme B** (picker + write-time validation + cwd-precedence tests) remains.

### A1. `repos` table + repository — **S–M** — ✅ DONE
- [x] Drizzle table `repos` (`id`, unique `name`, `path`, timestamps) + forward-only migration `0030_repos`. Deferred `branchPrefix`/`prTemplate`/`cap` columns left to Themes D/E (Decision §5). `ReposRepository` is Drizzle-only (`list`/`getById`/`getByName`/`insert`/`update`/`delete`), accepting the injected `Db`.

### A2. `ReposService` + module + REST — **M** — ✅ DONE
- [x] `ReposModule` registered in `AppModule`; `ReposService` owns logic (`randomUUID` id, unique-name enforcement → `RepoNameTakenError`, `~`-path normalisation). Thin `ReposController`: `GET /repos`, `GET /repos/:id`, `POST`, `PATCH /:id`, `DELETE /:id` — zod-validated bodies; domain errors → HTTP (duplicate → 409, unknown id → 404, empty patch → 400). Shared `RepoSchema`/`CreateRepoRequestSchema`/`UpdateRepoRequestSchema` + barrel; typed client fns in `web/lib/api.ts`. `RepoConfigSchema` kept for the seed path.

### A3. Seed from config + source-of-truth handoff — **S** — ✅ DONE
- [x] On boot, `ReposService.onModuleInit` seeds the registry from `config.repos` insert-if-absent by name (DB is the runtime source of truth thereafter; never overwrites a DB row, never deletes — Decision §2). `resolveCwd` now resolves `task.repo` → path via the registry (`expandTilde` on read), not `config.repos`.

### A4. Settings UI — **S–M** — ✅ DONE
- [x] A **Settings > Repos** panel (list · add · inline-edit · remove) with inline validation (name + path required) and server errors (e.g. duplicate name) surfaced; reuses the existing `Accordion`/`Button`/`Input`/`useConfirm` primitives + a sidebar nav entry. RTL-tested.

---

## Theme B — Selectable & validated — **M** — ✅ DONE (PR #52, 2026-06-21)

A repo you can choose at task-creation time, and a `task.repo` that always points at a *known* repo. **Phase 13 is now complete** (Themes A + B; the C–F follow-ons below stay explicitly deferred). See [done.md](done.md).

### B1. Repo picker in task creation — **M** — ✅ DONE
- [x] **Web:** a repo `<select>` in the new-task modal, fed by `GET /repos` with an explicit **"Unassigned"** default, alongside the project picker (orthogonal scope axes); sends the chosen repo name on single + bulk create; hidden when no repos are registered.
- [x] **CLI:** `add --repo <name>` (landed earlier in PR #47); a thin pass-through to the typed client. With B2 the server now rejects an unknown name, which the CLI surfaces.

### B2. Validated references (no silent fall-through) — **M** — ✅ DONE
- [x] On task **create/bulk**, `TasksService.resolveRepoReference` validates `repo` against the registry: an unknown name is **rejected** with a 400, a blank stays explicit "unassigned" (null) — never a dangling free string. (Bulk fails fast on a bad batch repo before creating anything.) (Decision §3.) (No task-`repo` *update* endpoint exists; repo is set at create time.)
- [x] [`resolveCwd`](../packages/gateway/src/terminal/terminal.service.ts) resolves `task.repo` against the registry (since A3); validated-on-write means a stored repo always resolves or is explicitly unassigned.
- [x] Reference key stays the repo **name** (registry-unique), not a new `repoId`. (Decision §1.)

### B3. Define + test cwd precedence — **S** — ✅ DONE
- [x] Precedence (**project workDir → repo → profile fallback → `process.cwd()`**, Decision §4) extracted into a pure, unit-tested `pickSessionCwd` helper ([`terminal/lib/resolve-cwd.ts`](../packages/gateway/src/terminal/lib/resolve-cwd.ts)) and consumed by `resolveCwd` (behaviour unchanged). Tests cover project-wins-over-repo, repo-when-no-project, unassigned→fallback, and empty→next.

---

## Deferred follow-ons (NOT in this phase)

These all *depend on* a real repo entity (Themes A+B) and are the natural next slices — captured here so the boundary is explicit. They map to [`outstanding.md`](outstanding.md) #5/#8/#9 and Phase 7 Theme C.

- **C · Repo guessing in inference** — the planner gets the repo manifest and picks a target repo per task; persist to `task.repo`. (`outstanding.md` #5.) **S.**
- ✅ **D · Per-repo concurrency caps** — **DONE via Phase 5 (PR #49)**: `agent.maxPerRepo` caps concurrent agents per `task.repo` in the scheduler (skips a task whose repo is at the cap). (`outstanding.md` #8.)
- ✅ **E · Per-repo branch naming + PR templates** — **DONE (PR #74, 2026-06-22)**: `branchPrefix`/`prTemplate` on the repo entity (migration `0031`) + a pure `appendRepoConventions` helper ([`build-agent-prompt.ts`](../packages/gateway/src/pool/lib/build-agent-prompt.ts)) that folds a `## Repository conventions` section into the agent seed prompt (wired into `AgentRunnerService`); settable in Settings → Repos. (`outstanding.md` #9.)
- ◐ **F · Surface repo in UI** — ✅ **repo chip on task cards** (`RepoChip`) + the thread already shows it (PR #64); the optional **per-repo status** dashboard widget (in-flight agents / queue depth per repo) remains → Phase 7 Theme C. **S.**
- **Repo-on-disk management** — midnite cloning/pulling/worktree-creating repos. Out of scope; the registry assumes the checkout already exists at `path`.

---

## Files this phase touches (map)

- **shared:** new [`shared/src/repo.ts`](../packages/shared/src/) (`RepoSchema` + create/update requests) + barrel + tests; typed client functions for `/repos`. Keep [`config.ts`](../packages/shared/src/config.ts) `RepoConfigSchema` for the seed path.
- **gateway:** new `repos/` module — `repos.controller.ts`, `repos.service.ts`, `repos.repository.ts`, `repos.module.ts` (register in `AppModule`); `repos` table in [`db/schema.ts`](../packages/gateway/src/db/schema.ts) + a forward-only migration under [`drizzle/`](../packages/gateway/drizzle/); seed-on-boot wiring; point [`resolveCwd`](../packages/gateway/src/terminal/terminal.service.ts) + task create/update validation at the registry ([`tasks.service.ts`](../packages/gateway/src/tasks/tasks.service.ts)).
- **web:** a **Settings > Repos** panel; a repo picker in the new-task flow; `getRepos`/`createRepo`/… client calls in [`lib/api.ts`](../packages/web/lib/api.ts).
- **cli:** `add --repo` flag in [`cli/src/`](../packages/cli/src/).
- **Docs:** update [`CLAUDE.md`](../CLAUDE.md) (repos are now a DB entity, not just config) + README config docs (`config.repos` is a seed); append to [`done.md`](done.md) as slices land.

---

## Verification

- [ ] `moon run gateway:dev` + `moon run web:dev`: in **Settings > Repos**, add / edit / remove a repo; the list persists across a gateway restart (DB-backed, not config).
- [ ] A fresh DB with `config.repos` populated **seeds** those repos into the registry on first boot; thereafter the DB is authoritative.
- [ ] Creating a task with the repo **picker** persists `task.repo`; the agent's PTY opens in that repo's `path` (when no project workDir overrides it).
- [ ] Creating/updating a task with an **unknown** repo name is rejected (or coerced to unassigned) — never stored as a dangling string; `resolveCwd` no longer silently falls through on a typo.
- [ ] `midnite add "…" --repo <name>` sets the repo; an unknown name errors clearly.
- [ ] cwd precedence (project workDir → repo → fallback → cwd) is covered by gateway tests.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across the graph; `moon ci` green. (Run web tests from the **primary checkout**, not a `.git` worktree.)

---

## Decisions / open questions

1. **Reference by name vs id** *(recommend: name).* `task.repo` keeps storing the repo **name**; the registry enforces name uniqueness, so a name resolves unambiguously. Avoids a churny `repoId` migration across every `task.repo` consumer. Re-naming a repo is the known cost — handle by updating affected tasks or treating the old name as unassigned.
2. **`config.repos` fate** *(recommend: one-time seed).* DB is the runtime source of truth after first boot; `config.repos` seeds an empty registry and offers a safe upsert-by-name re-import. Don't keep two live sources.
3. **Unknown-repo behaviour** *(recommend: reject on write).* Validate `task.repo` against the registry at create/update; reject unknown names (or coerce to explicit "unassigned"). Predictable beats a dangling string that no-ops at cwd-resolution time.
4. **Project ↔ repo relationship** *(settled in brainstorm: orthogonal).* `project.workDir` and `task.repo` stay separate axes; precedence is **project workDir → repo → fallback → cwd**, now documented and tested (B3). A project *referencing* a repo is a possible future simplification, not this phase.
5. **Migration shape** *(open).* Add only `id`/`name`/`path`/timestamps now, or also stub the deferred `branchPrefix`/`prTemplate`/`cap` columns to save a later migration? **Recommend minimal now** — a forward migration adds them cleanly when Themes D/E land.
