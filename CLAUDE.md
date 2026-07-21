# midnite Development Guidelines

## Project Overview

midnite is a multitask orchestrator for Claude Code. A long-running **gateway** holds a task store and an **agent pool**, spawns Claude Code sessions, and exposes a REST + WebSocket API consumed by a **CLI** and a **browser** kanban.

**Design source of truth:** [`docs/INITIAL_PLAN.md`](docs/INITIAL_PLAN.md). **Progress tracker:** [`todo/`](todo/) — phase checklists + append-only `done.md`. Update as you work.

**Stack overrides vs. INITIAL_PLAN.md:** gateway uses **Nest.js with the Fastify adapter** (not bare Fastify); web uses **Next.js App Router** (not React + Vite).

### Repo Layout (moon + proto)

- `.prototools` — pins node + pnpm versions (managed by proto)
- `.moon/workspace.yml` — declares packages
- `.moon/toolchain.yml` — node/pnpm setup for moon
- `.moon/tasks.yml` — shared task defaults (lint, test, build, dev)
- `packages/shared/` — zod config schema, domain types, task state machine, typed API client
- `packages/gateway/` — Nest.js (Fastify adapter) + SQLite (Drizzle) + scheduler + agent spawners
- `packages/cli/` — commander client; `midnite serve` boots the gateway
- `packages/web/` — Next.js App Router kanban frontend
- `packages/ui/` — `@midnite/ui`: reusable component library + design system (generic primitives + design tokens), built with **Vite library mode**. A leaf — depends on nothing else in the repo.
- `packages/shell/` — `@midnite/shell`: the wired **app shell** both `web` and `admin` mount (Phase 73) — `<AppFrame>` (injected nav config), `<LockScreen>` (idle + login on the starfield), the Phase 39/68 appearance runtime, and shared providers. A **mid-tier** package built with **Vite library mode**: it may depend on `@midnite/shared` + `@midnite/ui` only (`react`/`react-dom`/`next`/`@tanstack/react-query` are peers), never on an app or the gateway.
- `packages/docs/` — `@midnite/docs`: the static **Vite + React** documentation site (design-system docs + developer docs), authored in **MDX** with live `@midnite/ui` examples. A pure consumer of `@midnite/ui` (Phase 26); never talks to the gateway.
- `midnite.json` — per-project user config (validated by `shared`)
- `todo/` — phase checklists + `done.md` log; update as work lands

### Package Boundaries

Strict, one-way dependency graph:

```
shared ◀── gateway
shared ◀── cli      (cli also imports from shared, never gateway internals)
shared ◀── web      (web also imports from shared, never gateway internals)
ui     ◀── web      (ui is a leaf: depends on nothing in-repo)
ui     ◀── docs     (docs is a pure consumer of ui; later: site may join)
ui, shared ◀── shell        (shell is mid-tier: depends on ui + shared only)
shell  ◀── web, admin       (web + admin mount the shell's <AppFrame>)
shared, ui, shell ◀── admin (admin is an app leaf: never imported by anything)
```

**Enforced boundary tests (CI).** Three packages carry a `src/boundary.test.ts`
that fails the build if the source imports outside its allowed set — they pin the
mid-tier edges: **`ui ◀ shell ◀ {web, admin}`** and **`{shared, ui} ◀ admin`**.
`packages/ui/src/boundary.test.ts` keeps `ui` a leaf (no in-repo imports);
`packages/shell/src/boundary.test.ts` keeps `shell` on `{shared, ui}` only (never
an app / gateway / cli / desktop / site); `packages/admin/src/boundary.test.ts`
keeps `admin` a pure client of `{shared, ui, shell}` (never gateway internals).

