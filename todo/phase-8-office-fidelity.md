# Phase 8 — Office fidelity & presence

> [`/office`](../packages/web/components/office/README.md) shipped as a deliberately procedural prototype (Milestone 1): a tile grid drawn with Phaser shapes, "blob" avatars, and live agents at fixed desks. Phase 8 turns it into a **higher-fidelity, living office** — real pixel-art sprites instead of blobs, theme-aware visuals, and status-driven liveliness — and wires the mock Call/Message actions to the gateway.

> Status legend: boxes start unchecked; themes are independent. **Only the rendering layer changes** — the desk-slot model, movement/collision, proximity detection, the Zustand ↔ HUD bridge, and the live-data hook ([`use-office-agents.ts`](../packages/web/components/office/use-office-agents.ts)) all stay as-is.

> **Progress (2026-06-20):** the procedural pixel-art pass landed — ✅ A2 (sprites + walk cycle), B1 (theme colours), B3 (fixed-aspect layout); ◐ A3 / B2 / C1 (partial). **Open:** A1 external Tiled/LimeZu pack, B2 day-night + camera, C2/C3 presence depth, D (wire Call/Message), E (multiplayer).

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

### A1. Tileset + Tiled map (external-asset upgrade) — **M**
- [ ] Drop a pixel-art office tileset into `packages/web/public/office/` — [LimeZu "Modern Office"](https://limezu.itch.io/modernoffice) (cheap commercial license; the standard look) or [Kenney](https://kenney.nl/assets) (CC0). `images: { unoptimized: true }` means static assets under `public/` just work.
- [ ] Author the floor/walls/furniture in [Tiled](https://www.mapeditor.org/), export `.tmj`; add an **object layer** of desks carrying custom props (`deskId`/`agentSlot`) so slots come from the map, not the hardcoded `DESK_SLOTS`.
- [ ] In [`office-scene.ts`](../packages/web/components/office/scenes/office-scene.ts), replace the procedural `TileSprite`/`staticImage` build with `this.load` (preload) + `this.make.tilemap` + tileset layers; derive colliders from the wall/furniture layer and desk positions from the object layer.

### A2. Character sprites + walk animations — **M** — ✅ DONE (2026-06-20, procedural)
- [x] The player & seated-agent `Arc` "blobs" are now character **sprites** ([`textures.ts`](../packages/web/lib/office/textures.ts) `charKey`/`walkAnim`): down/up/side facings with a 2-frame walk cycle. The player animates + flips while walking; agents render seated behind their desks. (Future: smoother multi-frame cycles + a dedicated seated pose come with the A1 asset pack.)
- [x] Per-agent variety: deterministic identity tint by agent id (`agentTint`) so desks are distinguishable at a glance; the player has its own tint.

### A3. Furniture & decor — **S** — ◐ partial
- [x] Desks, monitors, chairs (procedural). 
- [ ] Desk variety, plants, rugs, a coffee corner — cosmetic tiles to make the room feel inhabited (best with the A1 pack).

---

## Theme B — Theme & visual polish

### B1. Theme-aware colours (light/dark) — **S** — ✅ DONE (2026-06-20)
- [x] The canvas hardcoded a dark palette; now structural colours + labels read the app's CSS design tokens and flip with light/dark. [`lib/office/theme.ts`](../packages/web/lib/office/theme.ts) `buildOfficePalette()` maps `--background`/`--muted`/`--border`/`--secondary`/`--foreground` → Phaser ints (reusing `hslTripletToInt`); the scene exposes `applyPalette()` and [`office-game.tsx`](../packages/web/components/office/office-game.tsx) re-applies it on `useTheme()` change. Decorative colours (desk, screen, avatar, highlight) + status tints stay fixed.

### B2. Ambient polish — **S–M** — ◐ partial
- [x] Soft drop-shadows under characters/desks; a subtle radial vignette at the room edges (`buildVignette`, a generated canvas texture).
- [ ] Day/night floor tint aligned with the `time` theme.
- [ ] Pixel-perfect camera with zoom; a larger scrolling map (camera follows the player) once the Tiled map (A1) lands.

### B3. Fixed-aspect-ratio layout — **S** — ✅ DONE (2026-06-20)
- [x] The Phaser window has a **fixed aspect ratio**, so the stage box is **full width** with its **height derived from `OFFICE_ASPECT`** ([`lib/office/dimensions.ts`](../packages/web/lib/office/dimensions.ts)) via CSS `aspect-ratio` — canvas + HUD overlay scale together, never distorted. ([`office-view-impl.tsx`](../packages/web/components/office/office-view-impl.tsx) + the loading shell in [`office-view.tsx`](../packages/web/components/office/office-view.tsx).)
- [x] When that height overflows the viewport the page just scrolls in the normal content area (the header bar collapses on scroll as everywhere else) — the box no longer clamps to a fixed `vh` height.

---

## Theme C — Presence & liveliness (inspired by pixtuoid / agentroom)

Make agents *look* like they're doing what their status says.

### C1. Status-driven presence — **M** — ◐ partial (2026-06-20)
- [x] Each seated agent shows a status **speech bubble** above their head driven off `OfficeAgent.status` — `running` → `···`, `waiting` → `?`, `idle` → `z`, `completed` → `✓` — coloured by the shared status tint and gently bobbing (`STATUS_BUBBLE` in [`office-scene.ts`](../packages/web/components/office/scenes/office-scene.ts)).
- [ ] Richer per-status **body** animations (typing pose, a real celebrate-then-settle) — needs the multi-frame character sheet from A1/A2.

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
