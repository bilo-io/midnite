# Phase 9 — Office visual overhaul

> Phase 8 ([phase-8-office-fidelity.md](phase-8-office-fidelity.md)) turned the [`/office`](../packages/web/components/office/README.md) prototype into a higher-fidelity single room — real sprites, theme-aware colours, status presence. **Phase 9 makes it a place.** Multiple themed **rooms**, **distinct characters** per agent, richer **props/decor** (plants, bookshelves, a kitchen), and four genuinely interactive fixtures: a **bookshelf** that opens a searchable library modal, a **board room** for managing projects, a **kitchen** for a coffee break, and a **corner office** — a separate scene where you customise your own desk (fidget toys, a 4×4×4 Rubik's cube, a lava lamp, and a laptop with a blinking cursor).

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

### A1. Room model — **M**
- [ ] Replace the single `LAYOUT` grid with a **multi-room floor plan**: open-plan **work area** (hot desks), **lounge**, **board room**, **library** (bookshelves), **kitchen**, and a doorway to the **corner office** (own scene, Theme F). Each room is a walled region with its own doorway; reuse the existing partition/doorway approach in [`layout.ts`](../packages/web/lib/office/layout.ts).
- [ ] Per-room **decor/style**: distinct floor tile + wall + accent palette per room (warm kitchen, bookish library, sleek board room). Extend [`theme.ts`](../packages/web/lib/office/theme.ts) `buildOfficePalette()` to carry a per-room palette, keeping the light/dark token mapping.
- [ ] Drive rooms + fixtures from the Tiled object layer (Phase 8 A1) rather than more hardcoded constant arrays where practical.

### A2. Navigation & camera — **M**
- [ ] Camera follows the player across the larger map (Phase 8 **B2** — finish it here); soft room-to-room transitions. Optional minimap (Phase 8 D2).

---

## Theme B — Distinct characters, props & decor

### B1. Distinct agent characters — **M**
- [ ] Each agent gets a **visually distinct character** (different sprite, not just a tint) — deterministic by agent id so a given agent always looks the same. Source sprites from **MetroCity** (CC0) and/or **pixel-agents'** 6 bundled characters, or LimeZu's character generator; extend [`textures.ts`](../packages/web/lib/office/textures.ts)/[`agents.ts`](../packages/web/lib/office/agents.ts). Keeps the status bubble + seated logic from Phase 8.
- [ ] **Provider-aware, not provider-locked** — where an agent's provider is known (anthropic / google / openai / openai-compatible — see `LlmProvider` and the providers feature), reflect it subtly (a per-provider accent colour or small badge on the character/nameplate) so a mixed pool reads at a glance. Unknown/local agents fall back to the id-based character. Requires surfacing a `provider` (and ideally model/CLI label) on the office agent — extend the `SessionSummary → OfficeAgent` mapping in [`agents.ts`](../packages/web/lib/office/agents.ts) (add a gateway field if it isn't already exposed).
- [ ] **Activity-driven poses** (typing / reading / waiting / celebrate) — adopt **pixel-agents'** activity→animation state-machine approach (finishes Phase 8 **C1**/**C2**); render **sub-agents as linked characters** near their parent (Phase 8 **C3**), again per pixel-agents.
- [ ] The **player** gets a customisable character (ties into Theme F corner-office customisation; persist the choice — see F4).

### B2. Props, plants & decor — **S–M**
- [ ] Richer prop set across rooms: **plants** (varied), **bookshelves** (library), rugs, wall art, coffee machine + counters (kitchen), a big screen (board room). Builds on Phase 8 **A3** and the current `PLANTS`/`RUGS`/`COUCHES` in [`layout.ts`](../packages/web/lib/office/layout.ts).
- [ ] Decor varies **per room style** (A1) so each room reads as a different space at a glance.

---

## Theme C — Bookshelf → searchable library modal

A bookshelf prop the player walks up to (an interactable, same pattern as the board) opens a **real React modal** of "books".