- `shared` depends on nothing else in the repo
- `cli` and `web` are pure clients of `gateway` over HTTP/WS — they never import gateway internals
- `gateway` never imports from `cli` or `web`
- `ui` (`@midnite/ui`) is a **leaf design-system package** — generic primitives + design tokens. It depends on **nothing** else in the repo (not even `shared`); React is a peer dependency. `web` and `docs` consume it. The library's primitives + tokens migrated in across Phase 25; a boundary test in the package enforces the leaf rule in CI.
- `docs` (`@midnite/docs`) is a **pure consumer of `@midnite/ui`** (Phase 26) — the static documentation site. It imports only `@midnite/ui` (no `shared`/`gateway`/`web`), never talks to the gateway, and its own boundary test enforces the `ui ◀── docs` leaf edge in CI.
- `shell` (`@midnite/shell`) is a **mid-tier package** (Phase 73 Theme B) — the wired app frame (`<AppFrame>`, `<LockScreen>`, the Phase 39/68 appearance runtime, shared providers) that `web` and `admin` mount. It may depend on **`@midnite/shared` + `@midnite/ui` only** (`react`/`react-dom`/`next`/`@tanstack/react-query` are peers) — **never** on `web`/`admin`/`gateway`/`cli`/`desktop`/`site`. Its `src/boundary.test.ts` enforces the `ui ◀ shell ◀ {web, admin}` edge in CI.
- Cross-package types live in `shared`; never duplicate them
- moon enforces this via `dependsOn` in each `moon.yml`

### Anti-Patterns to Avoid

- Reaching into another package's internals (import only from its public entry / from `shared`)
- Duplicating types across packages instead of putting them in `shared`
- Business logic in handlers or in CLI commands — it belongs in gateway services
- Direct DB access outside `gateway/repository/`
- Untyped JSON over the wire — every REST/WS message has a zod schema in `shared`
- ORMs beyond Drizzle's query builder; no decorators / no class-based models
- Editing generated files (Drizzle migrations metadata, build output)

**Golden Rule:** `shared` is the contract. If two packages need to agree on a shape, it lives in `shared`.

---

## Toolchain

- **proto** manages binary versions (node, pnpm). Run `proto install` after cloning to materialise versions from `.prototools`.
- **moon** runs tasks across packages with caching. Always invoke tasks via `moon run` so the dependency graph and cache apply.
- **pnpm** is the package manager. Use workspace protocol (`workspace:*`) for cross-package deps.

### Common Commands

```bash
proto install                    # install pinned node/pnpm
pnpm install                     # install workspace deps
moon run :build                  # build all packages
moon run gateway:dev             # run the gateway in watch mode
moon run cli:dev -- add "..."    # run the CLI against a local gateway
moon run web:dev                 # Next.js dev server (App Router)
moon run :test                   # tests across the graph
moon run :lint                   # eslint across the graph
moon run :typecheck              # tsc --noEmit across the graph
moon ci                          # what CI runs
```

Prefer `moon run <project>:<task>` over invoking pnpm/tsc/vitest directly — moon's affected-detection and caching only work through it.

---

## Git & PR Workflow

### Commits

- Conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
- Small, single-purpose commits
- Scope by package when useful: `feat(gateway): add scheduler tick metric`

### Branches

- Feature branches: `feature/<name>` · fixes: `fix/<name>` · chores: `chore/<name>`
- Always branch from the latest `main`
- Prefer a branch for anything beyond a trivial change — it keeps PRs clean and lets work run in parallel. Committing straight to `main` is fine for small, low-risk touch-ups (typos, doc tweaks, config nudges) when a PR would just be ceremony. Use judgement.

### Where to work

Pick whichever fits the task — there's no single mandated flow:

1. **Worktree** (best for parallel agent work, or juggling several branches at once) — an isolated checkout, so nothing steps on the primary tree. See below.
2. **Feature branch in the primary checkout** — simplest when you're only doing one thing at a time and don't need isolation.
3. **Directly on `main`** — fine for trivial, low-risk changes where a branch/PR would be overkill.

### Worktrees

midnite is built around running agents in parallel, and worktrees keep those branches from sharing one working tree. To spin one up:

```bash
# from ~/Dev/midnite (the primary checkout, usually kept on `main`):
git fetch origin
git worktree add .worktrees/<branch-name> -b feature/<branch-name> origin/main
cd .worktrees/<branch-name>
pnpm install                        # link deps inside the worktree
```

