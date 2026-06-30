# Phase 41 — Command Palette & Keyboard Navigation

> midnite is already powerful, but finding a task buried in a long board still means mousing through columns, and jumping between the board, office, and settings means clicking the nav every time. **Phase 41 adds the thin keyboard layer that makes power users feel at home:** a `⌘K` command palette backed by the gateway's FTS5 search index (Phase 20) and a central keyboard shortcut system — global nav chords, a `?` help overlay, and board-level arrow-key navigation — tied together with a command registry so any page can contribute its own contextual actions.

> **Scope guardrails (CLAUDE.md).** This is a **web-only phase** — no gateway schema changes, no new REST endpoints (the existing `GET /search` already carries everything the palette needs). `cmdk` is added as a direct dep to `packages/web` (there is no shadcn `Command` wrapper in the project yet). The shared typed API client already exposes `/search`; the palette calls it directly via that client. No vim-style modal editing, no undo/redo shortcuts, no cross-device recent-history sync, no CLI palette.

> Effort tags: **S** small · **M** medium · **L** large. All four themes are independently shippable but intended to land together — A+C are the headline; B and D add the depth that makes it feel like a real keyboard-first tool.

---

## Current state (what exists to build on)

- **FTS5 search** — `GET /search?q=…` (Phase 20) returns ranked `SearchResult[]` (type-discriminated: `task`, `project`, `template`) via the typed API client in `packages/shared/src/api.ts`. Already scoped per team (Phase 38).
- **Typed API client** — [`packages/shared/src/api.ts`](../packages/shared/src/api.ts): the `MidniteClient` class used by `web` for all gateway calls.
- **Nav structure** — [`packages/web/components/layout/nav.tsx`](../packages/web/components/layout/nav.tsx): the sidebar nav whose links are the ground truth for "go to X" destinations.
- **New-task form** — already exists in the board; surface it via shortcut/action without rebuilding it.
- **Settings store** — [`packages/web/lib/app-settings.ts`](../packages/web/lib/app-settings.ts): `useLocalStorage` for persisted prefs; recent-items list lives here too.
- **No `cmdk` dep and no `Command` component** in `packages/web` yet.

---

## Theme A — Command palette core — **M** ✅ DONE (pre-existing + this PR, 2026-06-26)

The `⌘K` modal: search, navigate, act.

- [x] ~~Add `cmdk`~~ — palette was already custom-built (Phase 20); cmdk not needed.
- [x] `components/command-palette.tsx` opens on `⌘K`/`Ctrl+K`; Recent / Commands / Navigation sections before typing; debounced FTS5 search on query; keyboard nav (↑↓ Enter Esc).
- [x] Mounted in `app/(main)/layout.tsx`.
- [x] Persist recent items (last 10) to `localStorage['midnite.recent']`; pushes on navigate; clears oldest on overflow. (2026-06-26)
- [x] Debounce 200 ms; spinner while in-flight; empty state on zero results.
- [x] `role="dialog"` + `aria-modal` + `aria-label`.

---

## Theme B — Actions in the palette — **S–M** ✅ DONE (2026-06-26)

Contextual commands alongside search results.

- [x] `lib/palette-commands.tsx`: `PaletteCommandsProvider`, `useRegisterPaletteCommands`, `usePaletteCommands`. React-context registry; namespaced; ref-stable updates.
- [x] Global commands registered in `GlobalKeymap`: "Create task…" (`midnite:new-task`), "Lock screen" (`midnite:lock-screen`), "Toggle theme" (DOM + localStorage), "Go to Board/Office/Settings/Home".
- [x] `nav-bar.tsx` listens for `midnite:lock-screen`; `tasks-view.tsx` listens for `midnite:new-task`.
- [x] "Commands" section rendered in palette when query is empty or matches keyword.
- [ ] **Contextual commands** for task-detail "Move to wip/done/abandoned" — deferred (no `/tasks/:id` route exists; needs task-thread-modal integration).