### C1. Library interactable + modal — **M**
- [ ] Add a `bookshelf` interactable: proximity flag + `openLibrary()`/`closeLibrary()` on [`office-store.ts`](../packages/web/lib/office-store.ts) (mirror `nearBoard`/`boardOpen`/`openBoard`). The scene sets proximity; pressing **E** opens the modal; Phaser keyboard disabled while open (as the panel already does).
- [ ] New `LibraryModal` component (follow the existing modal-component convention, e.g. [`memory-modal.tsx`](../packages/web/components/memory-modal.tsx)) rendered from the HUD ([`office-hud.tsx`](../packages/web/components/office/office-hud.tsx)).

### C2. Books data, search & filter — **S**
- [ ] **Mock** book data in `lib/office/books.ts`: `{ id, title, author, category, blurb }[]` spanning a few categories.
- [ ] In the modal: a **search box** (title/author substring; Fuse.js optional) + **category filter** (chips/select). Reuse `ui/` `Input`/`Select`/`StyledSelect`.
- [ ] Clicking a book opens a **Google search in a new tab**: `window.open('https://www.google.com/search?q=' + encodeURIComponent(`${title} ${author}`), '_blank', 'noopener')`. (Real fetch/reader is a later upgrade.)

---

## Theme D — Board room → project management

Repurpose the board room (today a static "documents whiteboard") into the **projects** hub.

### D1. Projects in the board room — **M**
- [ ] On entering/opening the board (extend the existing `nearBoard`/`openBoard` flow), show the live **project list** (`getProjects()` from [`lib/api.ts`](../packages/web/lib/api.ts), same hook style as `use-office-agents`). Render projects as either rows in the board panel or as clickable stations around the conference table (`TABLE_*` in [`layout.ts`](../packages/web/lib/office/layout.ts)).
- [ ] Clicking a project opens the existing [`project-modal.tsx`](../packages/web/components/project-modal.tsx) **as a React modal overlaid on the office — stays on `/office`**, no navigation. Reuse it as-is; just mount it from the office HUD with the selected `projectId`.
- [ ] Keep the modal's own actions working (it already handles project view/edit); Escape/close returns to the room.

---

## Theme E — Kitchen → coffee break

### E1. Coffee break — **S**
- [ ] A small **kitchen** room (counter + coffee machine + a stool or two). Walking up to the coffee machine is an interactable.
- [ ] Pressing **E** there toggles an **"on a break"** state: add `onBreak: boolean` + `toggleBreak()` to [`office-store.ts`](../packages/web/lib/office-store.ts); show a `☕ On a break` badge in the HUD and (optional) a coffee-cup over the player sprite / a sip animation.
- [ ] **Mock only** for now — it's a personal presence indicator; later it can surface to teammates (Phase 8 Theme E multiplayer) or pause idle nudges.

---

## Theme F — Corner office → your customisable desk (separate scene)

A doorway leads to a **corner office** that swaps to a **completely separate scene** (Phaser `scene.start`, or a dedicated R3F view per **Decisions §3**) — your private space.

### F1. Scene switch — **M**
- [ ] Register a second scene `corner-office` and transition in/out via a doorway interactable; the HUD reflects which scene is active (back-to-office control). Reuse the mount/destroy + store-reset discipline in [`office-game.tsx`](../packages/web/components/office/office-game.tsx).

### F2. Desk customisation — **M**
- [ ] A desk you can decorate from a small **palette of items**: fidget spinner, **4×4×4 Rubik's cube**, **lava lamp**, plant, mug, etc. Clicking the desk (or an "edit" affordance) opens a picker; chosen items render on the desk.
- [ ] Items are **animated/idle-alive**: fidget spinner spins, lava lamp blobs drift, cube gently rotates (3D if R3F per §3; else looping sprite/shader).

### F3. Laptop with a blinking cursor — **S**
- [ ] A **laptop** on the desk whose screen shows a **flashing cursor** (Phaser tween blink, or a CSS caret on an overlay). **Non-interactive placeholder** now — leave a clear seam (`onLaptopInteract` no-op / "coming soon") to wire later (e.g. open a terminal/notes).

### F4. Persistence — **S**
- [ ] Persist the player's character choice (B1) + desk layout to `localStorage` via the existing `useLocalStorage` hook (key e.g. `midnite.office.customisation`). No gateway/DB work in Phase 9.

