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

- [ ] **Deps + stage:** add `three`, `@react-three/fiber`, `@react-three/drei` to `packages/web`;
      an `Office3DView` mounted via `dynamic(ssr:false)` (the
      [`office-view.tsx`](../packages/web/components/office/office-view.tsx) pattern) wrapping an
      r3f `<Canvas>`; StrictMode-safe mount/unmount with full `dispose()` of geometries/materials/
      textures on teardown (mirror [`office-game.tsx`](../packages/web/components/office/office-game.tsx)'s
      lifecycle discipline).
- [ ] **World builder:** a pure `lib/office3d/world.ts` that maps
      [`layout.ts`](../packages/web/lib/office/layout.ts) grid/rooms/walls +
      [`desks.ts`](../packages/web/lib/office/desks.ts) into 3D placements (floors, walls with
      door gaps, desks, boardroom table + whiteboard, library shelves, kitchen counter + coffee
      machine, lounge sofa + console, pool) — unit-testable data → transform, no three imports.
- [ ] **Procedural low-poly art:** furniture from three primitives (flat-shaded), surfaces textured
      by canvas-generated textures reusing the palette/theme from
      [`theme.ts`](../packages/web/lib/office/theme.ts) (a `lib/office3d/materials.ts` beside the
      2D [`textures.ts`](../packages/web/lib/office/textures.ts)); accent/tint follows the active
      app theme like the 2D office does.
- [ ] **Room chunking + frustum-culled loading:** meshes grouped per room; static furniture merged/
      instanced per chunk; each chunk's content **built lazily on first visibility and toggled by
      frustum/room-adjacency checks** so off-view rooms cost nothing (three's per-object frustum
      culling alone isn't enough — we gate whole chunks and their textures).
- [ ] **Lighting + day/night:** ambient + directional keyed off
      [`daynight.ts`](../packages/web/lib/office/daynight.ts) (sun angle, window glow, warm lamps
      at night); respects the reduced-motion/perf settings from Phase 39.

## Theme B — First-person rig (pointer-lock, movement, head-bob) — **M**

- [ ] **Controller:** pointer-lock mouse-look (drei `PointerLockControls`) + WASD/arrows movement
      with walk speed matched to the 2D feel; click-to-lock overlay with an ESC hint; pointer
      unlock ⇄ store keyboard-disable so open panels type into React, not the scene (the existing
      contract).
- [ ] **Collision:** grid AABB collision from the same walkability data the 2D office uses
      (walls, furniture, room bounds) — pure `lib/office3d/collision.ts`, no physics library;
      smooth wall-sliding, door-gap passage.
- [ ] **Head-bob:** subtle footstep-cadenced camera bob + micro-roll while moving (amplitude/
      frequency tied to actual velocity, eased in/out, **disabled under `prefers-reduced-motion`**
      and the Phase-39 motion setting).
- [ ] **Spawn + orientation:** spawn at the 2D player's entry point facing the office; `R`-style
      reset optional; camera height/FOV constants in `lib/office3d/constants.ts`.

## Theme C — Agents, interactions & the store bridge — **M-L**

The heart of the phase: the 3D scene becomes a second client of the existing store contract.

- [ ] **Proximity → store:** per-frame (dedup'd, the 2D pattern) proximity checks against desks/
      board/library/kitchen/console/door write the **same** store fields (`nearbyId`, `nearBoard`,
      `nearLibrary`, `nearKitchen`, `nearPlaystation`, `nearDoor`); `E`/Enter (and click-raycast on
      the interactable) dispatches the same panel-open transitions `tryInteract` does in
      [`office-scene.ts`](../packages/web/components/office/scenes/office-scene.ts) — so
      [`office-hud.tsx`](../packages/web/components/office/office-hud.tsx) prompts and **every
      existing modal work unmodified**.
- [ ] **Agent avatars:** low-poly procedural figures (blocky/capsule, tinted per Phase-39
      variant/tint) seated at their hot desks, driven by the store's agents (from
      [`use-office-agents.ts`](../packages/web/components/office/use-office-agents.ts)); idle
      agents lounge in the pool/lounge area like the 2D office; simple seated/typing idle motion.
- [ ] **Billboards:** name + status plates above avatars (drei `Billboard`/`Text`), plus the
      Phase-31 **live-activity tool bubbles** (tool icon/label deltas via `patchAgent`) as
      billboarded sprites — distance-faded so far rooms don't clutter.
- [ ] **Coffee + break:** kitchen coffee machine toggles `onBreak` with the ☕ indicator on your
      own state, matching 2D.
- [ ] **Minimap overlay:** HUD minimap reusing [`minimap.ts`](../packages/web/lib/office/minimap.ts)
      room/dot data with the player arrow showing 3D position + facing.

## Theme D — Arcade sub-scene + one playable game — **M**

- [ ] **Arcade scene:** interacting with the lounge console transitions (fade) into a separate
      arcade room scene — dark room, glowing cabinet row (one per
      [`retro-games-menu.tsx`](../packages/web/components/office/retro-games-menu.tsx) title),
      exit door back to the office; `currentScene` gains an `'arcade'` value (additive — 2D scenes
      untouched).
- [ ] **Playable Breakout:** one cabinet runs a real **Breakout/Arkanoid with power-ups**
      (multi-ball, paddle grow/shrink, laser — a pure-canvas game loop in
      `lib/office3d/games/breakout.ts`, engine-free and unit-testable) rendered as a
      `CanvasTexture` on the cabinet screen; walking up + `E` dollies the camera onto the screen
      and routes keyboard to the game; ESC steps back out.
- [ ] **Stub cabinets:** the other cabinets open the existing `RetroGamesMenu` modal via
      `playstationOpen`/`onGameSelect` — the seam future games plug into.
- [ ] **High score:** Breakout best score persisted via the Phase-43 preference bag (small,
      additive key) with a local fallback.

## Theme E — Corner office & customization parity — **M**

- [ ] **Corner-office room:** the door transition leads to a 3D corner office (the 2D
      [`corner-office-scene.ts`](../packages/web/components/office/scenes/corner-office-scene.ts)
      counterpart) — same `nearDoor`/`currentScene` store mechanics.
- [ ] **Pickers work in 3D:** desk-item picker + character picker open from the corner office as
      today (store flags, existing React components); chosen desk items render as low-poly props
      on your desk; character variant/tint recolors your hands-free presence (avatar tint shown to
      others/minimap).
- [ ] **Ambient parity touches:** pool water shimmer, window light, door open/close accent —
      small, cheap atmosphere items that make 3D feel alive rather than a gray box.

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
