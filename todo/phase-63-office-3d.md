# Phase 63 — Office 3D (three.js first-person office)

> The office (Phases 8/9/31/39) is midnite's signature surface — a living pixel-art floor where
> agents visibly work — but it's a top-down 2D world. Phase 63 builds the **same office in
> first-person 3D**: walk the six rooms at eye level with pointer-lock + WASD, a subtle
> footstep-cadenced camera bob, and interact with the things you already can — desk agents,
> the boardroom whiteboard, the library shelf, the coffee machine, the gaming console — to open
> the **exact same React panels** the 2D office uses. The grounding makes this cheap in the right
> way: the office geometry is already Phaser-free pure data
> ([`lib/office/layout.ts`](../packages/web/lib/office/layout.ts) — 34×22 grid, 6 rooms, desks,
> zones) and the Phaser↔React bridge is a single vanilla Zustand store
> ([`lib/office-store.ts`](../packages/web/lib/office-store.ts)) with proximity flags + mutually
> exclusive panel flags. A 3D scene that reads the same layout and writes the same store fields
> gets the whole modal layer — `InteractionPanel`, `BoardroomPanel`, `LibraryModal`,
> `RetroGamesMenu`, the terminal/transcript modals — **for free, untouched**. Simple tabs on
> `/office` toggle 2D ↔ 3D; the arcade console opens a separate arcade scene where one cabinet
> runs an actually playable Breakout.

> **Scope guardrails (CLAUDE.md).** This is a **pure `packages/web` phase** — zero gateway work,
> zero new `shared` contracts (the only wire shape is one new key in the existing Phase-43
> UserPreferences bag). The 3D scene must be a **client of the existing store contract**, not a
> fork of it: proximity/panel state flows through [`office-store.ts`](../packages/web/lib/office-store.ts)
> exactly as [`office-scene.ts`](../packages/web/components/office/scenes/office-scene.ts) does
> today, and live agent data keeps arriving via
> [`use-office-agents.ts`](../packages/web/components/office/use-office-agents.ts) — the 3D view
> **never** fetches on its own. The 2D office is **behavior-preserving**: its scenes, store fields,
> and specs run unedited; 3D-only state gets new store fields, never repurposed ones. three.js is
> client-only (`dynamic(ssr:false)`, the Phaser pattern) and **lazy** — the 2D tab must not pay for
> the 3D bundle or vice-versa (Phase 34 discipline). Art stays **procedural** (no binary assets in
> the repo); all Phaser-free 3D helpers live in `lib/office3d/` with unit tests beside them.

> Effort tags: **S** small · **M** medium · **L** large. A→B→C is the spine; D/E build on C;
> F can land early (tabs with a placeholder 3D pane) to de-risk integration; G runs throughout.

---

## Current state (what exists to build on)

- ✅ **Geometry is engine-agnostic** — [`lib/office/layout.ts`](../packages/web/lib/office/layout.ts)
  (grid, rooms, walls), [`desks.ts`](../packages/web/lib/office/desks.ts),
  [`minimap.ts`](../packages/web/lib/office/minimap.ts), [`daynight.ts`](../packages/web/lib/office/daynight.ts),
  [`theme.ts`](../packages/web/lib/office/theme.ts), [`textures.ts`](../packages/web/lib/office/textures.ts)
  (canvas-generated art) are all Phaser-free with test siblings — direct inputs to a 3D world builder.
- ✅ **The bridge contract** — [`office-store.ts`](../packages/web/lib/office-store.ts): proximity
  flags (`nearbyId`, `nearBoard`, `nearKitchen`, `nearLibrary`, `nearPlaystation`, `nearDoor`),
  mutually-exclusive panel flags (`active`, `boardOpen`, `libraryOpen`, `playstationOpen`,
  `deskPickerOpen`, `characterPickerOpen`), persistence (`playerVariant`, `playerTint`, `onBreak`,
  `currentScene`, `deskItems`). Opening a panel disables game keyboard input; `reset()` on teardown.
- ✅ **Live data** — [`use-office-agents.ts`](../packages/web/components/office/use-office-agents.ts)
  pushes sessions+tasks into the store (`setAgents` / Phase-31 `patchAgent` live-activity deltas).
- ✅ **The React panel layer** — [`office-hud.tsx`](../packages/web/components/office/office-hud.tsx),
  [`boardroom-panel.tsx`](../packages/web/components/office/boardroom-panel.tsx),
  [`library-modal.tsx`](../packages/web/components/office/library-modal.tsx),
  [`retro-games-menu.tsx`](../packages/web/components/office/retro-games-menu.tsx),
  desk/character pickers — all store-driven, all portalled, all engine-agnostic already.
