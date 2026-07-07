# `/office` — pixel-art interactive office

A walkable, **multi-room** office. The **player** (a human avatar) roams between six rooms
while each **live midnite agent** (gateway session) appears as a little **robot**: working
agents sit at **hot desks** in the work room (walk up to call/message them), idle agents lounge
in the **Agent pool** (poolside leisure), the **communal area** lets you take a coffee break, the
**board room** is the **projects hub** (walk up to open the live project list), the **library**
bookshelf opens a **searchable book list** (walk up + E), and a door leads to a **corner office**. Everything updates in real time as
agents start, change status, and finish — and robots walk between the pool and a desk when
their status flips.

## Architecture

```
app/(main)/office/page.tsx
  └─ <OfficeSurface>             office-surface.tsx — reads ?view=2d|3d; 2D is the default
       ├─ <OfficeView>           office-view.tsx — dynamic(ssr:false) wrapper (keeps Phaser client-only)
       │    └─ <OfficeViewImpl>  office-view-impl.tsx — relative stage box; runs useOfficeAgents()
       │         ├─ <OfficeGame> office-game.tsx — mounts/destroys the Phaser game (StrictMode-safe)
       │         │    └─ OfficeScene  scenes/office-scene.ts — tiles/sprites, zones, movement, collision, actors
       │         └─ <OfficeHud>  office-hud.tsx — controls hint, online count, proximity prompts, panels
       │              ├─ InteractionPanel   call/message a desk agent (mock)
       │              └─ <BoardroomPanel>   boardroom-panel.tsx — live project list (the projects hub)
       │                   └─ <ProjectModal>  project-modal.tsx — reused as-is, portalled over the office
       └─ <Office3DView>         ../office3d/office-3d-view.tsx — dynamic(ssr:false) three.js engine (Phase 63)
            └─ <Office3DViewImpl> ../office3d/office-3d-view-impl.tsx — r3f stage + click-to-lock overlay
                 │    └─ <OfficeHud>  office-hud.tsx — REUSED untouched: proximity prompts + every panel/modal (Theme C)
                 └─ <Office3DCanvas>  ../office3d/office-3d-canvas.tsx — <Canvas>; branches office ↔ arcade on currentScene (Theme D)
                      ├─ (office) <OfficeWorld>  ../office3d/world/office-world.tsx — flat-shaded rooms/walls/furniture
                      ├─ (office) <AgentAvatars> ../office3d/agent-avatars.tsx — low-poly figures + drei <Html> billboards (Theme C)
                      ├─ (office) <FirstPersonRig> ../office3d/first-person-rig.tsx — pointer-lock + WASD + collision + head-bob + proximity/interaction (Theme B/C)
                      ├─ (office) <MinimapHud>   ../office3d/minimap-hud.tsx — in-canvas r3f <Hud> minimap (Theme C)
                      ├─ (arcade) <ArcadeScene>  ../office3d/arcade/arcade-scene.tsx — arcade room; <BreakoutCabinet> plays a real Breakout on a CanvasTexture (Theme D)
                      └─ (corner) <CornerScene>  ../office3d/corner/corner-scene.tsx — corner office; desk + item props, pickers, window light (Theme E)
                                  (arcade + corner share <SubSceneRig> ../office3d/scene-rig.tsx — pointer-lock + WASD + collision + head-bob)
```

