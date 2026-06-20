# `/office` — pixel-art interactive office

A walkable, zoned office. The **player** (a human avatar) roams while each **live
midnite agent** (gateway session) appears as a little **robot**: working agents sit
at **hot desks** (walk up to call/message them), idle agents chill in the **lounge**
(TV + console + couches), and a walled **board room** lets you browse the plans /
documents for a project. Everything updates in real time as agents start, change
status, and finish — and robots walk between the lounge and a desk when their status
flips.

## Architecture

```
app/(main)/office/page.tsx
  └─ <OfficeView>                office-view.tsx — dynamic(ssr:false) wrapper (keeps Phaser client-only)
       └─ <OfficeViewImpl>       office-view-impl.tsx — relative stage box; runs useOfficeAgents()
            ├─ <OfficeGame>      office-game.tsx — mounts/destroys the Phaser game (StrictMode-safe)
            │    └─ OfficeScene  scenes/office-scene.ts — tiles/sprites, zones, movement, collision, actors
            └─ <OfficeHud>       office-hud.tsx — controls hint, online count, proximity prompts, panels
                 ├─ InteractionPanel   call/message a desk agent (mock)
                 └─ <BoardroomPanel>   boardroom-panel.tsx — project filter + document list
                      └─ <DocumentModal>  document-modal.tsx — read-only MarkdownPreview of a doc
```

**Zones** ([`lib/office/layout.ts`](../../lib/office/layout.ts) — Phaser-free floor plan): the left
half is open-plan **hot desks** (work) over a **lounge** (TV + console + coffee station); the right
half is a walled **board room** (doorway in the partition). `office-scene.ts` seats **working** agents
(`status !== 'idle'`) at desks and **idle** agents on lounge couches/armchairs, where they **sleep**
(animated `zzz`) or **game** (`▶`, facing the TV) split by id. When an agent's status flips it **walks**
there — 4-directional A* over a walkability grid (`blockedGrid()`) so it routes around furniture/walls.

**Controls:** WASD/arrows or **click-to-walk** (the player pathfinds to the clicked tile; manual input
cancels it). **E** interacts with the nearest desk agent or the board-room whiteboard.

**Art:** sprites/tiles are **generated procedurally** in [`lib/office/textures.ts`](../../lib/office/textures.ts)
— a tiled floor, brick walls, desks/monitors, couches, a TV + console, a conference table, a documents
whiteboard, plus two character kinds: a **human** player and **robot** agents (16×20, down/up/side, a
2-frame walk cycle). Agents get a deterministic identity tint (`agentTint`) + a status speech bubble;
soft shadows, rugs, plants, and a radial vignette add depth. No external asset pack. Grid size + canvas
aspect ratio live in the Phaser-free [`lib/office/dimensions.ts`](../../lib/office/dimensions.ts).

**Live data:** `use-office-agents.ts` fetches sessions + tasks via the typed client
(`getSessions`/`getTasks`) with the same `useApiData` pattern as the Sessions page,
so the gateway task-board WebSocket (via `<LiveData/>` → `invalidateData`) refetches
it automatically. `lib/office/agents.ts` maps `SessionSummary` → occupants and derives
the status palette from the Sessions page's `SESSION_STATUS_*` constants so
colours/labels match exactly. The board room fetches its own data (`getProjects` +
`getMemories`); `lib/office/documents.ts` assembles each project's **plan** + scoped
**memories** into the document list.

**Bridge:** the scene and HUD never talk directly. The scene writes transient state
(`nearbyId`, `nearBoard`, `active`, `boardOpen`) into the Zustand store
(`lib/office-store.ts`) via the vanilla API (`useOfficeStore.getState()/.subscribe()`);
the HUD reads it through the hook, and `setAgents` (from the live-data hook) drives the
actors. Opening any panel disables Phaser's keyboard so typing/Escape go to React.

**Theme:** structural colours follow the app's light/dark theme — `lib/office/theme.ts`
`buildOfficePalette()` reads the CSS design tokens into Phaser ints and `office-game.tsx`
re-applies them to the scene (`applyPalette`) on `useTheme()` change. Decorative colours
(furniture, avatars, highlight) and status tints stay fixed.

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

The procedural pixel-art pass (human + robot sprites, walk animations, lounge/board-room zones, the
board-room document viewer, desk Call/Messages wired to the gateway, status bubbles, shadows/vignette,
fixed-aspect layout) has landed. Remaining work — an external Tiled map + LimeZu/Kenney pack, richer
per-status body animations, grid pathfinding, and click-to-walk — is tracked in
[todo/phase-8-office-fidelity.md](../../../../todo/phase-8-office-fidelity.md).
