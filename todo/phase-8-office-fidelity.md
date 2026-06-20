# Phase 8 — Office fidelity & presence

> [`/office`](../packages/web/components/office/README.md) shipped as a deliberately procedural prototype (Milestone 1): a tile grid drawn with Phaser shapes, "blob" avatars, and live agents at fixed desks. Phase 8 turns it into a **higher-fidelity, living office** — real pixel-art sprites instead of blobs, theme-aware visuals, and status-driven liveliness — and wires the mock Call/Message actions to the gateway.

> Status legend: boxes start unchecked; themes are independent. **Only the rendering layer changes** — the desk-slot model, movement/collision, proximity detection, the Zustand ↔ HUD bridge, and the live-data hook ([`use-office-agents.ts`](../packages/web/components/office/use-office-agents.ts)) all stay as-is.

---

## Theme A — Real pixel art (replace the procedural blobs)

The headline: swap shapes for an actual tileset + character sprites.

### A1. Tileset + Tiled map — **M**
- [ ] Drop a pixel-art office tileset into `packages/web/public/office/` — [LimeZu "Modern Office"](https://limezu.itch.io/modernoffice) (cheap commercial license; the standard look) or [Kenney](https://kenney.nl/assets) (CC0). `images: { unoptimized: true }` means static assets under `public/` just work.
- [ ] Author the floor/walls/furniture in [Tiled](https://www.mapeditor.org/), export `.tmj`; add an **object layer** of desks carrying custom props (`deskId`/`agentSlot`) so slots come from the map, not the hardcoded `DESK_SLOTS`.
- [ ] In [`office-scene.ts`](../packages/web/components/office/scenes/office-scene.ts), replace `paintFloor`/`buildWalls`/`buildDesks` with `this.load` (preload) + `this.make.tilemap` + tileset layers; derive colliders from the wall/furniture layer and desk positions from the object layer.

### A2. Character sprites + walk animations — **M**
- [ ] Replace the player & seated-agent `Arc` "blobs" with a character spritesheet (4-direction walk cycle + idle + a seated pose). The player animates while walking; agents render seated at their desks.
- [ ] Per-agent variety: deterministic outfit/tint by agent id (like the reference repos) so desks are distinguishable at a glance.

### A3. Furniture & decor — **S**
- [ ] Desk variety, plants, rugs, a coffee corner — cosmetic tiles from the same pack to make the room feel inhabited.

---

## Theme B — Theme & visual polish

### B1. Theme-aware colours (light/dark) — **S** — ✅ DONE (2026-06-20)
- [x] The canvas hardcoded a dark palette; now structural colours + labels read the app's CSS design tokens and flip with light/dark. [`lib/office/theme.ts`](../packages/web/lib/office/theme.ts) `buildOfficePalette()` maps `--background`/`--muted`/`--border`/`--secondary`/`--foreground` → Phaser ints (reusing `hslTripletToInt`); the scene exposes `applyPalette()` and [`office-game.tsx`](../packages/web/components/office/office-game.tsx) re-applies it on `useTheme()` change. Decorative colours (desk, screen, avatar, highlight) + status tints stay fixed.

### B2. Ambient polish — **S–M**
- [ ] Day/night floor tint aligned with the `time` theme; soft drop-shadows under characters/desks; a subtle vignette.
- [ ] Pixel-perfect camera with zoom; a larger scrolling map (camera follows the player) once the Tiled map (A1) lands.

### B3. Fixed-aspect-ratio layout — **S**
- [ ] The Phaser window has a **fixed aspect ratio**. The HTML container that holds the corner buttons/labels (the HUD overlay) should always be **full width**, with its **height derived to preserve that aspect ratio** (`height = width / aspectRatio`) — i.e. the canvas + overlay scale together as one box and never distort.
- [ ] If that derived height exceeds the available viewport height, **let the page scroll on the HTML side** rather than shrinking the canvas. This happens in the normal content area, which collapses the header bar on scroll like everywhere else — so no extra header work is needed; just don't clamp the stage box to `100%` height or trap it in a non-scrolling container.

---

## Theme C — Presence & liveliness (inspired by pixtuoid / agentroom)

Make agents *look* like they're doing what their status says.

### C1. Status-driven animations — **M**
- [ ] `running` → typing animation; `waiting` → a `?` thought bubble; `idle` → `zzz`; `completed` → a brief celebrate, then settle. Driven off the existing `OfficeAgent.status` — no new data.

### C2. Activity indicators — **S–M**
- [ ] Per-tool glow / icon over a working agent (Edit, Bash, Read…). Needs a current-tool field surfaced on the session/activity (see Theme D data work).

### C3. Movement & sub-agents — **M–L**
- [ ] Agents walk to their desk on spawn (grid pathfinding) instead of popping in; gentle idle wander; render sub-agents as linked characters near their parent.

---

## Theme D — Richer interaction (wire the mocks)

### D1. Call / Message → gateway — **M**
- [ ] [`office-hud.tsx`](../packages/web/components/office/office-hud.tsx) Call/Message are **mock**. Wire **Call** → open the agent's session transcript/terminal (reuse the Sessions transcript/terminal components); wire **Message** → send a prompt to the session via the typed API client.

### D2. Navigation niceties — **S**
- [ ] Click-to-walk (pointer → grid pathfinding to the target desk); hover nameplates/tooltips; a small minimap once the map grows.

---

## Theme E — Multiplayer presence (future, out of scope)

- [ ] Human teammates as avatars (the original "see what people are up to") via a presence server (Colyseus / Socket.IO + optional WebRTC for proximity calls). The Zustand bridge and scene stay the same; only the data source changes. Deliberately deferred — Phase 8 is single-user fidelity.

---

## Decisions

1. **Asset pack** → LimeZu "Modern Office" (best fit, cheap commercial license) vs Kenney (CC0, free). _Open._
2. **Map authoring** → Tiled (`.tmj`, mature, native Phaser loader) vs LDtk → **Tiled** (recommended).
3. **Tile size** → keep **32px** (matches the current grid and most office packs).
4. **Agent sprites** → one shared spritesheet recolored per agent vs distinct sheets. _Open._