---

## Theme C — Global keyboard shortcuts — **S** ✅ DONE (2026-06-26)

A central shortcut map + discovery overlay.

- [x] `lib/keyboard-shortcuts.ts`: `SHORTCUTS` array used by keymap hook + help overlay.
- [x] `hooks/use-global-keymap.ts`: binds `keydown` globally; suppresses in inputs/textareas/CE; `G+key` chord with 400 ms timeout.
- [x] Shortcuts shipped: `⌘K` palette, `?` help, `G B/O/S/H` nav chords, `N` new task.
- [x] `GlobalKeymap` client component mounted in `app/(main)/layout.tsx` (inside `PaletteCommandsProvider`).
- [x] `components/keyboard-shortcuts-help.tsx`: `?` overlay grouped by General/Navigation/Board; `Esc` closes.

---

## Theme D — Board keyboard navigation — **S** ✅ DONE (2026-06-26)

Arrow-key card focus + action keys on the kanban.

- [x] Add a `FocusedCard` state (id) to `board-view.tsx`; render a visible focus ring (offset ring, distinct from selection + dnd). Focus derives its column from the live grouping so it follows a card as it moves.
- [x] `↓`/`↑` — move focus to the next/previous card within the same column. `→`/`←` — move focus to the nearest non-empty adjacent column (same row where possible, else last card). Nav math is a pure, unit-tested helper ([`lib/board-nav.ts`](../packages/web/lib/board-nav.ts)).
- [x] `Enter` — open the focused card's detail (`TaskThreadModal`).
- [ ] ⏳ `E` — open the focused card's edit form. **Deferred:** no dedicated edit form exists (the detail modal is the edit surface, and `E` would duplicate `Enter`); revisit when a standalone edit form lands. Not in the phase's verification criteria.
- [x] `D` — mark focused card done; confirms only if the card is already in done (the literal doc rule), else immediate.
- [x] `A` — abandon focused card (always shows a confirm dialog before firing).
- [x] All board shortcuts suppressed when an `<input>`/`<textarea>`/`<select>`/`[contenteditable]` has focus, and while any modal (`[role="dialog"]`) is open.

---

## Files this phase touches (map)

- **New:** [`packages/web/components/command-palette.tsx`](../packages/web/components/command-palette.tsx) — the palette dialog
- **New:** [`packages/web/components/keyboard-shortcuts-help.tsx`](../packages/web/components/keyboard-shortcuts-help.tsx) — the `?` overlay
- **New:** [`packages/web/lib/palette-commands.ts`](../packages/web/lib/palette-commands.ts) — command registry
- **New:** [`packages/web/lib/keyboard-shortcuts.ts`](../packages/web/lib/keyboard-shortcuts.ts) — shortcut definitions
- **New:** [`packages/web/hooks/use-global-keymap.ts`](../packages/web/hooks/use-global-keymap.ts) — global key listener
- **Edit:** [`packages/web/package.json`](../packages/web/package.json) — add `cmdk`
- **Edit:** [`packages/web/app/layout.tsx`](../packages/web/app/layout.tsx) — mount `<CommandPalette />` + `useGlobalKeymap`
- **Edit:** [`packages/web/app/(main)/board/`](../packages/web/app/(main)/board/) — `FocusedCard` state + board shortcuts (Theme D)
- **Edit:** [`packages/web/app/(main)/tasks/[id]/`](../packages/web/app/(main)/tasks/) — `useRegisterPaletteCommands` for contextual task actions (Theme B)
- **No gateway changes** — `GET /search` is already shipped and typed in `shared`.

---

## Verification