**3D office (Phase 63).** A first-person three.js view of the *same* office, opt-in via `?view=3d`
(2D stays the default; Theme F adds the tab strip + preference). It's a **client of the same
contract**: the pure world builder ([`lib/office3d/world.ts`](../../lib/office3d/world.ts)) maps the
2D [`layout.ts`](../../lib/office/layout.ts) into 3D placements, [`materials.ts`](../../lib/office3d/materials.ts)
resolves theme-aware colours + day/night lighting from the *same* [`theme.ts`](../../lib/office/theme.ts) /
[`daynight.ts`](../../lib/office/daynight.ts) helpers, and the scene calls the store's `reset()` on
mount/unmount so proximity/panel flags never leak across a tab switch. All `lib/office3d/` helpers are
`three`-free + unit-tested. Theme A built the world + a minimal walk rig; **Theme B** added
grid-AABB collision (`collision.ts`, circle-vs-tile per-axis wall-slide over the 2D `blockedGrid()`)
and footstep head-bob (`headbob.ts`, disabled under reduced motion via `useAnimationPrefs`).
**Theme C** made the scene a live store client: the rig writes the same proximity flags the 2D scene
does and dispatches the same panel-open transitions `tryInteract` does — via a pure `interactions.ts`
(`resolveProximity` / `pickInteraction` / `raycastPick` / `applyInteraction`) driven by `E`/Enter and
a crosshair click — so the reused `<OfficeHud>` prompts + every modal work untouched. Live agents
render as low-poly avatars (`agent-avatars.tsx`) at the same status-routed seats as 2D
(`agents-3d.ts`: `statusToRoom` + `assignStableSeats`) with drei `<Html>` billboards, and an
in-canvas r3f `<Hud>` minimap (`minimap-hud.tsx`, `minimap-3d.ts`) tracks the player.
**Theme D** adds the arcade: the console (`playstation` action → `enterArcade`) sets
`currentScene = 'arcade'`, and `office-3d-canvas` swaps the office out for `<ArcadeScene>` (its own
room, rig, and lighting, from the pure `arcade.ts` builder). The centre cabinet runs a real,
engine-free **Breakout** (`games/breakout.ts` — paddle/ball/bricks + multi-ball/resize/laser
power-ups, all unit-tested) on a `CanvasTexture`; walking up + `E` dollies the camera onto the screen
and routes the keyboard to the game (`ESC` exits), best score → `localStorage`. Stub cabinets open the
existing `RetroGamesMenu`.
**Theme E** adds the 3D corner office: the office door (`nearDoor` + `E` → `enterCorner`) sets
`currentScene = 'corner'`, so `office-3d-canvas` now branches **office / arcade / corner** on one
`<Canvas>`. The corner (`corner.ts` builder) has a personal desk — walking up + `E` opens the existing
`DeskItemPicker`, chosen items render as low-poly props, and the `CharacterPicker` opens from the HUD
(the player's tint colours their minimap arrow). Warm window light + a reduced-motion-aware pool
shimmer are the ambient touches. The arcade + corner share `<SubSceneRig>` (`scene-rig.tsx`); the
office keeps its own `FirstPersonRig` for minimap/avatar wiring.

**3D perf budget (Theme G).** The 3D office holds a modest budget so it stays smooth on a laptop GPU:
- **Pixel ratio capped** at `min(devicePixelRatio, 2)` (`MAX_PIXEL_RATIO`), **shadows off** — the first
  thing to drop if a device struggles.
- **Static geometry, few draw calls.** The world is built once at mount from the pure `world.ts` model;
  walls are emitted as **merged runs** (the ~120 wall tiles collapse to a few dozen boxes, `mergeWallRuns`),
  and per-object `frustumCulled` (three's default) skips off-screen rooms. Only **one scene** is mounted at a
  time (office *or* arcade *or* corner), and only one engine bundle loads (2D Phaser *or* 3D three).
- **No per-frame allocations in the movement/proximity loops.** The rigs keep scratch `Vector3`s + a scratch
  `Vec2` and call `resolveMoveInto` (allocation-free); proximity/head-bob reuse the same math the pure
  helpers expose. `resolveMove` (allocating) stays for tests + one-shot callers.
- **Animation is reduced-motion aware** (`useAnimationPrefs`): head-bob, the running-avatar idle bob, and the
  pool shimmer all zero out under `prefers-reduced-motion` / the Phase-39 motion setting.
- **Deferred:** per-room lazy chunk-building + furniture instancing (the world builds all rooms up front) —
  a further draw-call win if a much larger floor plan ever needs it.

**Tests (Theme G).** All `lib/office3d/` modules are pure + unit-tested (world placements, collision +
`resolveMoveInto`, head-bob, agents/room-routing, proximity/interaction, minimap, arcade, Breakout rules,
corner). `store-contract.test.ts` pins the 3D `pickInteraction`→`applyInteraction` pipeline to the 2D
`tryInteract` store transition per interactable, and `e2e/office.e2e.ts` smoke-tests `?view=3d` + the
2D↔3D tab toggle (engine swap, no uncaught errors).

**Rooms** ([`lib/office/layout.ts`](../../lib/office/layout.ts) — Phaser-free floor plan): a 34×22 grid
split by internal walls into **six rooms** in a 3×2 arrangement — a top band (**work** hot desks ·
**board room** · **library**) over a bottom band (**Agent pool** · **communal area** · **corner office**) —
connected by 2-tile doorways in every shared wall, so the whole map is one connected walkable space
(`ROOMS` describes each room's interior rect + label). `office-scene.ts` seats **working** agents
(`status !== 'idle'`) at desks and **idle** agents on the **Agent pool** sun loungers, where they
**lounge** (animated `zzz`) and **occasionally swim a lane** in the pool — a periodic timer sends one
lounger paddling through the basin (with a trailing wake ripple) and back. When an agent's status flips
it **walks** there — 4-directional A* over a walkability grid (`blockedGrid()`, which now blocks the
pool basin) so it routes around furniture/walls and through the doorways. (Camera-follow for the larger
map is Phase 9 A2; the corner office becomes a separate scene in Phase 9 F. The communal area now has a chill-corner seating cluster (couches +
armchair + rug), an astro-turf patch, and a gaming-corner carpet under the TV/console (Phase 9 E2); the
TV/PlayStation get super-sized + interactable with a retro-games menu in Phase 9 E3–E4.)

**Controls:** WASD/arrows or **click-to-walk** (the player pathfinds to the clicked tile; manual input
cancels it). **E** interacts with the nearest desk agent, the board-room whiteboard, or the communal-area
coffee machine — there **E** toggles an "on a break" state (a `☕ On a break` badge in the HUD +
a ☕ over the player). The break flag is local/mock for now (Phase 9 E1).

**Minimap** (Phase 8 D2): a small always-on overview pinned bottom-right shows the whole 34×22 map —
room outlines (accent-tinted per room), agent dots (status-coloured; **red** when an agent needs you),
the **player** dot, and a rectangle marking the camera's current viewport. Pure geometry
(world↔minimap) lives in [`lib/office/minimap.ts`](../../lib/office/minimap.ts); the scene draws it as a
container tracking the follow-camera's `worldView` each frame (scaled `1/ZOOM`), with the panel fill
re-tinting on the light/dark flip.

**Hot desks** (A3): the work room holds **one desk per agent-pool slot** — the desk count equals the
configured pool capacity (`terminal.maxSessions`, read from the `/pool` snapshot). A pure
[`lib/office/desks.ts`](../../lib/office/desks.ts) `generateDeskLayout(capacity)` packs that many desks
into the WORK room as an even grid and scales them to fit (larger when few, smaller when many); the
scene rebuilds the desks + walkability grid when the live capacity arrives (`office-store` carries
`deskCapacity`, fetched once in `use-office-agents`). Each desk gets a deterministic **setup**
(single / dual-monitor / laptop), a per-desk **screen colour**, and 2–3 **clutter** items by seat index.

**Art:** sprites/tiles are **generated procedurally** in [`lib/office/textures.ts`](../../lib/office/textures.ts)
— a tiled floor, brick walls, desks/monitors, a TV + console, a conference table, a projects
whiteboard, a counter, bookshelves, a corner-office door, a pool water tile + sun loungers, plus two character kinds: a **human**
player and **robot** agents (16×20, down/up/side, a 2-frame walk cycle). Agents get a deterministic
identity tint (`agentTint`) + a status speech bubble; per-room floor accents, plants, soft shadows, and a
radial vignette add depth. No external asset pack. Grid size + canvas aspect ratio live in the Phaser-free
[`lib/office/dimensions.ts`](../../lib/office/dimensions.ts).

**Live data:** `use-office-agents.ts` fetches sessions + tasks via the typed client
(`getSessions`/`getTasks`) with the same `useApiData` pattern as the Sessions page,
so the gateway task-board WebSocket (via `<LiveData/>` → `invalidateData`) refetches
it automatically. `lib/office/agents.ts` maps `SessionSummary` → occupants and derives
the status palette from the Sessions page's `SESSION_STATUS_*` constants so
colours/labels match exactly. The board room fetches its own data (`getProjects` +
`getTasks` + `getMemories`) and lists the active projects (`lib/office/projects.ts`);
clicking one opens the full [`project-modal.tsx`](../project-modal.tsx) **portalled over
the office** (the URL stays `/office`) so plans, sources, tasks, and the project's memory
are all reachable without leaving the room.

**Bridge:** the scene and HUD never talk directly. The scene writes transient state
(`nearbyId`, `nearBoard`, `active`, `boardOpen`) into the Zustand store
(`lib/office-store.ts`) via the vanilla API (`useOfficeStore.getState()/.subscribe()`);
the HUD reads it through the hook, and `setAgents` (from the live-data hook) drives the
actors. Opening any panel disables Phaser's keyboard so typing/Escape go to React.

**Theme:** structural colours follow the app's light/dark theme — `lib/office/theme.ts`
`buildOfficePalette()` reads the CSS design tokens into Phaser ints and `office-game.tsx`
re-applies them to the scene (`applyPalette`) on `useTheme()` change. Each room also gets a
**per-room palette** (`ROOM_STYLES`): a translucent floor accent laid over the theme floor (so the
light/dark base still shows through), so every room reads as a distinct space. Each room is also
labelled by a **wall-mounted name plate** (Phase 9 A3, `roomSignStyle` + `buildLabels`): a rounded
sign board on the room's top wall whose **fill follows the theme** (redrawn on flip in `applyPalette`)
and whose **border + text** use the room accent. Decorative colours (furniture, avatars, highlight)
and status tints stay fixed.

> Requires the gateway running (`moon run gateway:dev` or `midnite serve`). With no
> gateway/active sessions the office shows empty furniture and an error toast.

## Desk interaction (wired to the gateway)

Walking up to a desk agent (E) opens a panel with two real actions, reusing the Sessions-page modals:

- **Call** → the agent's live session terminal (`SessionTerminalModal`) — enabled while the session is
  running/waiting.
- **Messages** → the agent's transcript (`SessionTranscriptModal`, fetched via `getSessionTranscript`).

`OfficeAgent` carries its `SessionSummary` so the panel can open these. The transcript modal is
portalled to `<body>` to escape the stage's `overflow-hidden` / any persisted page-reveal transform.

## Roadmap

The procedural pixel-art pass (sprites, walk animations + pathfinding, the board-room projects hub,
communal-area coffee break, desk Call/Messages wired to the gateway, status bubbles, shadows/vignette,
fixed-aspect layout), the **multi-room floor plan** (Phase 9 A1), and the **Agent pool** (Phase 9 G —
pool basin + animated water + lounging/occasional swims), **room signage** (Phase 9 A3 —
wall-mounted name plates), and **props, plants & decor** (Phase 9 B2 — several plants per room in three
species/sizes, framed wall art, and area rugs), and **communal furnishings** (Phase 9 E2 — chill-corner
couches + armchair, an astro-turf patch, and a gaming-corner carpet), and the **searchable library**
(Phase 9 C — bookshelf interactable → `LibraryModal` with search + category filter) have landed.
Remaining Phase 9 work — camera-follow (A2), the super-sized/interactable
TV/PlayStation + retro-games menu (E3–E4), the **corner-office** scene + desk toys (F),
distinct character art (B1), and an external Tiled map + LimeZu/Kenney pack — is tracked in
[todo/phase-9-office-visual-overhaul.md](../../../../todo/phase-9-office-visual-overhaul.md).
