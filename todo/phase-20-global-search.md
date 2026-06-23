# Phase 20 — Global search (full-text across the app)

> The app has grown wide — tasks, projects, memory, notes, councils, workflows — but there's **no way to jump to a thing by name**. The ⌘K command palette ([`command-palette.tsx`](../packages/web/components/command-palette.tsx)) is **navigation-only**: it lists enabled pages + settings and filters their labels with a plain `includes()`. Its own comment says it: *"Navigation-only for v1 … the command list is extensible, so content search can slot in later."* Per-page search ([`search-bar.tsx`](../packages/web/components/search-bar.tsx)) only writes `?q=` and filters that page's **already-loaded** list — client-side, single-entity. **Phase 20 adds real global search:** a full-text index over every domain, a ranked `GET /search` endpoint, content search wired into the palette, and a dedicated results page.

> **Engine: SQLite FTS5** (settled in brainstorm). Full-text matching with `bm25()` ranking + `snippet()`/`highlight()`. **Constraint that shapes the design:** CLAUDE.md bans **triggers** and computed columns, so the usual FTS5 external-content + trigger-sync pattern is out — the index is maintained in the **service write-path** instead (each domain mutation upserts/removes its index row), plus a boot **backfill** and a **reindex** route so pre-existing data gets covered.

> **Scope guardrails (CLAUDE.md).** The `SearchResult` shape is a new contract → it lives in [`@midnite/shared`](../packages/shared/src/) with a zod discriminated union; `cli`/`web` stay pure clients. A new **`search` module** owns the FTS table + the `GET /search` endpoint and **composes domain services** — it does **not** import other domains' repositories. Index maintenance is a thin call each domain service makes (or an event the search module subscribes to where a bus already exists, e.g. [`TaskEventBus`](../packages/gateway/src/tasks/task-event-bus.ts)). Forward-only migration for the virtual table; never edit a merged migration. `shared` is the contract.

> Effort tags: **S** small · **M** medium · **L** large. **Theme A is the substrate** (index + maintenance) and the bulk of the phase; B depends on A; C/D are independent client slices over B. Every box starts unchecked.

---

## Current state (baseline to build on)

- **palette (built, navigation-only):** [`command-palette.tsx`](../packages/web/components/command-palette.tsx) — ⌘K/Ctrl+K, lists `FEATURES` pages + `ALWAYS_ON` settings, `includes()` filter, `router.push(href)` on select. Extensible by design (its comment invites content search).
- **per-page search (built, local):** [`search-bar.tsx`](../packages/web/components/search-bar.tsx) writes `?q=`; views like [`tasks-view.tsx`](../packages/web/components/tasks-view.tsx) read it and filter loaded data. [`filter-pills.tsx`](../packages/web/components/filter-pills.tsx) is the sibling pattern.
- **no server search:** nothing in the gateway does cross-entity search; no FTS tables exist.
- **searchable domains (each a gateway module + repository):** `tasks`, `projects`, `memories`, `notes`, `councils`, `workflows`. Several already publish mutation events (e.g. [`task-event-bus.ts`](../packages/gateway/src/tasks/task-event-bus.ts)) — reusable for index sync.
- **DB:** SQLite + Drizzle; migrations forward-only in [`drizzle/`](../packages/gateway/drizzle/) (latest `0029_*`). FTS5 ships with the bundled SQLite.

---

## Theme A — FTS5 index + contract + maintenance — **M–L** — ✅ DONE (PR #90, 2026-06-22 — see [done.md](done.md))

The substrate. One unified index, kept fresh in the service layer (no triggers).

### A1. `SearchResult` contract in `shared` — **S**
- [x] A discriminated union `SearchResult` (`search.ts`): `{ type: 'task'|'project'|'memory'|'note'|'council'|'workflow', id, title, snippet, route, score }` + a `SearchResponse` (`{ results, total, byType }`) + the request query shape (`q`, optional `type`, `limit`). zod + tests. (Decision §5 — entity set.)