> **Verified & closed (PR #237, 2026-06-30).** Walked every criterion against the
> shipped code; coverage gaps filled by a new [`e2e/command-palette.e2e.ts`](../packages/web/e2e/command-palette.e2e.ts)
> (palette sections, Toggle-theme command, `?` overlay, `G`-chord nav, `N`), alongside
> the pre-existing `search-palette.e2e.ts` (⌘K search → route) and `keyboard-nav.e2e.ts`
> (board arrows / Enter / D / A / suppression).

- [x] `⌘K`/`Ctrl+K` opens the palette from any page; typing queries `GET /search` with a 200 ms debounce (`DEBOUNCE_MS`); results show type icon + title; selecting a task result navigates to its detail. *(No **status chip**: the `SearchResult` contract carries no status and the phase is web-only — no gateway schema change — so the matched-term snippet stands in for it.)*
- [x] "Recent" section shows up to 10 most-recently visited tasks/pages (`RECENT_MAX = 10`) before any query; selecting one navigates and bumps it to the top of recent (`pushRecent` dedupes + prepends).
- [x] "Navigation" and "Settings" sections appear without typing and navigate or open the relevant page/section. *(Settings surfaces as always-on entries — Agents/Profile/Settings — inside the Navigation section.)*
- [x] "Create task…" action opens the new-task form; "Lock screen" triggers the screensaver; "Toggle theme" flips light/dark (DOM class + `midnite.theme`).
- [ ] ⏳ Contextual "Move to wip/done/abandoned" on the task detail page — **deferred** (same reason as Theme B's open item: no `/tasks/:id` route; the registry exists via `useRegisterPaletteCommands` but nothing registers them yet). Revisit with task-thread-modal integration.
- [x] `?` opens the keyboard shortcuts help overlay showing all shortcuts grouped by section (General/Navigation/Board); `Esc` closes it.
- [x] `G B`/`G O`/`G S`/`G H` navigate to the correct pages; `N` opens the new-task form when no input is focused; `Esc` closes the topmost open modal.
- [x] All global shortcuts are suppressed when `<input>`/`<textarea>`/`[contenteditable]` has focus (`inEditableElement`). *(`⌘K` deliberately still fires inside inputs — decision #3 / browser-search convention.)*
- [x] On the board, arrow keys move the visible focus ring between cards; `Enter` opens the detail; `D` and `A` prompt and transition correctly.
- [x] Board shortcuts are suppressed when any input on the board is focused (and while a visible `[role="dialog"]` is open).
- [x] `@midnite/ui` boundary test passes (no new imports from the leaf package needed for this phase).
- [x] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across the graph.

---

## Decisions / open questions

1. **Recent items scope** *(settled: localStorage only).* The last 10 task opens + nav visits, stored under `localStorage['midnite.recent']`. No gateway call needed; cleared on overflow. Cross-device sync is out of scope.
2. **Action two-step UX** *(settled: contextual only on task detail pages).* "Move to wip/done/abandoned" surfaces only when a specific task is in context — not globally — to avoid the UX confusion of a two-step "which task?" input. Pages contribute contextual commands via `useRegisterPaletteCommands`.
3. **Shortcut conflict strategy** *(settled: suppress on focused inputs).* All global hotkeys and board shortcuts are disabled when `document.activeElement` is an `<input>`, `<textarea>`, or `[contenteditable]`. This is the standard browser pattern; no opt-out mechanism needed for now.
4. **`cmdk` vs. shadcn Command wrapper** *(settled: add `cmdk` directly to `packages/web`).* No shadcn `Command` component exists in the repo yet; adding `cmdk` directly is the lighter path. If shadcn is adopted more broadly later, the `CommandPalette` component can be refactored to use the wrapper at that point.
5. **Board focus ring styling** *(open).* The focus ring must be distinct from the card's default hover/selected states, and must not clash with the `ring-primary` used for the dragged-card indicator in `@dnd-kit`. Recommend: `outline-2 outline-offset-2 outline-primary` applied via `data-focused` on the card root, separate from the dnd classes — settle while building Theme D.
6. **`cmdk` version** *(open).* Pin to the latest stable at time of install; note the version in the PR so future upgrades are intentional.
