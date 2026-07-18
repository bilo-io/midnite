# Knowledge Graph — `midnite`

> Generated with [`/graphify`](https://github.com/sponsors/safishamsi). Raw outputs live in
> [`graphify-out/`](graphify-out/) — open [`graphify-out/graph.html`](graphify-out/graph.html)
> for the interactive view and [`graphify-out/GRAPH_REPORT.md`](graphify-out/GRAPH_REPORT.md)
> for the full audit. Regenerate with `/graphify` or `graphify update`.

## Scope & cost

- **Scope:** all **2,065 code files** across the monorepo, AST-only (images + docs skipped).
- **Cost:** **0 LLM tokens** — code is extracted structurally (tree-sitter AST), so this build was free.
- **Graph:** **13,221 nodes · 35,521 edges · 468 communities** (undirected).

## Graph health (honest audit)

The integrity check is non-fatal but worth knowing when reading edge counts:

- **6,977 dangling-endpoint edges** + ~600 collapsed edges — expected for an AST-only code
  graph: references to symbols outside the corpus (npm packages, node built-ins, external types),
  plus repeated DI-constructor injections collapsed to a single edge. Edge counts therefore
  **undercount** external references.
- **86 `.sql` files** contributed no nodes (`tree_sitter_sql` not installed — `pip install "graphifyy[sql]"` to include them).
- **63 JSON/snapshot/settings files** produced no nodes (no code structure to extract).

## God nodes (core abstractions — most connected)

| Rank | Node | Edges | What it is |
|-----:|------|------:|------------|
| 1 | `MidniteDb` | 449 | The DB handle every repository routes through |
| 2 | `cn()` | 443 | Web class-merge helper — touches nearly every UI component |
| 3 | `fetchJson()` | 249 | The shared typed API client |
| 4 | `MidniteConfig` | 195 | Validated config object passed to every consumer |
| 5 | `Task` | 195 | The central domain type |
| 6 | `TasksService` | 151 | Task business logic + state machine |
| 7 | `CurrentUser` | 120 | Auth request context |
| 8 | `CurrentUserPayload` | 119 | Auth token payload |
| 9 | `parseConfig()` | 97 | Config zod parse entrypoint |
| 10 | `TasksRepository` | 96 | Drizzle task queries |

Three of these — `MidniteDb`, `cn()`, and `Task` — are true **cross-community bridges**, each
connecting 40–55 communities (`MidniteDb` ties the gateway's data layer together; `cn()` ties the
web UI together; `Task` spans web + gateway + shared).

## Notable communities

The clustering surfaced 468 communities; the largest, meaningfully-named ones:

- **Database Schema & Types** — `MidniteDb`, `Tx`, repository insert/row types
- **Kanban Board UI** — board render, task cards, blocked badges
- **Workflow Engine** / **Task Creator & Workflow Storage** / **Workflow Node Types**
- **Backup, Approvals & Guardrails** — backup service, blast-radius, guardrails
- **LLM Classifier**, **Notifications**, **Sessions & Secret Scrubbing**
- **OAuth & Credentials**, **Identity & Token Repositories**, **Ownership & Access Control**
- **Metrics WebSocket Gateway**, **Checks Runner Service**, **Doctor & Health Checks**
- **Nest Module Registration** — the `*.module.ts` wiring
- Web surfaces: **Web Dashboard Widgets**, **Web API Routes & Schemas**, **Councils & Dashboard UI**,
  **Home Page & Greeting**, **Assistant Chat UI**, **PR Review & Dialogs UI**, **3D Office Scene**

## Surprising connections (inferred cross-links)

- `waitFor()` / `makeService()` → `r()` in `packages/ui/vite.config.ts` — test helpers appearing to
  bridge into the UI build config (likely a name collision on a minified `r()`).
- `Detail()` (web councils page) ↔ `council()` (gateway council-report test) — the councils feature
  spanning web + gateway.
- `storeNarrative()` → `RetroBuilderService` — the retro accessor module wiring into the builder.

## Suggested investigations

- **`Task` bridges 50+ communities** across web, gateway, and shared — trace where the coupling
  spread it that far.
- **2,882 weakly-connected nodes** — possible dead or loosely-wired code, worth an audit.
- **Low-cohesion split candidates:** `Web Dashboard Widgets` (0.016), `Web API Routes & Schemas`
  (0.018), `Backup, Approvals & Guardrails` (0.026) — large but weakly interconnected; candidates
  for breaking into more focused modules.

---

_Ask questions against the graph with `/graphify query "<question>"`, trace a path with_
_`/graphify path "A" "B"`, or explain a node with `/graphify explain "<node>"`._
