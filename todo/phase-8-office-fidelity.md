# Phase 8 — Office fidelity & presence

> [`/office`](../packages/web/components/office/README.md) shipped as a deliberately procedural prototype (Milestone 1): a tile grid drawn with Phaser shapes, "blob" avatars, and live agents at fixed desks. Phase 8 turns it into a **higher-fidelity, living office** — real pixel-art sprites instead of blobs, theme-aware visuals, and status-driven liveliness — and wires the mock Call/Message actions to the gateway.

> Status legend: boxes start unchecked; themes are independent. **Only the rendering layer changes** — the desk-slot model, movement/collision, proximity detection, the Zustand ↔ HUD bridge, and the live-data hook ([`use-office-agents.ts`](../packages/web/components/office/use-office-agents.ts)) all stay as-is.

> **Progress (2026-06-24):** procedural pixel-art + zones + interaction + presence landed — ✅ A2 (human + robot sprites, walk cycle), B1 (theme colours), B3 (fixed-aspect layout), C2 (per-tool shadow glow, PR #167), C3 (grid pathfinding), zones (hot desks / lounge / board room), D1 (Call → live terminal, Messages → transcript), D3 (board-room document viewer); ◐ A3 (rich decor; desk variety left), D2 (click-to-walk; nameplates/minimap left); ✅ C1 (status bubbles + idle sleep/game + body poses, PR #208). **Open (need external assets / new data / out of scope):** A1 external Tiled/LimeZu pack, B2 camera/scrolling map (day-night ✅ #112), E (multiplayer).

---

## Theme A — Real pixel art (replace the procedural blobs)

The headline: swap shapes for real sprites + tiles.

> **Procedural pass shipped (2026-06-20).** Rather than block on an external asset
> pack (LimeZu is paid) + Tiled authoring, the sprites/tiles are **generated in code**
> ([`lib/office/textures.ts`](../packages/web/lib/office/textures.ts)): a tiled floor,
> brick walls, wooden desks/monitors/chairs, and little character sprites with a
> 2-frame walk cycle. Deterministic, themeable (tiles drawn neutral + tinted), and
> zero-licensing. The external **Tiled + LimeZu/Kenney** route (A1) remains open as a
> later upgrade — the texture keys + scene structure are the seam to swap at.

### A1. Tileset + Tiled map (external-asset upgrade) — **M** ◐ PARTIAL
- [ ] Drop a pixel-art office tileset into `packages/web/public/office/` — [LimeZu "Modern Office"](https://limezu.itch.io/modernoffice) (cheap commercial license; the standard look) or [Kenney](https://kenney.nl/assets) (CC0). `images: { unoptimized: true }` means static assets under `public/` just work.
- [x] **Object layer** of desks with custom props (`deskId`/`agentSlot`) — `lib/office/map-data.ts` `MAP_DESK_OBJECTS`/`getDeskSeats()`; replaces hardcoded `DESK_SEATS`. (PR #206, 2026-06-25)
- [x] **Scene refactor** — floor is now `Phaser.Tilemaps.TilemapLayer` built from `buildFloorTileData()` + procedural `ensureOfficeTileset()` (two oak variants; seam for real `.tmj` drop-in later). (PR #206, 2026-06-25)
- [ ] Swap procedural tileset for the real LimeZu/Kenney PNG once licensed — update `ensureOfficeTileset` to `this.load.image` the PNG key instead of drawing it.

### A2. Character sprites + walk animations — **M** — ✅ DONE (2026-06-20, procedural)
- [x] The player & seated-agent `Arc` "blobs" are now character **sprites** ([`textures.ts`](../packages/web/lib/office/textures.ts) `charKey`/`walkAnim`): down/up/side facings with a 2-frame walk cycle. The player animates + flips while walking; agents render seated behind their desks. (Future: smoother multi-frame cycles + a dedicated seated pose come with the A1 asset pack.)
- [x] Per-agent variety: deterministic identity tint by agent id (`agentTint`) so desks are distinguishable at a glance; the player has its own tint.

### A3. Furniture & decor — **S** — ◐ partial
- [x] Desks, monitors, chairs, couches, armchairs, TV, gaming console, conference table, whiteboard, rugs, plants, and a **coffee station** in the lounge corner (all procedural).
- [ ] Desk variety + more clutter — best with the A1 asset pack.

---

## Theme B — Theme & visual polish

### B1. Theme-aware colours (light/dark) — **S** — ✅ DONE (2026-06-20)
- [x] The canvas hardcoded a dark palette; now structural colours + labels read the app's CSS design tokens and flip with light/dark. [`lib/office/theme.ts`](../packages/web/lib/office/theme.ts) `buildOfficePalette()` maps `--background`/`--muted`/`--border`/`--secondary`/`--foreground` → Phaser ints (reusing `hslTripletToInt`); the scene exposes `applyPalette()` and [`office-game.tsx`](../packages/web/components/office/office-game.tsx) re-applies it on `useTheme()` change. Decorative colours (desk, screen, avatar, highlight) + status tints stay fixed.

### B2. Ambient polish — **S–M** — ◐ partial
- [x] Soft drop-shadows under characters/desks; a subtle radial vignette at the room edges (`buildVignette`, a generated canvas texture).
- [x] Day/night floor tint aligned with the `time` theme. ✅ (2026-06-22, PR #112 — see done.md)
- [x] Pixel-perfect camera with zoom; a larger scrolling map (camera follows the player) once the Tiled map (A1) lands. *(PR #206: `ZOOM = 1.5`, `cameras.main.setZoom(ZOOM)`, `cameras.main.startFollow(this.player, true, 0.12, 0.12)` — smooth lerped follow across 34×22 tile map)*

### B3. Fixed-aspect-ratio layout — **S** — ✅ DONE (2026-06-20)
- [x] The Phaser window has a **fixed aspect ratio**, so the stage box is **full width** with its **height derived from `OFFICE_ASPECT`** ([`lib/office/dimensions.ts`](../packages/web/lib/office/dimensions.ts)) via CSS `aspect-ratio` — canvas + HUD overlay scale together, never distorted. ([`office-view-impl.tsx`](../packages/web/components/office/office-view-impl.tsx) + the loading shell in [`office-view.tsx`](../packages/web/components/office/office-view.tsx).)
- [x] When that height overflows the viewport the page just scrolls in the normal content area (the header bar collapses on scroll as everywhere else) — the box no longer clamps to a fixed `vh` height.

---

## Theme C — Presence & liveliness (inspired by pixtuoid / agentroom)

Make agents *look* like they're doing what their status says.

### C1. Status-driven presence — **M** — ✅ DONE (2026-06-26, PR #208)
- [x] Each agent shows a status **speech bubble** driven off `OfficeAgent.status` — `running` → `···`, `waiting` → `?`, `completed` → `✓` — coloured by the shared status tint (`STATUS_BUBBLE` in [`office-scene.ts`](../packages/web/components/office/scenes/office-scene.ts)).
- [x] **Idle agents sleep or game** in the lounge: split deterministically by id (`isGamer`) — sleepers show an animated `z`/`zz`/`zzz` (timer-driven, `setActivity`/`tickIdleBubbles`); gamers show `▶` and face the TV.
- [x] Richer per-status **body** animations — procedural pose textures: **typing** (arms angled toward keyboard), **raised** (arms up, blocked/waiting), **celebrate** (Y-shape, completed). Full activity state machine in `applyPose()` — no external asset sheet needed. (PR #208)

### C2. Activity indicators — **S–M** — ✅ DONE (2026-06-24, PR #167)
- [x] Per-tool shadow glow: `toolShadowTint()` maps `liveActivity.tool` → semantic color (Edit/Write green, Bash orange, Read blue, Agent/MCP purple, unknown amber). Wired into `updateActorContent()` — `actor.shadow.setFillStyle(color, alpha)` shifts when phase=`running`, resets to neutral when idle. Powered by Phase 31 E's `liveActivity` field.

### C3. Movement & sub-agents — **M–L** — ◐ partial (2026-06-23)
- [x] Agents **walk** between zones when their status flips — idle agents sit in the lounge, working agents at hot desks, and the robot animates lounge ↔ desk on change (`walkActor` in [`office-scene.ts`](../packages/web/components/office/scenes/office-scene.ts)).
- [x] **Grid pathfinding** — 4-directional A* over a walkability grid (`blockedGrid()` in [`layout.ts`](../packages/web/lib/office/layout.ts): walls + furniture, with the start/goal seat special-cased). The robot tweens through the waypoints (per-segment facing), so it routes *around* furniture/walls instead of sliding through them; falls back to a direct tween if unreachable.
- [x] **Gentle idle wander** (PR #152) — a `maybeWander()` timer (6.7s) picks a sleeping lounger (~1-in-3 ticks), finds a walkable tile within 2 steps of its seat, walks there, pauses 3s, then returns and re-applies the zzz bubble. Distinct cadence from `maybeSwim` to avoid visual synchronisation.
- [ ] Render sub-agents as linked characters near their parent — deferred until sub-agent data is surfaced on `OfficeAgent` (needs gateway changes).

---

## Theme D — Richer interaction (wire the mocks)

### D1. Call / Message → gateway — **M** — ✅ DONE (2026-06-20)
- [x] [`office-hud.tsx`](../packages/web/components/office/office-hud.tsx) is wired to the gateway (no more mock). **Call** → the agent's live session terminal (`SessionTerminalModal`, enabled while running/waiting); **Messages** → its transcript (`SessionTranscriptModal`, fetched via `getSessionTranscript`). Reuses the Sessions-page modals; `OfficeAgent` now carries its `SessionSummary`. The transcript modal is portalled to `<body>` so the stage's `overflow-hidden` / a persisted page-reveal transform can't clip it.
- Note: there's no one-off "send a prompt" gateway API — the terminal is the live interaction channel, so Call opens it rather than a fire-and-forget message box.

### D2. Navigation niceties — **S** — ◐ partial (2026-06-23)
- [x] **Click-to-walk** — clicking the floor pathfinds the player there (reuses the A* + a velocity-steered waypoint follower; manual WASD cancels it, and a deadline aborts if it gets nudged into furniture). `onPointerDown`/`movePlayer` in [`office-scene.ts`](../packages/web/components/office/scenes/office-scene.ts).
- [x] **Proximity nameplates** — agent name + status chips are hidden by default (alpha 0) and snap visible when the player is within `NAMEPLATE_RANGE` (4 tiles). Both labels gain a dark semi-transparent `backgroundColor` so they read as proper pill nameplates. See PR #149.
- [ ] Minimap — deferred until the map grows (needs Phase 8 A1 / B2 larger scrolling map).

### D3. Board room — plans & documents — **M** — ✅ DONE (2026-06-20)
- [x] A walled board room (left-open / right-walled floor plan in [`layout.ts`](../packages/web/lib/office/layout.ts)) with a conference table and a documents **whiteboard** the player walks up to (E). Opens [`boardroom-panel.tsx`](../packages/web/components/office/boardroom-panel.tsx): a **project filter** (`Select`) listing that project's plan + scoped memories; clicking opens a read-only `MarkdownPreview` modal ([`document-modal.tsx`](../packages/web/components/office/document-modal.tsx)). Document assembly is pure + tested ([`documents.ts`](../packages/web/lib/office/documents.ts)).
- Decision: a project's "documents" = its `plan` + memories scoped to it. Future: councils' synthesis, session transcripts, task specs.

---

## Theme E — Multiplayer presence (future, out of scope)

- [ ] Human teammates as avatars (the original "see what people are up to") via a presence server (Colyseus / Socket.IO + optional WebRTC for proximity calls). The Zustand bridge and scene stay the same; only the data source changes. Deliberately deferred — Phase 8 is single-user fidelity.

---

## Decisions

1. **Asset pack** → LimeZu "Modern Office" (best fit, cheap commercial license) vs Kenney (CC0, free). _Open._
2. **Map authoring** → Tiled (`.tmj`, mature, native Phaser loader) vs LDtk → **Tiled** (recommended).
3. **Tile size** → keep **32px** (matches the current grid and most office packs).
4. **Agent sprites** → one shared spritesheet recolored per agent vs distinct sheets. _Open._