Conventions:

- Keep the primary checkout (`~/Dev/midnite`) on `main` as your home base when you're using worktrees.
- One worktree per branch, in the repo-root **`.worktrees/`** dir: `.worktrees/<branch-name>/`. `.worktrees/` is git-ignored (see `.gitignore`), so worktrees never show up as untracked files or pollute the workspace. **Do not** nest worktrees under `.git/` — that path is pruned by parallel `git worktree` runs and Vite denies `.git/**` (breaking `web:test`); `.worktrees/` avoids both.
- Because `.worktrees/` sits **outside** `.git/`, Vite no longer denies it — `moon run web:test` (and the full `moon run :test`) run fine **inside** the worktree; no need to hop back to the primary checkout for web tests.
- When the PR merges (or is abandoned), tear the worktree down with `git worktree remove .worktrees/<branch-name>` followed by `git branch -d feature/<branch-name>` (use `-D` if abandoned).
- Each worktree has its own `node_modules` (pnpm symlinks under the hood are fine). Don't try to share by copying.

### Pre-push Checks

```bash
moon run :typecheck
moon run :lint
moon run :test
```

CI runs `moon ci`. Lint violations fail the build — fix locally rather than after CI flags them.

**CI/CD is affected-gated** (Phase 78, see [`docs/CICD.md`](docs/CICD.md)). GitHub Actions jobs and Vercel deploys only run for the packages a change actually touches (moon's affected graph is the oracle; Vercel uses a git-diff subtree script), so expect **skipped-but-green** checks on PRs that don't touch a given app. The single required status check is **`ci-gate`** (an always-run aggregation job), not `ci` — a skipped `moon ci` still reports green through it. No feature-branch Vercel previews deploy; only `main` does.

### Pull Requests

- Create PRs as drafts until ready for review
- PR description should explain *why*, not just *what*

### Releases

- Versioning is **lockstep on `MAJOR.MINOR`** (every package shares it) with an
  **independent `PATCH`** per package. `moon run root:version-check` enforces the
  invariant in CI; the bump math lives in [`packages/shared/src/version.ts`](packages/shared/src/version.ts).
- Cutting a release is a two-step flow (`/release-prep` → `/release-complete`); the
  policy, bump triggers, and tag/branch scheme are documented in
  [`docs/RELEASING.md`](docs/RELEASING.md). User-facing notes go in [`CHANGELOG.md`](CHANGELOG.md), kept separate from `todo/done.md`.

---

## TypeScript Code Style

### Formatting & Linting

- **Prettier** for formatting · **ESLint** (typescript-eslint) for linting — **not wired in during Phase 0**; the `lint` task is currently a no-op. Add the configs when the first non-scaffold PR needs them
- TypeScript `strict: true` everywhere; no `any` without an inline `// eslint-disable-next-line` and a comment explaining why

### Naming

- `camelCase` for variables/functions, `PascalCase` for types/classes/components, `SCREAMING_SNAKE` only for true constants
- Files: `kebab-case.ts` for modules, `PascalCase.tsx` for React components
- Consistent acronym casing: `userId` / `UserId` / `userIds`, not `userID` / `userIDs` (TS convention differs from Go)
- React components: one per file, default export only for top-level routes; named exports otherwise
- Hooks: prefix with `use` (`useTasks`, `useAgentPool`)

### Imports

- Group: stdlib (node:*), then external, then `@midnite/*` workspace packages, then relative — blank line between groups
- Always use `node:` prefix for built-ins (`import fs from 'node:fs/promises'`)
- Use the workspace alias for cross-package imports (`@midnite/shared`), never relative paths into another package

### Types over Values

- Prefer `type` for object shapes and unions, `interface` only when declaration-merging or extending classes
- Discriminated unions for state: `type Task = { status: 'todo'; ... } | { status: 'wip'; ... } | ...`
- `import type { ... }` for type-only imports — keeps runtime graph clean

### Errors

- Use `Error` subclasses for domain errors: `class TaskNotFoundError extends Error {}`
- Sentinel-style names use `DoesNotExist`, not `NotFound` (e.g. `TaskDoesNotExistError`)
- Wrap with cause: `throw new Error('scheduling task', { cause: err })`
- Never swallow errors silently; never `catch (e) {}`
- Services throw; handlers translate to HTTP status codes
- At the gateway boundary, log with `logger.error({ err })` once — not at every layer

### Async

- `async`/`await` only — no `.then()` chains
- Use `Promise.all` for independent concurrent work; never sequential `await`s when they could run in parallel
- Use `AbortSignal` for cancellable work (scheduler ticks, agent spawns)

### Functions

- No trivial wrappers — call the underlying function directly
- Pure helpers in `*/lib/`; side-effecting code in services / spawners

---

## Configuration

- All user config lives in `midnite.json`, validated by a single zod schema in `packages/shared/src/config/`
- Never read `midnite.json` outside of `shared/config/loadConfig()` — every consumer takes a `MidniteConfig` parameter
- Add new config fields by: (1) extending the zod schema, (2) updating the default object, (3) documenting in the README

---

## Gateway

### Layering

Nest module per feature → `controller → service → repository`:

- **Modules** (`gateway/src/<feature>/<feature>.module.ts`): one Nest module per feature, registered in `AppModule`
- **Controllers** (`gateway/src/<feature>/<feature>.controller.ts`): thin — decorators declare routes; decode/encode only, no business logic, no DB access. Use a `ZodValidationPipe` for body/query parsing against schemas in `shared`
- **Services**: own all business logic, orchestrate repositories, own transactions
- **Repositories**: Drizzle queries only — no business rules. Live under `gateway/src/<feature>/<feature>.repository.ts` (or a shared `gateway/src/db/` for cross-cutting queries)
- **Gateways** (Nest WS): `gateway/src/<feature>/<feature>.gateway.ts` for WebSocket endpoints — controllers' WS counterpart, same thin-layer rule

### Database (SQLite + Drizzle)

- Schema in `gateway/src/db/schema.ts` — single source of truth for tables
- Migrations via `drizzle-kit` in `gateway/src/db/migrations/` — forward-only, never edit a merged migration
- IDs are UUIDv7 generated in the service layer before insert
- No triggers / no computed columns / no foreign keys across logical domains within the gateway
- Repositories accept a `Db` (which can be a transaction) so services own transaction boundaries

### Global Search (FTS5)

- Cross-domain full-text search lives in the `search/` module: a single FTS5 virtual table `search_index(type, entity_id, title, body)` ranked with `bm25()` (Phase 20). `GET /search` is thin; `SearchService` maps hits → the shared `SearchResult` contract and adds the per-type route.
- **No triggers means the index is maintained in the service write-path**, not by SQL: `SearchIndexService` (a `@Global` module, like the DB handle) exposes `upsert`/`remove`, and each domain service keeps its own rows current on create/update/delete. Tasks reuse the existing `TaskEventBus` (the search module subscribes — `tasks.service` is untouched); the other domains inject `SearchIndexService` directly (`@Optional()`, so unit specs need no edit). Per-domain field→`title`/`body` mapping lives in one place: `search/lib/index-mappers.ts`.
- A boot **backfill** populates a freshly-migrated index from the domain services; `POST /search/reindex` rebuilds it. A new searchable domain adds a mapper + a write-path call (or a bus subscription).

### WebSocket Events

- Event shapes live in `shared/src/events/` with discriminated `type` field
- The gateway publishes events on state transitions (task moved, agent slot changed)
- Never send untyped payloads — clients depend on the discriminated union

### Scheduler & Agent Pool

- **Before adding any code that writes a task's `status`, read [`docs/LIFECYCLE.md`](docs/LIFECYCLE.md)** — the signal→edge audit (Phase 69 A). It maps every real signal (hook, scheduler tick, runner exit, board drag) to the `TasksService` writer it fires and the `ALLOWED_TRANSITIONS` edge that writer drives, accounts for every legal edge, and records the race audit. A table-driven spec (`lifecycle-writer-matrix.spec.ts`) pins the matrix so the doc and code can't drift — a new legal edge without a driver (or a `deliberately-dead` entry) fails CI.
- **Task scheduling already orders by priority** (`task.priority` 0–3, `desc(priority), asc(createdAt)` in `listTasks`). **Task dependencies** (Phase 27) layer on top: a normalized `task_dependencies` edge table (`task_id` → `depends_on_task_id`) stores blockers, the dependent task's `dependsOn` is *derived* from the edges (no new status — "blocked" is computed, not stored), and integrity (self-ref / unknown / **cycle** via a DFS over the edges, mirroring the workflow-engine reachability check) lives in `tasks.service`. `TasksRepository.listReadyTodoTasks()` is the SQL ready-set (`todo` tasks whose every blocker is `done`); the scheduler's tick selects from it (via `TasksService.listReadyTodoTasks()`) instead of all `todo` tasks, so a blocked task is skipped until its blockers complete and priority+age ordering only ranks *ready* tasks (a higher-priority blocked task can't jump its blocker). An `abandoned` blocker (never `done`) holds its dependents. On a blocker's terminal transition (`done`/`abandoned`) the service re-broadcasts its dependents (`task.updated`) so the board's derived "blocked by N" chip refreshes promptly — scheduling itself stays SQL-driven (the next tick re-evaluates readiness; no event drives it). Deleting a task clears its edges both directions (its dependents become unblocked).
- The scheduler is a single tick loop owned by the gateway — never spawn parallel schedulers
- Agent slots are tracked in-memory; persisted state is the source of truth on restart
- Status transitions caused by Claude Code hooks come in as authenticated webhook calls (`POST /hooks/:taskId/:event`) with a per-session secret — never trust the body alone
- **Process backend is pluggable** (Phase 17): the node-pty lifecycle lives behind a `Spawner` interface (`terminal/spawner/`), selected by `terminal.mode`. `pty` (default) dies with the gateway; `tmux` runs each session in a detached `midnite-<sessionId>` session that survives a restart. New backend code is **additive** — the `pty` path must stay behavior-preserving (its specs run unedited)
- **Boot recovery lives in `AgentRunnerService.onModuleInit`** (not the pool): tasks left `wip`/`waiting` are requeued under `pty`, or **reattached** under durable `tmux` (still-live sessions resume; dead ones requeue; stray sessions are reaped). It runs after the pool initialises and before the scheduler's first tick (Nest dependency order) — keep it there so reattach has the slot/timeout/onExit wiring `start()` uses
- **Durable shutdown diverges by mode**: `pty` `onModuleDestroy` kills every PTY; `tmux` *detaches* (leaves the session running) so a restart can reattach. Only explicit kill / idle-reap / graceful-stop ends a durable session

### Logging

- **pino** for structured logs
- Use child loggers per request (`req.log`) and per task (`logger.child({ taskId })`)
- Levels: `debug` (dev), `info` (normal ops), `warn` (handled/predictable failures), `error` (unexpected)
- Never `console.log` in committed code

---

## CLI (`packages/cli`)

- Built on **commander**
- Each command is a single file in `cli/src/commands/`
- Commands are thin: parse args → call the shared typed API client → render output
- Use **chalk** for colours, **ora** for spinners, **cli-table3** for tables
- No business logic — if it's not an API call, it doesn't belong here
- `midnite serve` boots the gateway in-process (dev convenience); in prod the gateway runs separately

---

## Web (`packages/web`)

- **Next.js App Router + React + TypeScript**
- Pages live in `packages/web/app/` (App Router). Server components by default; mark client components with `'use client'` at the top of the file
- State: **TanStack Query** for server state, **Zustand** only for genuinely client-only UI state
- Subscribe to gateway WS for live board updates from a client component; invalidate Query cache on events
- Kanban via **@dnd-kit**; embedded terminals via **xterm.js** (client-only — dynamic import with `ssr: false`)
- Components: function components + hooks only — no class components
- No prop drilling beyond two levels — lift to Zustand or Context
- Styling: **Tailwind CSS** (utility classes composed via a `cn()` helper) + shadcn-style HSL design tokens (CSS custom properties + a `.dark` block) in `globals.css`. The generic primitives and those tokens are the **design system**, being extracted into **`@midnite/ui`** (Phase 25) as the reusable, framework-agnostic source of truth — `web` consumes the lib's primitives + token CSS, while domain-coupled components (`TaskCard`, the board, the office) stay in `web`.
- Responsive: breakpoints are defined once in [`lib/breakpoints.ts`](packages/web/lib/breakpoints.ts) (Tailwind-aligned `sm`/`md`/`lg`/`xl`/`2xl`). Device cutoffs: **mobile** `< md` (768px), **tablet** `md`–`lg`, **desktop** `>= lg` (1024px). Prefer Tailwind responsive variants (`md:`, `lg:`) for layout that reflows with the viewport; for JS that must branch its render (mount a drawer vs. a sidebar, desktop-only gates) use `useMediaQuery` / `useIsMobile` / `useIsTablet` / `useIsDesktop` from [`hooks/use-media-query.ts`](packages/web/hooks/use-media-query.ts) — never hand-write widths so CSS and JS stay on the same cutoffs
- PWA (Phase 24 Theme C): the app is **installable**, not offline-capable. The manifest ([`public/site.webmanifest`](packages/web/public/site.webmanifest)) carries the real name/icons + theme-aware (dark) colours; iOS chrome comes from `metadata.appleWebApp` in [`layout.tsx`](packages/web/app/layout.tsx). The service worker ([`public/sw.js`](packages/web/public/sw.js), registered by [`pwa-register.tsx`](packages/web/components/pwa-register.tsx)) is **network-first for same-origin code** + a precached shell — it **never touches the gateway origin**, so live data is always fresh and there's no false offline promise. It only activates in a production build (skipped in `next dev`). The install affordance lives in Settings → Appearance ([`pwa-install.tsx`](packages/web/components/pwa-install.tsx)).

---

## Testing

> Full guide: [`docs/TESTING.md`](docs/TESTING.md) — layers, run commands, where baselines live, how to add tests.

Four layers, each independently runnable:

| Layer | Command | Scope |
|-------|---------|-------|
| Shared unit | `moon run shared:test` | Zod schemas, pure helpers |
| Gateway | `moon run gateway:test` | Services (fakes), repositories (`:memory:` SQLite), controllers |
| Web unit + stories | `moon run web:test` | RTL components, hooks, Storybook stories as browser tests |
| Playwright flows | `moon run web:e2e` | Cross-package flows against a seeded real gateway |
| All | `moon run :test` | Full suite (what `moon ci` runs) |

- **Vitest** across all packages; file placement: `foo.ts` → `foo.test.ts` alongside
- Unit-test services with in-memory repository fakes (`vi.fn()` — no `@nestjs/testing`)
- Integration-test repositories against a real SQLite (use `createTestDb()` from `gateway/src/test/`)
- Test behaviour, not implementation — no asserting on internal calls when a public outcome would do
- Snapshot tests only for stable, reviewable output (CLI rendering, WS event shapes)
- React tests with **@testing-library/react**; query by accessible role/label, not test IDs
- **Storybook stories run as Vitest browser tests** via `@storybook/addon-vitest` — add a `play` function to assert interactions
- **Web tests need a worktree outside `.git/`** — Vite denies `.git/**`, so `web:test` can't collect inside the old `.git/worktrees/<n>/` layout. Worktrees now live in the repo-root **`.worktrees/`** dir (outside `.git/`), so `web:test` runs fine inside them; the primary checkout also works.

---

## Adding a New Capability

1. Define types/schemas in `packages/shared/`
2. If persistent: add a Drizzle schema entry + a migration
3. Build repository → service → handler → route in `gateway`
4. Expose via the typed API client in `shared`
5. Add the CLI command and/or web UI
6. Tests at each layer
7. Document in the README and (if user-facing) update `midnite.json` schema docs
