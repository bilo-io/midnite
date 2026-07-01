# Phase 48 — Slides (reveal.js decks, first-class surface)

> midnite has a rich web surface — a kanban board, a workflow editor, an office
> visualization, a docs app — but nowhere to **author and present a deck**. Phase 48 adds
> **Slides**: a dedicated sidenav surface where you create reveal.js decks, edit slides in
> **Markdown or HTML** (your choice, per slide), preview live, present fullscreen, and export
> to HTML/PDF. Decks **inherit the app's active theme** (light/dark, accent) with optional
> per-deck overrides, so a presentation looks like it belongs to midnite by default. This is a
> **net-new domain**, not an extension of an existing one — it slots in beside tasks,
> workflows, and councils as another first-class entity.

> **Scope guardrails (CLAUDE.md).** New gateway feature module `slides/` following
> **controller → service → repository** (template: the
> [`workflows/`](../packages/gateway/src/workflows/) module — entity, team-scope, RBAC,
> `SearchIndexService`, `AuditService`, all mirrored here). Every wire contract (the `Deck`,
> `Slide`, create/update requests, `DeckSummary`) is a **zod schema in
> [`shared`](../packages/shared/src/)** — never untyped JSON. Decks are **team-scoped**
> ([`teamScopeFilter`](../packages/gateway/src/db/team-scope.ts)) and writes are RBAC-gated
> (`RequiresRole('member')`), reads team-filtered — mirroring workflows. Persistence follows
> the **workflows `graph` precedent**: denormalized **metadata columns** (name, slide count,
> format) for the list endpoint + a single **JSON `content` text column** for the deck body —
> **no normalized per-slide rows**. Forward-only Drizzle migrations. The web stays a **static
> export** (`output: 'export'`): detail/editor/present routes use the **query-string
> convention** (`/slides/view?id=`, `/slides/present?id=`) like tasks/councils/ideas/media —
> **no `[id]` route segments**. reveal.js is a **client-only** dependency (`'use client'` +
> dynamic import, never SSR'd). No business logic in the web layer — it's a pure client of the
> gateway over the typed API client in `shared`/`web`.

> Effort tags: **S** small · **M** medium · **L** large. **A** (contract + DB) is the
> foundation; **B** (gateway CRUD) is the spine; **C** (client) wires web to it; **D** (list +
> nav) is the entry point; **E** (editor + live preview) is the heart; **F** (present + export)
> is the payoff. A→B→C→D→E→F is the intended order; E and F both build on the deck the earlier
> themes persist and serve.

---

## Current state (what exists to build on)

- **Feature-driven nav** — [`web/lib/features.ts`](../packages/web/lib/features.ts) is the
  central `FeatureKey` union + `FEATURES` array; [`web/components/nav-bar.tsx`](../packages/web/components/nav-bar.tsx)
  renders every entry automatically. A new surface = one `FeatureKey` + one `Feature` object.
- **Canonical CRUD module** — [`workflows/`](../packages/gateway/src/workflows/)
  (`workflows.controller.ts` → `workflows.service.ts` → `workflows.repository.ts` →
  `workflows.module.ts`, registered in [`app.module.ts`](../packages/gateway/src/app.module.ts)):
  team-scoped repo (`teamScopeFilter`), `RequiresRole` writes, optional `SearchIndexService` +
  `AuditService`, `randomUUID()` ids, `updatedAt`-ordered list. **Mirror its structure.**
- **JSON-body persistence precedent** — the `workflows` table stores `graph` as a **JSON text
  column** alongside denormalized columns (`name`, `enabled`, `triggerType`) for cheap list
  queries. Slides follow the same split: metadata columns + a `content` JSON blob.
- **Shared contracts** — [`shared/src/workflow.ts`](../packages/shared/src/workflow.ts) is the
  schema template (`WorkflowSchema`, `CreateWorkflowRequestSchema`, `WorkflowSummarySchema`),
  re-exported from [`shared/src/index.ts`](../packages/shared/src/index.ts); typed client
  methods live in [`web/lib/api.ts`](../packages/web/lib/api.ts) (`fetchJson` + a response schema).
- **DB + migration flow** — tables in [`db/schema.ts`](../packages/gateway/src/db/schema.ts)
  (`sqliteTable`, `text('id').primaryKey()`); `drizzle-kit generate` emits an auto-numbered SQL
  file under [`drizzle/`](../packages/gateway/drizzle/), applied on boot by
  [`db/db.module.ts`](../packages/gateway/src/db/db.module.ts).
- **Theme tokens** — [`ui/src/styles/tokens.css`](../packages/ui/src/styles/tokens.css) defines
  `--background` / `--foreground` / `--accent` / `--border` / `--muted-foreground` as HSL
  triplets (consumed `hsl(var(--token))`), auto-switching via `.dark` on `<html>`; Phase 39's
  `data-accent` layers a personalized `--primary`. A deck injects these into the reveal root.
- **Static-export routing precedent** — [`app/(main)/tasks/`](../packages/web/app/(main)/tasks/)
  and councils/ideas/media use a `…/view/page.tsx` static route reading `?id=` via
  `useSearchParams()` and fetching client-side through `useApiData()`. **No `generateStaticParams`,
  no `[id]` segments.** Slides follow the same pattern.

---

## Theme A — Deck contract + DB + migration — **S-M** ✅ DONE (PR #260, 2026-07-01)

Define the entity once, in `shared`, and persist it. *(Built with Theme B in one slice.
`deriveDeckFormat` lives in `shared` so service + tests share it; empty decks allowed —
`DeckContentSchema.slides` defaults to `[]`. Migration `0062` hand-trimmed to the new table.)*

- [x] **shared:** [`shared/src/slide.ts`](../packages/shared/src/) — `SlideSchema`
      (`{ id, format: 'md' | 'html', content: string, notes?: string }`), `DeckThemeSchema`
      (optional `{ background?, foreground?, accent? }` HSL-triplet overrides), `DeckContentSchema`
      (`{ slides: Slide[], theme?: DeckTheme }`), `DeckSchema` (`id`, `name`, `description?`,
      `slideCount`, `format: 'md' | 'html' | 'mixed'`, `content: DeckContent`, timestamps,
      `createdBy?`, `teamId?`), `CreateDeckRequestSchema` (`name`, `description?`, optional seed
      `content`), `UpdateDeckRequestSchema` (partial: name/description/content), `DeckSummarySchema`
      (list-optimized: id, name, description?, slideCount, format, updatedAt). Re-export from
      [`shared/src/index.ts`](../packages/shared/src/index.ts).
- [x] **gateway:** `slides` Drizzle table in [`db/schema.ts`](../packages/gateway/src/db/schema.ts)
      — `id` (text PK, `randomUUID`), `name`, `description`, `slideCount` (integer, derived),
      `format` (text: `md`/`html`/`mixed`, derived), `content` (text JSON), `createdAt`,
      `updatedAt`, `createdBy`, `teamId`; an `updatedAt` index for the list. Forward-only
      migration via `drizzle-kit generate` (hand-trim the emitted `.sql` to just the new table —
      the snapshot re-emits existing tables).

---

## Theme B — Gateway CRUD module — **M** ✅ DONE (PR #260, 2026-07-01)

The `slides/` module: team-scoped, RBAC-gated, searchable. *(All writes gated
`RequiresRole('member')` per the doc — not workflows' admin-for-update.)*

- [x] `slides/slides.repository.ts` — team-scoped Drizzle wrapper (`insertDeck`, `getDeckRow`,
      `listDeckRows` ordered by `desc(updatedAt)`, `updateDeck`, `deleteDeck`) using
      `teamScopeFilter(slides.createdBy, slides.teamId, scope)`.
- [x] `slides/slides.service.ts` — business logic: `randomUUID` id, **derive `slideCount` +
      `format`** from `content` on every create/update (`format` = the single per-slide format,
      or `mixed` when slides differ), validate `content` against `DeckContentSchema`, own
      timestamps. Inject `@Optional()` `SearchIndexService` (index deck `name` → title,
      `description` → body) and `@Optional()` `AuditService`. Explicit `@Inject` tokens (gateway
      runs under `tsx` — no emitted param metadata).
- [x] `slides/slides.controller.ts` — `@Controller('slides')`: `GET /slides` (summaries, team-scoped),
      `GET /slides/:id`, `POST /slides` (`RequiresRole('member')`, `CreateDeckRequestSchema`),
      `PATCH /slides/:id` (`RequiresRole('member')`, `UpdateDeckRequestSchema`), `DELETE /slides/:id`
      (`RequiresRole('member')`). Thin: zod-parse → service → typed response.
- [x] `slides/slides.module.ts` — register providers + controller; import into
      [`app.module.ts`](../packages/gateway/src/app.module.ts).

---

## Theme C — Typed API client + web data layer — **S** — ✅ DONE (PR #263, 2026-07-01)

Wire web to the gateway through `shared` contracts — no ad-hoc fetches.

- [x] **web:** `listDecks()` / `getDeck(id)` / `createDeck(body)` / `updateDeck(id, body)` /
      `deleteDeck(id)` in [`web/lib/api.ts`](../packages/web/lib/api.ts) (`fetchJson` + the deck
      response schemas from `shared`).
- [x] Consumed via the existing `useApiData` + `invalidateData` convention (the codebase has no
      per-feature hook files) rather than bespoke `useDecks` hooks — the list, editor, and view all
      use it. *(Decision: match the codebase pattern.)*

---

## Theme D — Sidenav entry + list/grid view — **M** — ✅ DONE (PR #263, 2026-07-01)

The entry point: see your decks, jump to one, or start a new one.

- [x] **web:** add `'slides'` to the `FeatureKey` union + a `Feature` object (`href: '/slides'`,
      `Presentation` icon from lucide-react, description) in
      [`web/lib/features.ts`](../packages/web/lib/features.ts) — nav renders it automatically.
- [x] `app/(main)/slides/page.tsx` — the list surface via the list endpoint: **grid ↔ table**
      toggle; each deck shows name, description, **slide count**, an **md / html / mixed format
      badge**, and updated-time; row/card actions (open, delete). An **empty state** with a
      prominent "New deck" affordance linking to `/slides/new`.
- [x] Delete confirmation; live refresh via the Query cache (invalidate on create/delete). No
      deck body is fetched here — the summary endpoint is enough.

---

## Theme E — Editor + live reveal.js preview — **L** — ✅ DONE (PR #263, 2026-07-01)

The heart: author a deck and watch it render.

- [x] `app/(main)/slides/new/page.tsx` (create) and `app/(main)/slides/view/page.tsx`
      (edit, reads `?id=` via `useSearchParams`) — both mount the same client-only editor.
      `/slides/new` creates on first save, then routes to `…/view?id=`.
- [x] **Editor:** a slide list (add / delete / **reorder** via @dnd-kit drag), and per selected
      slide a **format toggle (Markdown | HTML)** + a content textarea + speaker-notes field; deck
      name + description fields. Save through the `updateDeck` / `createDeck` mutations. *(Save:
      button disabled-when-clean **plus** configurable autosave via a new Settings → Editor
      section.)*
- [x] **Live preview:** reveal.js loaded **client-only** (dynamic import in an effect, never SSR'd;
      `reveal.js` added to `transpilePackages`) rendering the current deck — Markdown via reveal's
      markdown plugin, HTML slides **DOMPurify-sanitized** before render. Preview updates as you edit.
- [x] **Theme inheritance + per-deck override:** the reveal root consumes the app's live CSS vars
      (`--background` / `--foreground` / `--accent`) by default; an **override panel** (accent /
      background / foreground) writes HSL overrides into `content.theme`, layered over inherited vars.

---

## Theme F — Present mode + export — **M** — ✅ DONE (PR #267, 2026-07-01)

Show it fullscreen; take it with you.

- [x] `app/(main)/slides/present/page.tsx` — reads `?id=`, renders the deck **fullscreen** (via a
      `mode: 'present'` prop on the existing `RevealPreview`) with reveal's controls + keyboard
      navigation (arrows, `f` fullscreen, `esc` overview), theme applied. A "Present" affordance
      links here from the editor top bar **and** each deck card / table row.
- [x] **Export PDF:** client-side via reveal's **print-pdf** path (present route honors a
      `?print-pdf` query → reveal's bundled print stylesheet → browser Save-as-PDF) — no server
      rendering, fits static export + the desktop app.
- [x] **Export HTML:** serialize the deck to a **standalone, self-contained reveal HTML file**
      (inlined slides + resolved theme colours; reveal.js from a pinned CDN) offered as a
      download — opens anywhere, no midnite needed.

---

## Files this phase touches (map)

- **New (shared):** [`shared/src/slide.ts`](../packages/shared/src/) — `Slide` / `DeckTheme` /
  `DeckContent` / `Deck` / create / update / `DeckSummary` schemas; re-export from
  [`shared/src/index.ts`](../packages/shared/src/index.ts); client methods in
  [`web/lib/api.ts`](../packages/web/lib/api.ts)
- **New (gateway):** `gateway/src/slides/` — `slides.module.ts`, `slides.controller.ts`,
  `slides.service.ts`, `slides.repository.ts`
- **New (gateway):** `slides` table in [`db/schema.ts`](../packages/gateway/src/db/schema.ts) + a
  forward-only [`drizzle/`](../packages/gateway/drizzle/) migration
- **Edit (gateway):** register `SlidesModule` in [`app.module.ts`](../packages/gateway/src/app.module.ts)
- **New (web):** `app/(main)/slides/page.tsx` (list), `slides/new/page.tsx`, `slides/view/page.tsx`
  (editor), `slides/present/page.tsx` (present); `web/components/slides/` — `deck-card.tsx`,
  `deck-editor.tsx`, `slide-list.tsx`, `reveal-preview.tsx` (client-only), `deck-theme-controls.tsx`,
  `deck-export.tsx`
- **Edit (web):** [`web/lib/features.ts`](../packages/web/lib/features.ts) (nav entry);
  [`next.config.mjs`](../packages/web/next.config.mjs) `transpilePackages` if reveal.js needs it
- **New (web dep):** `reveal.js` (+ its markdown plugin) as a `web` dependency
- **Reuse:** `teamScopeFilter`, `SearchIndexService`, `AuditService`, `useApiData`, the app theme
  tokens — no changes to them.

---

## Verification

- [ ] The **Slides** nav item appears; `/slides` lists the team's decks (grid + table) with name,
      slide count, and an **md/html/mixed badge**, or an empty state linking to `/slides/new`.
- [ ] `/slides/new` creates a deck; the editor adds/reorders/deletes slides, toggles each slide
      between **Markdown and HTML**, and the **live reveal.js preview** updates as you edit; Save
      persists and routes to `/slides/view?id=`.
- [ ] A saved deck reloads intact (metadata columns + JSON `content` round-trip); `slideCount` and
      the `format` badge are derived correctly (single format vs. `mixed`).
- [ ] A deck **inherits the active theme** (toggling app light/dark restyles the preview); a
      **per-deck override** (accent/background/foreground) applies over the inherited vars and
      persists in `content.theme`.
- [ ] `/slides/present?id=` runs the deck **fullscreen** with reveal controls + keyboard nav;
      **PDF export** (print-pdf) and **standalone HTML export** both produce a usable file.
- [ ] Decks are **team-scoped** (a user sees only their team's) and **writes are RBAC-gated**
      (`member`+); decks are findable via **global search** by name/description.
- [ ] Everything works under **static export** (`output: 'export'`) — routes use `?id=` query
      strings, reveal.js never SSRs, `moon run web:build` succeeds.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across the graph
      (shared schema units; gateway service + repository + controller tests incl. `format`/`slideCount`
      derivation + team-scope; web RTL/story for the list + editor; a Playwright create→edit→present flow).

---

## Decisions / open questions

1. **Per-slide format with a deck-level badge** *(settled).* Each slide independently chooses
   **Markdown or HTML**; the deck's list badge shows the single format, or **`mixed`** when
   slides differ. Both render into one reveal deck.
2. **Single JSON `content` column, not normalized slide rows** *(settled).* Metadata (name, slide
   count, format) lives in columns for the list endpoint; the slides array + theme override live
   in a `content` JSON text column — mirrors the workflows `graph` precedent. Reordering/editing
   is a whole-deck write; no per-slide row churn.
3. **Static-export routing via query strings** *(settled).* `/slides/new` is a static route;
   `/slides/view?id=` (editor) and `/slides/present?id=` (present) read `?id=` client-side — the
   tasks/councils/ideas/media pattern. **No `[id]` segments / `generateStaticParams`** (intercepting
   + param-prerender routes are unavailable under `output: 'export'`).
4. **Theme: inherit + per-deck override** *(settled).* Decks consume the app's live theme CSS vars
   by default; a per-deck override (accent/background/foreground, stored as HSL triplets in
   `content.theme`) layers on top. A full reveal-theme picker is **out of scope**.
5. **reveal.js is client-only** *(recommend).* Loaded via `'use client'` + dynamic import
   (`ssr: false`); add to `transpilePackages` only if its ESM build requires it. Settle the import
   shape early in Theme E — it's the one integration risk. HTML slides are **sanitized** before render.
6. **PDF export = reveal print-pdf; HTML export = standalone file** *(recommend).* Both client-side
   (no server rendering) so they work in static export + the desktop shell. PDF via the browser
   print path; HTML as a self-contained downloadable reveal doc.
7. **Searchable, audited, team-scoped** *(recommend).* Index decks in the FTS5 search index
   (name/description) and audit writes via the optional services — cheap, consistent with workflows.
8. **CLI + task/repo linking are out of scope** *(settled, deferred).* Web is the surface for v1;
   `midnite slides …` commands and associating a deck with a task/repo (e.g. "present this plan")
   are future themes.