### A2. Unified `search_index` FTS5 table + migration — **M**
- [x] A forward-only migration (`0034`) creating an FTS5 **virtual table** `search_index(type, entity_id, title, body)` (both keys UNINDEXED) — a **single unified** index so one `MATCH` query ranks across all domains (Decision §3). `entity_id` + `type` are the lookup key back to the source row; `title`/`body` are the indexed text. Authored as a `drizzle-kit --custom` migration (Drizzle can't model FTS virtual tables); queried via raw `sql`.

### A3. `SearchIndexService` (upsert / remove / query) — **M**
- [x] A `SearchIndexService` in the new `search` module: `upsert(doc)`, `remove(type, id)`, `clear`, `count`, and `query(match, { type?, limit })` running `… WHERE search_index MATCH ? ORDER BY bm25(...)` with `snippet()` (title-boosted bm25 weights, `<mark>` markers). Around the DB; unit-tested against `:memory:`.

### A4. Write-path maintenance per domain — **M**
- [x] Each domain keeps the index current on create/update/delete: **tasks** reuse the existing [`TaskEventBus`](../packages/gateway/src/tasks/task-event-bus.ts) (the search module subscribes — `tasks.service` untouched); the other five inject `SearchIndexService` (`@Optional()`) and `upsert`/`remove` directly. Per-domain field→`title`/`body` mapping lives in one place: `search/lib/index-mappers.ts`.
- [x] **Boundary:** the search module depends on domain **services** for backfill reads; domain services depend on the `@Global` `SearchIndexService` for maintenance. No repository crossing.

### A5. Backfill + reindex — **S–M**
- [x] **Boot backfill** — `onApplicationBootstrap` populates a freshly-migrated (empty) index from all domains; fail-soft so a backfill problem can't crash startup.
- [x] **`POST /search/reindex`** — an admin route that rebuilds the index from scratch (drop + repopulate). Idempotent.

---

## Theme B — Search endpoint + ranking/snippets — **M** — ✅ DONE (PR #90, 2026-06-22 — see [done.md](done.md))

- [x] **`GET /search?q=&type=&limit=`** — a thin `SearchController` → `SearchService` that runs `SearchIndexService.query`, maps rows to `SearchResult` (route per `type`+`id`), groups counts by type, and returns `SearchResponse`. Empty/short `q` (< 2 chars) → empty result. Validate query via the shared schema.
- [x] **Ranking** — `bm25()` order with title weighted over body; `snippet()` with the match wrapped in `<mark>`.
- [x] **Results render from the index** (Decision §6) — the denormalized `title`/`snippet` make a result row self-contained; the client routes by `type`+`id` without a re-fetch per result.
- [x] Gateway tests (`:memory:`): ranked results + snippets; `type=` filters; counts-by-type; a deleted entity drops out; reindex rebuilds; backfill across all 6 domains. (Also: a `midnite search` CLI command + typed `search()` client.)

---

## Theme C — Command palette integration — **M** — ✅ DONE (PR #96, 2026-06-22 — see [done.md](done.md))

Realize the palette's anticipated "content search."

- [x] Extend [`command-palette.tsx`](../packages/web/components/command-palette.tsx) beyond navigation: a **debounced** query (with **abort-on-keystroke**) hits `GET /search`; render results **grouped by type** (Pages · Tasks · Projects · Memory · Notes · Councils · Workflows), with the existing page/nav commands as their own group.
- [x] Keyboard nav across groups (arrow keys, Enter to route to the entity's page, the existing ⌘K open/close). Per-group result cap with a **"+N more"** count (the "see all in Search" deep-link → the `/search` page lands with **Theme D**).
- [x] Loading + empty states; keep nav-only behaviour instant (don't block page-jump on the network search).

---

## Theme D — Dedicated `/search` page — **M** — ✅ DONE (PR #105, 2026-06-22 — see [done.md](done.md))

The "see everything" surface.

- [x] A `/search` route (App Router) reading `?q=` (deep-linkable; reuses [`search-bar.tsx`](../packages/web/components/search-bar.tsx)'s URL-backed pattern) → one `GET /search` at the max limit.
- [x] **Filter by type** ([`filter-pills.tsx`](../packages/web/components/filter-pills.tsx), `?type=`) — client-side over the single response (no refetch on toggle); pills show only matched types + counts. Grouped by type, more rows than the palette, each result links to its entity, highlighted snippets (shared `lib/highlight.tsx`).
- [x] Empty / short-query / loading / no-results states; the palette's per-type "+N more" deep-links here with the query + type prefilled.

**This closes Phase 20 (all themes A–D shipped).**

---

## Out of scope (named, not built here)

- **Semantic / vector / embeddings search** — keyword + FTS only, consistent with the project's stated no-RAG stance ([phase-15](phase-15-smart-intake.md)). No embedding model, no vector store.
- **Searching terminal scrollback / run logs / agent transcripts** — high-volume, ephemeral text; a separate concern from indexing domain entities.
- **Remote / multi-install / cross-host search** — the index is the local gateway's SQLite.
- **Saved searches / search history** — possible follow-on; not v1.
- **Replacing per-page filtering** — [`search-bar.tsx`](../packages/web/components/search-bar.tsx)'s in-page filter stays; global search is additive.

---

## Files this phase touches (map)

- **shared:** new [`search.ts`](../packages/shared/src/) (`SearchResult` union + `SearchResponse` + request schema) + barrel + tests; typed client `search()` in the web/cli clients.
- **gateway:** new `search/` module — `search.controller.ts` (`GET /search`, `POST /search/reindex`), `search.service.ts` (compose + map + group), `search-index.service.ts` (FTS upsert/remove/query), `search.module.ts` (register in `AppModule`); a forward-only FTS5 migration in [`drizzle/`](../packages/gateway/drizzle/); write-path maintenance calls in `tasks`/`projects`/`memories`/`notes`/`councils`/`workflows` services (or event subscriptions where a bus exists); boot backfill wiring.
- **web:** content search + grouped results in [`command-palette.tsx`](../packages/web/components/command-palette.tsx); a new `/search` page reusing [`search-bar.tsx`](../packages/web/components/search-bar.tsx) + [`filter-pills.tsx`](../packages/web/components/filter-pills.tsx); `search()` client in [`lib/api.ts`](../packages/web/lib/api.ts).
- **Docs:** update [`CLAUDE.md`](../CLAUDE.md) (search module + FTS-in-service-layer maintenance pattern, since triggers are banned) + README; append to [`done.md`](done.md) as slices land.

---

## Verification

- [x] With data across types, ⌘K → type a term → **grouped, ranked results** (tasks, projects, memory, …) appear; Enter routes to the entity. Page/nav commands still work instantly. *(Theme C — PR #96.)*
- [ ] `GET /search?q=foo` returns ranked `SearchResult`s with snippets; `?type=task` filters to one type; counts-by-type are correct.
- [ ] Creating an entity makes it findable; editing its title updates the match; deleting it removes it from results (write-path maintenance works, no trigger).
- [ ] A DB with **pre-existing** rows (migration applied to populated data) is fully searchable after **boot backfill**; `POST /search/reindex` rebuilds the index.
- [ ] The `/search` page deep-links via `?q=`, filters by type, and shows more rows than the palette; the palette's "see all" lands there prefilled.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across the graph; `moon ci` green. (Run web tests from the **primary checkout**, not a `.git` worktree.)

---

## Decisions / open questions

1. **Search engine** *(settled in brainstorm: FTS5).* SQLite FTS5 with `bm25()` ranking + `snippet()`/`highlight()`. Chosen over a `LIKE`/`instr` scan for ranking + snippet quality.
2. **Surface** *(settled in brainstorm: palette + page).* Content search in the ⌘K palette **and** a dedicated `/search` page for full results.
3. **Index shape** *(recommend: unified).* A single `search_index` FTS5 table over all domains (one `MATCH` ranks everything together) rather than per-domain FTS tables (which need a merge + re-rank in app code). `type` discriminates; `entity_id` routes back.
4. **Index maintenance** *(recommend: service write-path, reuse events where present).* Triggers are banned, so each domain service maintains its index rows on mutation — directly, or via the search module subscribing to an existing event bus. Document the pattern so new domains remember to index.
5. **Entities in scope** *(recommend).* tasks · projects · memory · notes · councils · workflows. Confirm; trimming councils/workflows from v1 is fine if their text is thin.
6. **Result freshness** *(recommend: render from the index).* Store denormalized `title`/`snippet` in the index so a result row renders without a per-hit re-fetch; the client routes by `type`+`id`. Staleness window = until the next write (acceptable; the write-path keeps it current).
7. **Backfill trigger** *(open).* Backfill on first boot after the migration (empty-index check) vs. a one-shot migration-time populate. **Recommend boot-time** (batched, resumable) so a large existing DB doesn't block the migration. Confirm in the A5 PR.
