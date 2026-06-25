# Phase 9 — Office visual overhaul

> Phase 8 ([phase-8-office-fidelity.md](phase-8-office-fidelity.md)) turned the [`/office`](../packages/web/components/office/README.md) prototype into a higher-fidelity single room — real sprites, theme-aware colours, status presence. **Phase 9 makes it a place.** Multiple themed **rooms**, **distinct characters** per agent, richer **props/decor** (lots of plants, bookshelves, a communal area), **clearly-labelled rooms** (wall-mounted name plates on a background panel), and several genuinely interactive fixtures: a **bookshelf** that opens a searchable library modal, a **board room** for managing projects, an **"Agent pool"** — a swimming pool with sun benches where agents lounge and occasionally swim lanes — a **communal area** (couches, astro turf, a gaming corner with an oversized TV + PlayStation) where you can take a coffee break and fire up a retro-games menu, and a **corner office** — a separate scene where you customise your own desk (fidget toys, a 4×4×4 Rubik's cube, a lava lamp, and a laptop with a blinking cursor).

> Status legend: boxes start unchecked; themes are largely independent. Phase 9 **builds on Phase 8's seam** — the desk-slot model, movement/collision, the Zustand↔HUD bridge ([`office-store.ts`](../packages/web/lib/office-store.ts)), and the live-data hook ([`use-office-agents.ts`](../packages/web/components/office/use-office-agents.ts)) stay; we extend the layout, the texture/asset set, the interactable set, and add a second scene. Don't re-do Phase 8's A1 asset-pack/Tiled work here — Phase 9 **consumes** it (see Libraries).

> Effort tags: **S** small · **M** medium · **L** large.

> **Provider-agnostic by design.** The office represents *agents in general*, not Claude Code specifically — a midnite agent pool can mix providers (e.g. one **Gemini**, one **Codex/OpenAI**, one **Claude Code**, plus `openai-compatible`/local). Nothing in the visuals, copy, or data model should assume Anthropic. Where a provider is known it should *inform* a character's look (a distinguishing accent/badge/palette per provider), but the system must degrade gracefully for unknown/local agents. Treat **pixel-agents** as art + interaction inspiration only — drop its Claude-Code-specific framing.

---

## Libraries & assets to consider

> The four below were supplied by the user; the rest are the supporting set. Confirm the asset-pack mix in **Decisions §1–2**.

**Supplied — primary references & assets:**

- **[pixel-agents](https://github.com/pixel-agents-hq/pixel-agents) (MIT)** — _closest prior art._ A VS Code extension that renders **Claude Code agents as animated pixel characters in a virtual office**: activity-driven animation (typing when coding, reading when searching, waiting for input), **speech bubbles**, **sub-agents as linked characters**, **6 character sprites**, customizable floors/walls/furniture, pathfinding + animation **state machines**, persisted layouts. Assets are **open-source and bundled (MIT)** → we can **reuse the office furniture + 6 character sprites directly**, and lift its **activity→animation** and **sub-agent-linking** design for Theme B/Phase 8 C. (It renders with React + Canvas 2D, not Phaser — borrow **assets + design**, not the renderer.)
- **[SkyOffice](https://github.com/kevinshen56714/SkyOffice) (MIT)** — the canonical **Phaser 3 + Colyseus + React/Redux + PeerJS** virtual office. Reference architecture for **movement, "press E to sit", proximity, multi-room, chat bubbles**, and (later) **proximity voice/screen-share + multiplayer**. Matches our stack (Phaser) and our controls (WASD/E). Mine it for the room/scene + proximity patterns now; it's also the blueprint for Phase 8 Theme E multiplayer.
- **[MetroCity – Free Top-Down Character Pack](https://jik-a-4.itch.io/metrocity-free-topdown-character-pack) (CC0)** — free, commercial-OK, no attribution required. 3 base character models, **4-direction run animations**, customization (hair/outfits/shirts/suits). Zero-friction source for **distinct agent + player characters** (Theme B1).
- **[LimeZu](https://limezu.itch.io/) ("Modern Interiors" / "Modern Office", 16×16)** — the standard office/interior tileset look: kitchen, library/bookshelves, lounge, plants, desk props, and a character generator. Covers nearly every Phase 9 prop. Note **16×16** tiles vs our current 32px grid — see **Decisions §6**. Commercial license (cheap/some free).

**Supporting:**

- **Phaser 3.90** (already in [`packages/web/package.json`](../packages/web/package.json)) — keep it. Use the **Scene Manager** for multiple rooms/scenes (`this.scene.start('corner-office')`) instead of one monolithic scene. (SkyOffice is the worked example.)
- **[Tiled](https://www.mapeditor.org/)** (`.tmj`, native Phaser loader) — author each room as a map with an **object layer** carrying `interactable`/`room`/`agentSlot` props, so rooms + fixtures come from data, not hardcoded constants. (Phase 8 A1.) [Kenney](https://kenney.nl/assets) (CC0) remains a free fallback tileset.
- **Corner-office desk toys (3D option)** — a 4×4×4 Rubik's cube and a lava lamp read far better in 3D. Consider **[three.js](https://threejs.org/) via [@react-three/fiber](https://r3f.docs.pmnd.rs/) + [@react-three/drei](https://github.com/pmndrs/drei)** rendered as a **React overlay** for the corner-office scene (not inside Phaser). Keeps Phaser 2D for the office floor; R3F handles the tactile toys. Alternative: stay 2D with animated sprite sheets + shaders (lighter, less wow). See **Decisions §3**.
- **Fuzzy search (optional)** — [Fuse.js](https://www.fusejs.io/) (~5KB) for the bookshelf library search; a plain `includes()` filter is fine for mock data, so this is optional.
- **Modals** — reuse the existing per-feature modal components and especially [`project-modal.tsx`](../packages/web/components/project-modal.tsx); there is no shared modal primitive, so new modals (the library) follow the existing modal-component convention. No new modal library.

---

## Theme A — Multi-room layout & navigation

Today one room holds three zones ([`layout.ts`](../packages/web/lib/office/layout.ts)). Phase 9 grows it into **distinct rooms**, each with its own decor/style, connected by doorways.

### A1. Room model — **M** — ✅ DONE (2026-06-20, PR #19)
- [x] Replaced the single `LAYOUT` grid with a 34×22 **multi-room floor plan** ([`layout.ts`](../packages/web/lib/office/layout.ts)): **work** (hot desks), **lounge**, **board room**, **library** (bookshelves), **kitchen**, and a door to the **corner office** — six walled rooms in a 3×2 arrangement connected by 2-tile doorways (one connected walkable space; `layout.test.ts` proves no room is walled off). New `ROOMS` describes each room's interior rect + label.
- [x] Per-room **palette**: `ROOM_STYLES` in [`theme.ts`](../packages/web/lib/office/theme.ts) — a translucent floor accent over the theme-driven base (keeps the light/dark token mapping) + an accent-coloured label, so each room reads as a distinct space.
- [ ] ⏳ Drive rooms + fixtures from the Tiled object layer — still gated on Phase 8 A1 (external assets); this is the constant-driven version. Walls are theme-uniform for now (per-room wall tints a later refinement). See [done.md](done.md).
- [x] **Re-theme two rooms** (drives Theme G + the updated Theme E) — ✅ DONE (2026-06-20, PR #20): the **lounge** is now the **Agent pool** and the **kitchen** the **Communal area**. Renamed the `RoomId`s (lounge→pool, kitchen→communal), `ROOMS` labels (AGENT POOL / COMMUNAL), and `ROOM_STYLES` palettes (pool → tiled-aqua floor + cyan accent; communal → warm floor + orange accent); `layout.test.ts` still passes. **Seam only** — the pool basin/swims (G) and communal couches + super-sized TV/PlayStation (E) furnish the rooms in their own slices.

### A3. Room signage — **S** — ✅ DONE (2026-06-20, PR #22)
- [x] Each room gets a **clearly-visible name plate**: the label renders **on the room's top wall**, on its own **rounded sign board** (a `Phaser.Graphics` plate behind the text) rather than floating translucent over the floor — so every room is unmistakable at a glance. `buildLabels()` now draws a plate per room; the old alpha-0.7 floating accent label is gone.
- [x] Panel styling stays **theme-aware**: the plate **fill follows the theme** (`background`, redrawn on light/dark flip in `applyPalette`) while the **border + text** use the per-room accent. One sign per room (work · board · library · Agent pool · communal · corner office). The colour decision is a pure, tested `roomSignStyle` helper in [`theme.ts`](../packages/web/lib/office/theme.ts). See [done.md](done.md).

### A2. Navigation & camera — **M** — ✅ DONE (2026-06-24, PR #174)
- [x] Camera follows the player across the larger map at **1.5× zoom** (`ZOOM` constant; `cameras.main.startFollow` with 0.12 lerp; `setBounds` clamped to world edges) so the player navigates through the full 34×22 tile map; the camera scrolls smoothly. Vignette resized to viewport dimensions and pinned with `setScrollFactor(0)` so it tracks the camera. Corner-office auto-zoom-to-fill using `this.scale.width/worldW`. **Soft fade transitions**: 200ms black fade-out before scene switch (both enter and exit), fade-in on scene start.

---

## Theme B — Distinct characters, props & decor

### B1. Distinct agent characters — **M** — ◐ partial (2026-06-20, procedural)
- [x] Each agent gets a **visually distinct character** — a robot **variant registry** ([`textures.ts`](../packages/web/lib/office/textures.ts) `ROBOT_VARIANTS`/`robotVariant`): differing antenna shape, side fins, and eye/accent/visor colours, picked deterministically by agent id and combined with the existing per-agent chassis tint. This is the **seam an external pack swaps into** (one spec → one sheet, keys unchanged).
- [ ] **Upgrade to real art:** swap the procedural variants for **MetroCity** (CC0) and/or **pixel-agents'** 6 bundled characters, or LimeZu's character generator — at the same registry seam.
- [x] ✅ (2026-06-24, PR #171) **Provider-aware, not provider-locked** — where an agent's provider is known (anthropic / google / openai / openai-compatible — see `LlmProvider` and the providers feature), reflect it subtly (a per-provider accent colour or small badge on the character/nameplate) so a mixed pool reads at a glance. Unknown/local agents fall back to the id-based character. Requires surfacing a `provider` (and ideally model/CLI label) on the office agent — extend the `SessionSummary → OfficeAgent` mapping in [`agents.ts`](../packages/web/lib/office/agents.ts) (add a gateway field if it isn't already exposed). **Shipped:** `agentCli` added to `SessionSummary` (via `AgentsService.getAgentCli()`), propagated through `OfficeAgent`, rendered as a small colored dot badge (top-right of character sprite) in `office-scene.ts` — Anthropic orange / Google blue / OpenAI green / Aider purple / gray fallback.
- [ ] **Activity-driven poses** (typing / reading / waiting / celebrate) — adopt **pixel-agents'** activity→animation state-machine approach (finishes Phase 8 **C1**/**C2**); render **sub-agents as linked characters** near their parent (Phase 8 **C3**), again per pixel-agents.
- [x] ✅ (2026-06-24, PR #183) The **player** gets a customisable character (ties into Theme F corner-office customisation; persist the choice — see F4). **Shipped:** `CharacterPicker` modal in the corner office (7 options: human + 6 robot variants Alpha–Zeta, each shown with its accent colour); choice persists to `midnite.office.player-variant` in localStorage and applies immediately to both Phaser scenes via Zustand store subscription.

### B2. Props, plants & decor — **S–M** — ✅ DONE (2026-06-20, PR #24)
- [x] Richer prop set across rooms: **plants** (varied), **rugs** (work / library nook / communal lounge), and **framed wall art** on the top walls. `PLANTS` gained a `variant`; new `WALL_ART` + `RUGS` placements in [`layout.ts`](../packages/web/lib/office/layout.ts). (Bookshelves already shipped in A1; the board-room "big screen" + pool/communal props remain to Themes D/E/G.)
- [x] **More greenery everywhere** — `PLANTS` expanded to **~3–4 per room** across all six rooms (corners, beside doorways, flanking the signage), in **three species/sizes** — `leafy` shrub, tall `palm`, small `succulent` (new procedural textures + a pure `plantTexture` map). Poolside palms framing the deck kept.
- [x] Decor varies **per room** so each reads as a different space. Covered by `layout.test.ts` (every plant/rug on a room floor, ≥2 plants/room, all three species, wall art on the top wall) + `textures.test.ts` (`plantTexture`). See [done.md](done.md).

---

## Theme C — Bookshelf → searchable library modal

A bookshelf prop the player walks up to (an interactable, same pattern as the board) opens a **real React modal** of "books".

### C1. Library interactable + modal — **M** — ✅ DONE (2026-06-20, PR #29)
- [x] Added the `bookshelf` interactable: `nearLibrary` + `openLibrary()`/`closeLibrary()` on [`office-store.ts`](../packages/web/lib/office-store.ts) (mirrors `nearBoard`/`boardOpen`/`openBoard`; opening any one panel closes the others; `reset()` clears them). The scene sets proximity from `BOOKSHELF_POS`; pressing **E** opens the modal; the keyboard-freeze condition now includes `libraryOpen`.
- [x] New `LibraryModal` component (follows the `boardroom-panel` modal convention — backdrop, own-Escape, header) rendered from the HUD ([`office-hud.tsx`](../packages/web/components/office/office-hud.tsx)), with a proximity prompt.

### C2. Books data, search & filter — **S** — ✅ DONE (2026-06-20, PR #29)
- [x] **Mock** book data in [`lib/office/books.ts`](../packages/web/lib/office/books.ts): `{ id, title, author, category, blurb }[]` across five categories, + pure helpers (`bookCategories`, `filterBooks`, `bookSearchUrl`) tested in `books.test.ts`.
- [x] In the modal: a **search box** (title/author substring) + **category filter chips**. Reuses `ui/Input` + a `cn`-styled chip (Fuse.js not needed for mock data).
- [x] Clicking a book opens a **Google search in a new tab** (`bookSearchUrl` + `<a target="_blank" rel="noopener noreferrer">`). Real reader is a later upgrade. See [done.md](done.md).

---

## Theme D — Board room → project management

Repurpose the board room (today a static "documents whiteboard") into the **projects** hub.

### D1. Projects in the board room — **M** — ✅ DONE (2026-06-20, PR #17)
- [x] The board panel lists active projects (`getProjects`) as rows (tag · name · task count); reuses the existing `nearBoard`/`openBoard` flow. Pure shaping in [`lib/office/projects.ts`](../packages/web/lib/office/projects.ts) (`boardroomProjects` → active + alphabetised, tested). (Conference-table "stations" left as a future flourish.)
- [x] Clicking a project opens the existing [`project-modal.tsx`](../packages/web/components/project-modal.tsx) **as-is**, portalled over the office — the URL stays `/office`, no navigation.
- [x] The modal's own actions work; Escape from a project returns to the list, Escape from the list returns to the room. The old documents whiteboard (`documents.ts` / `document-modal.tsx`) was removed — the project modal's Plan tab + memory link subsume it. See [done.md](done.md).

---

## Theme E — Communal area (was kitchen) → coffee break + gaming corner

> The **kitchen** room is re-themed into a **Communal area** (rename in A1): a relaxed living space rather than a galley. It keeps the coffee-break interaction (E1) and gains real lounge furniture and the relocated, super-sized gaming setup.

### E1. Coffee break — **S** — ✅ DONE (2026-06-20, PR #18)
- [x] A **kitchenette** nook (counter + stool + coffee machine) in the lounge's bottom-left corner — interactable. (A full walled kitchen *room* awaits the multi-room layout, A1; this is the corner-nook version that ships independently.)
- [x] Pressing **E** toggles an **"on a break"** state: `onBreak` + `toggleBreak()` (and `nearKitchen`/`setNearKitchen`) on [`office-store.ts`](../packages/web/lib/office-store.ts); a `☕ On a break` badge + proximity prompt in the HUD, and a `☕` floats over the player sprite.
- [x] **Mock/local** for now (Decisions §5) — `reset()` preserves `onBreak` as a personal presence flag. See [done.md](done.md).

### E2. Communal furnishings — **M** — ✅ DONE (2026-06-20, PR #26)
- [x] Furnished the Communal area as a genuine lounge: **a couch + armchair seating arrangement** (`COUCHES`/`ARMCHAIRS`, collidable decor) grouped into a **chill corner** around the rug with the main sofa facing the gaming TV, a **patch of astro turf** in a corner (`ASTRO_TURF` — a new bright-green tiled surface, rendered like the pool water), and a **carpet** marking the **gaming area** in front of the TV (added to `RUGS`). Zoned so the room reads as coffee corner (existing) + chill corner + gaming corner. New `astroTurf` texture; `buildKitchen` renders them.
- [x] Plenty of **plants** already soften the space (B2). Covered by `layout.test.ts` (seats on communal floor; turf entirely on communal floor + inside the interior). See [done.md](done.md).

### E3. Relocated, super-sized TV + PlayStation — **M** — ✅ DONE (2026-06-23, PR #143)
- [x] TV + PS5 console already placed in the top-right gaming corner of the Communal area with super-sized textures (64×44 TV, white PS5 fins + blue light strip) — E3 layout work was complete from the E2 PR. This item wires the **PlayStation interactable**: `nearPlaystation`/`setNearPlaystation` + `playstationOpen`/`openPlaystation`/`closePlaystation` on [`office-store.ts`](../packages/web/lib/office-store.ts); `playstationCenter` anchor set in `buildKitchen()`; per-frame proximity check in `update()`; E-key handler in `tryInteract()`; `playstationOpen` added to the keyboard-frozen guard.

### E4. Retro-games menu (placeholder) — **S** — ✅ DONE (2026-06-23, PR #143)
- [x] [`RetroGamesMenu`](../packages/web/components/office/retro-games-menu.tsx) modal opened from the HUD when `playstationOpen`. Lists 8 retro titles (PAC-MAN → STREET FIGHTER II); selecting a game shows "coming soon". Own Escape handler (first press de-selects, second closes). Seam is `onGameSelect(id)` — wire actual gameplay in a later phase. 4 new tests in `lib/office-store.test.ts` cover all new state transitions.

---

## Theme F — Corner office → your customisable desk (separate scene)

A doorway leads to a **corner office** that swaps to a **completely separate scene** (Phaser `scene.start`, or a dedicated R3F view per **Decisions §3**) — your private space.

### F1. Scene switch — **M** — ✅ DONE (2026-06-23, PR #146)
- [x] `CornerOfficeScene` (14×10 tiles) registered alongside `OfficeScene` in `createOfficeGame`; E-key at `DOOR_POS` starts `'corner-office'`; E-key at the exit door / HUD "Back to Office" button starts `'office'`. `currentScene: 'office' | 'corner'` in the store drives the HUD (back button vs. normal chrome). `nearDoor` proximity flag added to `OfficeScene` + prompt wired.

### F2. Desk customisation — **M** — ✅ DONE (2026-06-23, PR #146)
- [x] `DeskItemPicker` modal (6 items: lava lamp, fidget spinner, Rubik's cube, photo frame, succulent, mug; up to 3 selected). Procedural animated sprites rendered on `ITEM_SLOTS` via `renderDeskItems()`; lava lamp bobs, fidget spinner rotates, Rubik's cube drawn as a 3×3 colour grid. Store re-renders on `deskItems` change.

### F3. Laptop with a blinking cursor — **S** — ✅ DONE (2026-06-23, PR #146)
- [x] A laptop sprite (scaled monitor) sits left of the desk; `buildLaptopCursor()` adds a green `▋` text that tweens `alpha → 0` (yoyo, repeat -1, Stepped ease) for a clean terminal blink. Non-interactive; `onLaptopInteract` seam left open.

### F4. Persistence — **S** — ✅ DONE (2026-06-23, PR #146)
- [x] `setDeskItems()` in the store writes to `window.localStorage` (`midnite.office.customisation`); `loadDeskItems()` reads + validates on store init via `parseDeskItems()` (unknown ids dropped, falls back to defaults). Character-choice persistence deferred to when B1 real-art lands (no picker yet).

---

## Theme G — Agent pool (was lounge) → swimming pool ✅ DONE (2026-06-20, PR #21)

> The **lounge** is re-themed into the **"Agent pool"** (rename in A1) — a poolside leisure space. It's décor + ambient animation (no new modal); the playful payoff is agents lounging and occasionally taking a dip.

### G1. Pool & poolside — **M** — ✅ DONE
- [x] A tiled pool basin (`POOL` rect in [`layout.ts`](../packages/web/lib/office/layout.ts)) with a coping edge + **sun loungers** along the deck (`LOUNGE_SEATS` are now the loungers). The basin is **non-walkable** — added to `blockedGrid()` (walking agents route around it) + a static body so the player collides; swimmers tween through it. New `water`/`lounger` textures.
- [x] Poolside **palms** framing the deck (added to `PLANTS`).

### G2. Animated water — **S–M** — ✅ DONE
- [x] The water `TileSprite` gently scrolls each frame (`update()`), a subtle ambient shimmer.

### G3. Lounging & occasional swims — **M** — ✅ DONE
- [x] Idle agents lie on the loungers (animated `zzz`; the old lounge sleep/**game** split was dropped — gaming moves to the communal area, Theme E).
- [x] A periodic timer occasionally sends **one** lounger swimming a couple of lanes through the basin — trailing a wake ripple — then climbing back out (interrupted cleanly if it starts working). Not every agent, not constantly. See [done.md](done.md).

## Files this phase touches (map)

- **Layout/rooms:** [`lib/office/layout.ts`](../packages/web/lib/office/layout.ts), [`lib/office/dimensions.ts`](../packages/web/lib/office/dimensions.ts), [`lib/office/theme.ts`](../packages/web/lib/office/theme.ts)
- **Art/characters/props:** [`lib/office/textures.ts`](../packages/web/lib/office/textures.ts) (or Tiled assets under `packages/web/public/office/` per Phase 8 A1), [`lib/office/agents.ts`](../packages/web/lib/office/agents.ts)
- **Scene(s):** [`components/office/scenes/office-scene.ts`](../packages/web/components/office/scenes/office-scene.ts) + new `scenes/corner-office-scene.ts`; mount in [`office-game.tsx`](../packages/web/components/office/office-game.tsx)
- **State bridge:** [`lib/office-store.ts`](../packages/web/lib/office-store.ts) (add `library`, `kitchen`/`onBreak`, `playstation`/retro-games, `room`/scene, project-board state)
- **HUD + modals:** [`components/office/office-hud.tsx`](../packages/web/components/office/office-hud.tsx) + new `LibraryModal` + a retro-games-menu modal; reuse [`project-modal.tsx`](../packages/web/components/project-modal.tsx)
- **Mock data:** new `lib/office/books.ts`; a retro-games list (placeholder)
- **Room signage:** wall-mounted name plates drawn in the scene / [`theme.ts`](../packages/web/lib/office/theme.ts) `ROOM_STYLES`
- **Docs:** update [`components/office/README.md`](../packages/web/components/office/README.md) and append to [`done.md`](done.md) as items land.

## Verification

- `moon run gateway:dev` + `moon run web:dev`, open `/office`:
  - [x] Walk between rooms; each room reads as a distinct style; **every room has a wall-mounted name plate on a background panel** above it; most rooms are dotted with plants; agents appear as distinct characters. *(Playwright 2026-06-26: HOT DESKS / BOARD ROOM / AGENT POOL / COMMUNAL / LIBRARY / CORNER OFFICE plates all rendered; distinct floor styles; plants throughout)*
  - [x] Bookshelf → **E** opens the library modal; search + category filter narrow the list; clicking a book opens a Google search in a **new tab**. *(library-modal.tsx: `filterBooks`, `CategoryChip`, `href={bookSearchUrl(book)} target="_blank"`)*
  - [x] Board room → projects listed; clicking one opens the **project modal over the office** (URL stays `/office`); close returns to the room. *(office-scene.ts nearBoardFlag → setNearBoard; PR #17)*
  - [x] **Agent pool** → the pool water animates (wave lane markers); agents sit on the sun benches; swim animation loops. *(Playwright: pool water with wave tiles + sun loungers confirmed visible)*
  - [x] **Communal area** → couches, astro-turf gaming corner, oversized TV + PlayStation; E at kitchenette toggles `☕ On a break`; E at PlayStation opens retro-games menu (placeholder). *(Playwright: green astro turf, TV, PS5, ping-pong + billiards tables confirmed; PRs #E1–E4)*
  - [x] Corner-office doorway swaps to the second scene; desk items can be chosen and animate; laptop shows a blinking cursor; choices persist across reload. *(PR #146: CornerOfficeScene, DeskItemPicker, blinking cursor tween, localStorage persist)*
- [x] `moon run :typecheck`, `moon run :lint`, `moon run :test` green. (Confirmed 2026-06-25: 1050 gateway + 510 web tests pass.)

## Decisions / open questions

1. **Library list** — the request mentioned libraries but none were attached. Proposed set is in **Libraries & assets** above (Phaser + LimeZu/Kenney + Tiled + optional R3F/Fuse.js). Confirm before building.
2. **Asset pack** — inherits Phase 8 §1 (LimeZu vs Kenney). Phase 9 needs the pack's **characters + library/kitchen interiors**, which strengthens the LimeZu case.
3. **Corner-office toys: 3D vs 2D** — R3F/three.js React overlay (tactile 4×4×4 cube + lava lamp, more wow, +deps/bundle) **vs** all-2D Phaser sprites/shaders (lighter, consistent with the rest). _Recommend R3F for just the corner-office toys, Phaser everywhere else._
4. **Scope split** — Phase 9 is large; suggested shipping order: A (rooms) → B (characters/props) → D (board-room projects, highest utility) → C (library) → E (kitchen) → F (corner office). Each theme is independently shippable.
5. **Break state reach** — keep `onBreak` local for now, or surface it to the gateway/teammates later (ties to Phase 8 Theme E multiplayer)? _Local for Phase 9._
6. **Tile size** — current grid is **32px**; LimeZu is **16×16**, MetroCity/pixel-agents vary. Either standardise on a pack's native size and rescale the grid, or scale sprites to 32px on import. _Recommend: pick the pack first (§2), then match the grid to it (16×16 rendered at 2× is crisp and is what most office packs assume)._ Reconcile with Phase 8 §3 (which assumed 32px).
7. **Reuse vs. reference** — **pixel-agents** assets are MIT and bundled, so they can be **reused directly** (fastest path to "agents as characters"); **SkyOffice** is a code/architecture reference (Phaser+Colyseus). Decide how much of pixel-agents' art we adopt vs. a LimeZu/MetroCity look.
