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

## Theme A — Command palette core — **M**

The `⌘K` modal: search, navigate, act.

- [ ] Add `cmdk` to `packages/web/package.json`.
- [ ] Create [`components/command-palette.tsx`](../packages/web/components/command-palette.tsx): a `cmdk`-backed `<CommandDialog>` that opens on `⌘K`/`Ctrl+K`. Sections rendered before typing: **Recent** (last 10 items from localStorage), **Navigation** (static links mirroring the sidebar), **Settings** (top-level settings sections). Sections rendered on query: **Tasks** (debounced FTS5 call to `GET /search?q=…`) with type icon + title + status chip per result.
- [ ] Mount `<CommandPalette />` once in [`app/layout.tsx`](../packages/web/app/layout.tsx) so it is available on every route.
- [ ] Keyboard wiring: `⌘K`/`Ctrl+K` opens; `↑↓` navigates; `Enter` activates (navigates or fires action); `Esc` closes. Focus traps correctly (cmdk handles this).
- [ ] Persist recent items (last 10 task opens + nav visits) to `localStorage['midnite.recent']`; clear oldest on overflow. No gateway call.
- [ ] Debounce the FTS5 query at 200 ms; show a spinner while in-flight; show an empty state on zero results.
- [ ] Accessibility: `role="combobox"`, `aria-haspopup="listbox"`, `aria-expanded`, each result `role="option"`.

---

## Theme B — Actions in the palette — **S–M**

Contextual commands alongside search results.

- [ ] Create [`lib/palette-commands.ts`](../packages/web/lib/palette-commands.ts): a typed command registry — `{ id, label, icon?, keywords?, action: () => void }`. Commands register statically (global) or dynamically (contextual, e.g. from the task-detail page).
- [ ] Initial **global commands:** "Create task…" (opens new-task form), "Lock screen" (triggers screensaver), "Toggle theme" (light ↔ dark), "Go to Board", "Go to Office", "Go to Settings", "Go to Home".
- [ ] **Contextual commands** on the task detail page (`app/(main)/tasks/[id]/`): "Move to wip", "Move to done", "Move to abandoned" — shown only when a task is in context, not globally. Contextual commands contributed via a `useRegisterPaletteCommands` hook.
- [ ] Render the "Commands" section in the palette above search results when the query is empty or matches a command keyword.

---

## Theme C — Global keyboard shortcuts — **S**

A central shortcut map + discovery overlay.

- [ ] Create [`lib/keyboard-shortcuts.ts`](../packages/web/lib/keyboard-shortcuts.ts): an exportable array of shortcut definitions — `{ keys: string[], label: string, group: string }` — used by both the keymap hook and the help overlay.
- [ ] Create [`hooks/use-global-keymap.ts`](../packages/web/hooks/use-global-keymap.ts): a `useEffect`-based hook that binds `keydown` globally. Suppresses all shortcuts when `<input>`, `<textarea>`, or `[contenteditable]` has focus. Handles two-key sequences (`G` then `B`) with a short timeout (400 ms) between keys.
- [ ] **Shortcuts to ship:**
  - `⌘K` / `Ctrl+K` — open command palette (Theme A)
  - `?` — open keyboard shortcuts help overlay
  - `G B` — go to Board
  - `G O` — go to Office
  - `G S` — go to Settings
  - `G H` — go to Home
  - `N` — open new-task form (when not in an input)
  - `Esc` — close topmost modal/drawer (delegate to existing close handlers)
- [ ] Mount `useGlobalKeymap` in [`app/layout.tsx`](../packages/web/app/layout.tsx).
- [ ] Create [`components/keyboard-shortcuts-help.tsx`](../packages/web/components/keyboard-shortcuts-help.tsx): a modal dialog listing all shortcuts grouped by section (Navigation, Board, General). Opened by `?`; closeable with `Esc`.

---

## Theme D — Board keyboard navigation — **S**

Arrow-key card focus + action keys on the kanban.

- [ ] Add a `FocusedCard` state (id + column) to the board component ([`app/(main)/board/`](../packages/web/app/(main)/board/)). Render a visible focus ring on the focused card.
- [ ] `↓`/`↑` — move focus to the next/previous card within the same column. `→`/`←` — move focus to the nearest card in the adjacent column (same row where possible, else last card).
- [ ] `Enter` — open the focused card's detail drawer/page.
- [ ] `E` — open the focused card's edit form.
- [ ] `D` — mark focused card done (requires confirmation if already in done).
- [ ] `A` — abandon focused card (shows a confirm dialog before firing).
- [ ] All board shortcuts suppressed when any `<input>`/`<textarea>` has focus (same rule as Theme C).

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

- [ ] `⌘K`/`Ctrl+K` opens the palette from any page; typing queries `GET /search` with a 200 ms debounce; results show type icon + title + status chip; selecting a task result navigates to its detail.
- [ ] "Recent" section shows up to 10 most-recently visited tasks/pages before any query; selecting one navigates and bumps it to the top of recent.
- [ ] "Navigation" and "Settings" sections appear without typing and navigate or open the relevant page/section.
- [ ] "Create task…" action opens the new-task form; "Lock screen" triggers the screensaver; "Toggle theme" flips light/dark.
- [ ] Contextual "Move to wip/done/abandoned" appears on the task detail page and transitions the task correctly; it does **not** appear on other pages.
- [ ] `?` opens the keyboard shortcuts help overlay showing all shortcuts grouped by section; `Esc` closes it.
- [ ] `G B`/`G O`/`G S`/`G H` navigate to the correct pages; `N` opens the new-task form when no input is focused; `Esc` closes the topmost open modal.
- [ ] All global shortcuts are suppressed when `<input>`/`<textarea>`/`[contenteditable]` has focus.
- [ ] On the board, arrow keys move the visible focus ring between cards; `Enter` opens the detail; `D` and `A` prompt and transition correctly.
- [ ] Board shortcuts are suppressed when any input on the board is focused.
- [ ] `@midnite/ui` boundary test passes (no new imports from the leaf package needed for this phase).
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across the graph.

---

## Decisions / open questions

1. **Recent items scope** *(settled: localStorage only).* The last 10 task opens + nav visits, stored under `localStorage['midnite.recent']`. No gateway call needed; cleared on overflow. Cross-device sync is out of scope.
2. **Action two-step UX** *(settled: contextual only on task detail pages).* "Move to wip/done/abandoned" surfaces only when a specific task is in context — not globally — to avoid the UX confusion of a two-step "which task?" input. Pages contribute contextual commands via `useRegisterPaletteCommands`.
3. **Shortcut conflict strategy** *(settled: suppress on focused inputs).* All global hotkeys and board shortcuts are disabled when `document.activeElement` is an `<input>`, `<textarea>`, or `[contenteditable]`. This is the standard browser pattern; no opt-out mechanism needed for now.
4. **`cmdk` vs. shadcn Command wrapper** *(settled: add `cmdk` directly to `packages/web`).* No shadcn `Command` component exists in the repo yet; adding `cmdk` directly is the lighter path. If shadcn is adopted more broadly later, the `CommandPalette` component can be refactored to use the wrapper at that point.
5. **Board focus ring styling** *(open).* The focus ring must be distinct from the card's default hover/selected states, and must not clash with the `ring-primary` used for the dragged-card indicator in `@dnd-kit`. Recommend: `outline-2 outline-offset-2 outline-primary` applied via `data-focused` on the card root, separate from the dnd classes — settle while building Theme D.
6. **`cmdk` version** *(open).* Pin to the latest stable at time of install; note the version in the PR so future upgrades are intentional.