---

## Files this phase touches (map)

- **Layout/rooms:** [`lib/office/layout.ts`](../packages/web/lib/office/layout.ts), [`lib/office/dimensions.ts`](../packages/web/lib/office/dimensions.ts), [`lib/office/theme.ts`](../packages/web/lib/office/theme.ts)
- **Art/characters/props:** [`lib/office/textures.ts`](../packages/web/lib/office/textures.ts) (or Tiled assets under `packages/web/public/office/` per Phase 8 A1), [`lib/office/agents.ts`](../packages/web/lib/office/agents.ts)
- **Scene(s):** [`components/office/scenes/office-scene.ts`](../packages/web/components/office/scenes/office-scene.ts) + new `scenes/corner-office-scene.ts`; mount in [`office-game.tsx`](../packages/web/components/office/office-game.tsx)
- **State bridge:** [`lib/office-store.ts`](../packages/web/lib/office-store.ts) (add `library`, `kitchen`/`onBreak`, `room`/scene, project-board state)
- **HUD + modals:** [`components/office/office-hud.tsx`](../packages/web/components/office/office-hud.tsx) + new `LibraryModal`; reuse [`project-modal.tsx`](../packages/web/components/project-modal.tsx)
- **Mock data:** new `lib/office/books.ts`
- **Docs:** update [`components/office/README.md`](../packages/web/components/office/README.md) and append to [`done.md`](done.md) as items land.

## Verification

- `moon run gateway:dev` + `moon run web:dev`, open `/office`:
  - [ ] Walk between rooms; each room reads as a distinct style; agents appear as distinct characters.
  - [ ] Bookshelf → **E** opens the library modal; search + category filter narrow the list; clicking a book opens a Google search in a **new tab**.
  - [ ] Board room → projects listed; clicking one opens the **project modal over the office** (URL stays `/office`); close returns to the room.
  - [ ] Kitchen → **E** toggles the `☕ On a break` badge.
  - [ ] Corner-office doorway swaps to the second scene; desk items can be chosen and animate; the laptop shows a blinking cursor; choices persist across reload.
- `moon run :typecheck`, `moon run :lint`, `moon run :test` green. (Run web tests from the **primary checkout**, not a `.git` worktree — vite can't collect inside `.git/**`.)

## Decisions / open questions

1. **Library list** — the request mentioned libraries but none were attached. Proposed set is in **Libraries & assets** above (Phaser + LimeZu/Kenney + Tiled + optional R3F/Fuse.js). Confirm before building.
2. **Asset pack** — inherits Phase 8 §1 (LimeZu vs Kenney). Phase 9 needs the pack's **characters + library/kitchen interiors**, which strengthens the LimeZu case.
3. **Corner-office toys: 3D vs 2D** — R3F/three.js React overlay (tactile 4×4×4 cube + lava lamp, more wow, +deps/bundle) **vs** all-2D Phaser sprites/shaders (lighter, consistent with the rest). _Recommend R3F for just the corner-office toys, Phaser everywhere else._
4. **Scope split** — Phase 9 is large; suggested shipping order: A (rooms) → B (characters/props) → D (board-room projects, highest utility) → C (library) → E (kitchen) → F (corner office). Each theme is independently shippable.
5. **Break state reach** — keep `onBreak` local for now, or surface it to the gateway/teammates later (ties to Phase 8 Theme E multiplayer)? _Local for Phase 9._
6. **Tile size** — current grid is **32px**; LimeZu is **16×16**, MetroCity/pixel-agents vary. Either standardise on a pack's native size and rescale the grid, or scale sprites to 32px on import. _Recommend: pick the pack first (§2), then match the grid to it (16×16 rendered at 2× is crisp and is what most office packs assume)._ Reconcile with Phase 8 §3 (which assumed 32px).
7. **Reuse vs. reference** — **pixel-agents** assets are MIT and bundled, so they can be **reused directly** (fastest path to "agents as characters"); **SkyOffice** is a code/architecture reference (Phaser+Colyseus). Decide how much of pixel-agents' art we adopt vs. a LimeZu/MetroCity look.
