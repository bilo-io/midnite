# `/office` — pixel-art interactive office

A walkable, **multi-room** office. The **player** (a human avatar) roams between six rooms
while each **live midnite agent** (gateway session) appears as a little **robot**: working
agents sit at **hot desks** in the work room (walk up to call/message them), idle agents chill
in the **lounge** (TV + console + couches), the **kitchen** lets you take a coffee break, the
**board room** is the **projects hub** (walk up to open the live project list), the **library**
holds bookshelves, and a door leads to a **corner office**. Everything updates in real time as
agents start, change status, and finish — and robots walk between the lounge and a desk when
their status flips.

## Architecture

```
app/(main)/office/page.tsx
  └─ <OfficeView>                office-view.tsx — dynamic(ssr:false) wrapper (keeps Phaser client-only)
       └─ <OfficeViewImpl>       office-view-impl.tsx — relative stage box; runs useOfficeAgents()
            ├─ <OfficeGame>      office-game.tsx — mounts/destroys the Phaser game (StrictMode-safe)
            │    └─ OfficeScene  scenes/office-scene.ts — tiles/sprites, zones, movement, collision, actors
            └─ <OfficeHud>       office-hud.tsx — controls hint, online count, proximity prompts, panels
                 ├─ InteractionPanel   call/message a desk agent (mock)
                 └─ <BoardroomPanel>   boardroom-panel.tsx — live project list (the projects hub)
                      └─ <ProjectModal>  project-modal.tsx — reused as-is, portalled over the office
```

**Rooms** ([`lib/office/layout.ts`](../../lib/office/layout.ts) — Phaser-free floor plan): a 34×22 grid
split by internal walls into **six rooms** in a 3×2 arrangement — a top band (**work** hot desks ·
**board room** · **library**) over a bottom band (**lounge** · **kitchen** · **corner office**) —
connected by 2-tile doorways in every shared wall, so the whole map is one connected walkable space
(`ROOMS` describes each room's interior rect + label). `office-scene.ts` seats **working** agents
(`status !== 'idle'`) at desks and **idle** agents on lounge couches/armchairs, where they **sleep**
(animated `zzz`) or **game** (`▶`, facing the TV) split by id. When an agent's status flips it **walks**
there — 4-directional A* over a walkability grid (`blockedGrid()`) so it routes around furniture/walls
and through the doorways. (Camera-follow for the larger map is Phase 9 A2; the corner office becomes a
separate scene in Phase 9 F; the library bookshelf becomes a searchable modal in Phase 9 C.)

**Controls:** WASD/arrows or **click-to-walk** (the player pathfinds to the clicked tile; manual input
cancels it). **E** interacts with the nearest desk agent, the board-room whiteboard, or the kitchen
coffee machine — at the kitchen **E** toggles an "on a break" state (a `☕ On a break` badge in the HUD +
a ☕ over the player). The break flag is local/mock for now (Phase 9 E1).

**Art:** sprites/tiles are **generated procedurally** in [`lib/office/textures.ts`](../../lib/office/textures.ts)
— a tiled floor, brick walls, desks/monitors, couches, a TV + console, a conference table, a projects
whiteboard, kitchen counter, bookshelves, a corner-office door, plus two character kinds: a **human**
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
light/dark base still shows through) + an accent colour for its label, so every room reads as a
distinct space. Decorative colours (furniture, avatars, highlight) and status tints stay fixed.

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
kitchen coffee break, desk Call/Messages wired to the gateway, status bubbles, shadows/vignette,
fixed-aspect layout) and the **multi-room floor plan** (Phase 9 A1) have landed. Remaining Phase 9 work —
camera-follow (A2), the searchable **library** modal (C), the **corner-office** scene + desk toys (F),
distinct character art (B), and an external Tiled map + LimeZu/Kenney pack — is tracked in
[todo/phase-9-office-visual-overhaul.md](../../../../todo/phase-9-office-visual-overhaul.md).