- ✅ **Preference sync** (Phase 43) for the tab choice; **`?tab=` deep-link precedent** (Phase 52).
- ❌ **No three.js anywhere** — no `three`, `@react-three/*` in any `package.json`; greenfield.
- ❌ **No playable arcade game** — [`retro-games-menu.tsx`](../packages/web/components/office/retro-games-menu.tsx)
  is 8 × "coming soon"; the wiring seam is `onGameSelect(id)`.

---

## Theme A — World foundation (r3f stage + procedural low-poly office) — **L**

The 3D stage and the six-room world, generated from the same data the 2D office reads.

- [x] **Deps + stage:** `three` + `@react-three/fiber` (v9) + `@react-three/drei` (v10) added to
      `packages/web`; `Office3DView` mounted via `dynamic(ssr:false)` (the
      [`office-view.tsx`](../packages/web/components/office/office-view.tsx) pattern) wrapping an
      r3f `<Canvas>`. r3f auto-disposes geometries/materials/textures on unmount, so tab-switching
      tears the engine down cleanly. (PR #337)
- [x] **World builder:** pure `lib/office3d/world.ts` maps
      [`layout.ts`](../packages/web/lib/office/layout.ts) grid/rooms/walls + furniture constants into
      3D placements (floors, merged wall runs, desks, boardroom table + whiteboard, library shelves,
      coffee machine + counter, lounge couches + console + TV, pool + turf, plants, door) — a
      three-free data→transform with unit tests asserting exact counts + full wall coverage. (PR #337)
- [x] **Procedural low-poly art:** flat-shaded box/cone/cylinder primitives; `lib/office3d/materials.ts`
      resolves theme-aware colours from the SAME [`theme.ts`](../packages/web/lib/office/theme.ts)
      palette + room accents as the 2D office (flip with light/dark). *Per the Theme-A design call,
      flat palette colours ship now; canvas-texture surfaces are a deferred polish pass.* (PR #337)
- [x] **Room chunking + frustum-culled loading:** static geometry with three's per-object
      `frustumCulled` (build-all rooms at mount). *Per the Theme-A design call, the full per-room
      lazy-build + adjacency chunk-gating is deferred to Theme G (perf budget) — noted here as
      outstanding.* (PR #337)
- [x] **Lighting + day/night:** ambient + directional keyed off
      [`daynight.ts`](../packages/web/lib/office/daynight.ts) phase buckets (sun angle/colour, warm
      dawn/dusk, cool night). *Static snapshot at mount — no per-frame cost, reduced-motion-safe by
      construction (an animated cycle is a later theme).* (PR #337)

## Theme B — First-person rig (pointer-lock, movement, head-bob) — **M**

- [x] **Controller:** pointer-lock mouse-look (drei `PointerLockControls`) + WASD/arrows movement
      (landed in Theme A) with a click-to-lock overlay + ESC hint; movement only runs while locked.
      *(Store keyboard-disable on open panels arrives with Theme C's interactions — no 3D panels
      set those flags yet.)* (PR #342)
- [x] **Collision:** grid-AABB collision from the 2D office's `blockedGrid()` (walls + furniture +
      pool) — pure `lib/office3d/collision.ts`, no physics lib; circle-vs-tile per-axis wall-slide,
      2-tile door-gap passage; unit-tested (slide, no-clip, doorway). (PR #342)
- [x] **Head-bob:** footstep-cadenced vertical bob + subtle roll (half frequency) while moving,
      amplitude scaled by actual walk speed + eased in/out — pure `lib/office3d/headbob.ts` (phase
      advances by walked distance). **Disabled under reduced motion** via `useAnimationPrefs`
      (OS `prefers-reduced-motion` + the Phase-39 motion setting). Unit-tested (zero at rest/reduced,
      bounded, half-frequency roll). (PR #342)
- [x] **Spawn + orientation:** spawn at the 2D player's entry tile at eye height (Theme A); camera
      height/FOV/speed constants live in `lib/office3d/constants.ts`. *(`R`-reset optional — not
      included.)* (PR #342)

## Theme C — Agents, interactions & the store bridge — **M-L** — ✅ DONE (PR #347, 2026-07-07)

The heart of the phase: the 3D scene becomes a second client of the existing store contract.

- [x] **Proximity → store:** per-frame (dedup'd, the 2D pattern) proximity checks against desks/
      board/library/kitchen/console write the **same** store fields (`nearbyId`, `nearBoard`,
      `nearLibrary`, `nearKitchen`, `nearPlaystation`); `E`/Enter (proximity priority) **and** a
      crosshair click-raycast dispatch the same panel-open transitions `tryInteract` does in
      [`office-scene.ts`](../packages/web/components/office/scenes/office-scene.ts), via a pure
      `applyInteraction` over the store contract — so
      [`office-hud.tsx`](../packages/web/components/office/office-hud.tsx) prompts and **every
      existing modal work unmodified** (opening a panel releases pointer-lock, freezing movement).
      *`nearDoor`/the corner-office transition is deferred to Theme E (its 3D corner scene) so the
      prompt isn't a dead affordance.* (PR #347)
- [x] **Agent avatars:** low-poly procedural figures (tinted per the same stable identity colour as
      2D) seated at the **same status-routed seats** the 2D office uses (`statusToRoom` +
      `assignStableSeats`: wip→desks, waiting→boardroom, done/idle→lounge), driven by the store's
      agents (from [`use-office-agents.ts`](../packages/web/components/office/use-office-agents.ts),
      now wired into the 3D view); subtle idle bob for running avatars, disabled under reduced
      motion via `useAnimationPrefs`. *Placement math lives in the three-free, unit-tested
      `lib/office3d/agents-3d.ts`; tint/variant re-derived there to keep Phaser's `textures.ts` out
      of the 3D bundle.* (PR #347)
- [x] **Billboards:** name + status plates above avatars (drei `<Html>` DOM, per the design call),
      plus the Phase-31 **live-activity tool label** — distance-faded (opacity ramps to 0 past
      range) so far rooms don't clutter. (PR #347)
- [x] **Coffee + break:** the kitchen coffee machine toggles `onBreak` with the ☕ indicator —
      comes free from the reused `OfficeHud`, matching 2D. (PR #347)
- [x] **Minimap overlay:** an in-canvas r3f `<Hud>` overlay (per the design call) reusing
      [`minimap.ts`](../packages/web/lib/office/minimap.ts) room/dot geometry with the player arrow
      showing live 3D position + facing (pose published from the rig each frame). (PR #347)

## Theme D — Arcade sub-scene + one playable game — **M** — ✅ DONE (PR #348, 2026-07-07)

- [x] **Arcade scene:** interacting with the lounge console enters a separate arcade room scene —
      dark room, glowing back-wall cabinet row, exit door back to the office; `currentScene` gains
      an `'arcade'` value (additive — 2D scenes untouched). `office-3d-canvas` branches office ↔
      arcade on `currentScene`, sharing one `<Canvas>`/camera. The 3D console now enters the arcade
      (`playstation` action → `enterArcade`); the 2D console still opens the menu. Pure builder
      `lib/office3d/arcade.ts` (room + cabinet row + exit + collision grid). (PR #348)
- [x] **Playable Breakout:** the centre cabinet runs a real **Breakout with all three power-ups**
      (multi-ball, paddle grow/shrink, laser) — a pure, engine-free game loop in
      `lib/office3d/games/breakout.ts`, unit-tested — rendered as a `CanvasTexture` on the cabinet
      screen; walking up + `E` dollies the camera onto the screen and routes the keyboard to the
      game; ESC steps back out. (PR #348)
- [x] **Stub cabinets:** the other 8 cabinets open the existing `RetroGamesMenu` modal via
      `playstationOpen` — the seam future games plug into. (PR #348)
- [x] **High score:** Breakout best score persisted to `localStorage` (`midnite.arcade.breakout-best`).
      *Kept client-local rather than added to the Phase-43 wire bag, to respect the phase guardrail
      of a single new UserPreferences key (`officeView`); server-sync is a trivial future add.* (PR #348)

## Theme E — Corner office & customization parity — **M** — ✅ DONE (PR #350, 2026-07-07)

- [x] **Corner-office room:** the office door (`nearDoor` + `E`/click → `enterCorner`) leads to a 3D
      corner office (`currentScene === 'corner'`; the 2D
      [`corner-office-scene.ts`](../packages/web/components/office/scenes/corner-office-scene.ts)
      counterpart) — `office-3d-canvas` now branches office/arcade/corner on one `<Canvas>`/camera.
      Pure builder `lib/office3d/corner.ts` (room + desk + exit + collision grid + item slots).
      Re-enables the Theme-C-deferred door. (PR #350)
- [x] **Pickers work in 3D:** walking to the desk + `E` opens the existing `DeskItemPicker`
      (`deskPickerOpen`); the `CharacterPicker` opens from the reused `OfficeHud`. Chosen desk items
      render as low-poly props on the desk; the player's Phase-39 character tint colours their
      minimap arrow (the avatar identity visible in first-person). (PR #350)
- [x] **Ambient parity touches:** warm window light in the corner office, a reduced-motion-aware
      pool-water shimmer in the office, glowing door accents. (PR #350)
- [x] **Shared sub-scene rig:** extracted `<SubSceneRig>` (movement + collision + head-bob) from the
      arcade's inline rig and reused by both the arcade + corner scenes; the office `FirstPersonRig`
      stays separate (minimap-pose + live-avatar wiring). (PR #350)

## Theme F — Tabs, routing & preference — **S** — ✅ DONE (PR #336, 2026-07-07)

- [x] **Tabs on `/office`:** a 2D / 3D tab strip (`OfficeSurface`); `?view=2d|3d` URL param
      (shareable, the Phase-52 `?tab=` pattern); default remains 2D. Page stays a thin shell
      (`Suspense` around the param read).
- [x] **Preference sync:** last-used view persisted via a new additive `officeView` UserPreferences
      key (Phase 43) — wired into `appSettingsToPreferences` + `applyPreferences`; the choice sticks
      across devices; the URL param wins over the preference when present.
- [x] **Engine isolation:** only the active engine mounts (conditional render → Phaser destroy /
      three dispose on switch, one engine bundle at a time; both `dynamic(ssr:false)`); office stays
      `DesktopOnly`. ⚠️ **The 3D view ships as a dependency-free placeholder** — adding the
      `three`/`@react-three/*` type stack drags `@types/three`'s transitive global type packages
      (`@webgpu/types`/`@types/webxr`) into the whole web typecheck and collapses unrelated JSX
      inference to `never`; the r3f + React-19 JSX setup belongs in **Theme A** with the real world.
      Theme A replaces `office-3d-view-impl.tsx` with the `<Canvas>`.

## Theme G — Performance & tests — **S-M**

- [ ] **Perf budget:** pixel-ratio cap (`min(devicePixelRatio, 2)`), draw-call budget per room
      chunk (instanced/merged static geometry), no per-frame allocations in the movement/proximity
      loops; degrade gracefully (shadow off first) — document the budget in
      [`components/office/README.md`](../packages/web/components/office/README.md).
- [ ] **Unit tests:** `lib/office3d/` pure modules — world builder placements, collision
      resolution (wall slide, door gaps), head-bob curve (zero under reduced motion), Breakout
      rules (bricks, power-ups, scoring) — alongside-file Vitest like `lib/office/`.
- [ ] **Store-contract test:** a spec asserting the 3D interaction dispatcher writes the same
      store transitions as the 2D `tryInteract` for each interactable (the panels' contract).
- [ ] **Flow smoke:** Playwright — `/office?view=3d` renders the canvas, tab toggle swaps engines
      without console errors, and the 2D office specs still pass unedited (behavior-preserving
      check).

---

## Files this phase touches (map)

- **New (`packages/web/lib/office3d/`):** `world.ts`, `collision.ts`, `materials.ts`,
  `constants.ts`, `headbob.ts`, `games/breakout.ts` (+ `.test.ts` siblings) — all pure,
  three-free where possible
- **New (`packages/web/components/office3d/`):** `office-3d-view.tsx` (dynamic wrapper),
  `office-3d-canvas.tsx` (r3f stage), `world/` (room-chunk components), `first-person-rig.tsx`,
  `agent-avatars.tsx`, `billboards.tsx`, `arcade-scene.tsx`, `breakout-cabinet.tsx`,
  `minimap-hud.tsx`
- **Edit:** [`app/(main)/office/page.tsx`](../packages/web/app/(main)/office/page.tsx) (tabs +
  `?view=`), [`lib/office-store.ts`](../packages/web/lib/office-store.ts) (additive: `'arcade'`
  scene value + any 3D-only fields), the Phase-43 preference bag (view + high-score keys),
  [`components/office/README.md`](../packages/web/components/office/README.md) (architecture map
  gains the 3D column)
- **Reuse untouched:** [`office-hud.tsx`](../packages/web/components/office/office-hud.tsx), all
  panels/modals/pickers, [`use-office-agents.ts`](../packages/web/components/office/use-office-agents.ts),
  [`lib/office/`](../packages/web/lib/office/) geometry/theme/daynight/minimap modules, both
  Phaser scenes + their specs
- **Deps:** `three`, `@react-three/fiber`, `@react-three/drei` in
  [`packages/web/package.json`](../packages/web/package.json)

---

## Verification

- [ ] **Modal reuse proven:** in the 3D view, walking to a desk agent / whiteboard / bookshelf /
      coffee machine / console and pressing `E` opens the *existing* React panels (interaction
      panel with working Call + Messages, boardroom project list → project modal, library, break
      toggle, arcade) — zero edits to any panel component.
- [ ] **2D untouched:** all existing office specs pass unedited; the 2D tab behaves exactly as
      before this phase.
- [ ] **First-person feel:** pointer-lock + WASD with collision (no wall clipping, door passage
      works), subtle walk bob that stops immediately when idle and is fully off under
      reduced-motion.
- [ ] **Culling works:** with the camera in one room, other rooms' chunks are not rendered
      (verified via r3f render info / draw-call count), and chunk content is built lazily on
      first sight.
- [ ] **Arcade:** console → arcade scene transition and back; Breakout is playable start-to-game-
      over with at least 3 power-ups, score persists; other cabinets open the existing menu.
- [ ] **Parity extras:** live-activity bubbles appear over working agents in 3D; day/night alters
      lighting; corner office + both pickers reachable; minimap tracks position/facing.
- [ ] **Tabs:** `?view=3d` deep-links, tab switch fully tears down the outgoing engine (no WebGL
      context/listener leaks across 10 rapid toggles), preference round-trips via Phase 43, and
      the bundle analyzer shows three.js absent from the 2D-only path.
- [ ] `moon run :typecheck` · `:lint` · `:test` green (lib/office3d units, store-contract spec,
      web RTL, Playwright smoke; **web tests from the primary checkout or a `.worktrees/`
      worktree, never under `.git/`**).

---

## Decisions / open questions

1. **Stack: `@react-three/fiber` + `@react-three/drei`** *(settled — user call).* Declarative
   scene components fit the React app; drei supplies pointer-lock, billboards, text. The Zustand
   bridge is unchanged — r3f components are just another store client.
2. **Art: procedural low-poly** *(settled — user call, with a future note).* Zero binary assets,
   flat-shaded primitives + canvas textures themed by
   [`theme.ts`](../packages/web/lib/office/theme.ts). 📌 **Future-work note:** a CC0 **GLTF
   asset-pack upgrade** (e.g. Kenney/Quaternius furniture + rigged characters) is the natural
   fidelity step-up for a later phase — it would need a loading pipeline, licensing notes, and a
   repo-weight decision; the world-builder's data→placement split is designed so swapping
   primitive furniture for GLTF nodes is localized to `materials/`-level code.
3. **Arcade depth: hybrid** *(settled — user call).* One genuinely playable game (Breakout/
   Arkanoid with power-ups — single-player, no AI opponent, power-ups give depth) proving the
   screen-texture + input-routing pipeline; remaining cabinets stay stubs opening the existing
   menu. Making more games playable is an obvious follow-up phase.
4. **Full parity extras in scope** *(settled — user call).* Live-activity bubbles, day/night
   lighting, corner office + pickers, minimap all in. Multiplayer presence, mobile/touch 3D, and
   the GLTF pack are the explicit deferred list.
5. **Collision: grid AABB, no physics engine** *(recommend).* The office is axis-aligned rooms +
   rectangular furniture; a physics dependency (rapier/cannon) buys nothing but bundle weight.
   Revisit only if a future phase adds dynamic objects.
6. **Pointer-lock UX** *(recommend).* Click-to-lock overlay with an ESC hint; opening any panel
   releases the lock (and disables scene keys via the existing store mechanism); re-lock on panel
   close is one click. No drag-look fallback in this phase — the office is `DesktopOnly`.
7. **Breakout plays on the cabinet screen with a camera dolly** *(recommend).* Zooming the camera
   onto the CanvasTexture screen keeps you "in the arcade" (vs. a fullscreen React overlay) and
   exercises the input-routing seam future cabinet games need. If text legibility disappoints,
   fall back to a fullscreen overlay reusing the same game loop.
8. **Out of scope** *(settled).* Multiplayer/co-presence, mobile/touch controls for 3D, VR/WebXR,
   GLTF assets, making the other 7 arcade games playable, any gateway or `shared` schema work
   beyond the additive preference keys.
