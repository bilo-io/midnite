# `/office` — pixel-art interactive office

A walkable office where the player avatar moves around and each **live midnite
agent** (gateway session) sits at a desk. Walking up to a desk opens a React panel
to call/message that agent and see what they're up to. Desks update in real time as
agents start, change status, and finish.

## Architecture

```
app/(main)/office/page.tsx
  └─ <OfficeView>                office-view.tsx — dynamic(ssr:false) wrapper (keeps Phaser client-only)
       └─ <OfficeViewImpl>       office-view-impl.tsx — relative stage box; runs useOfficeAgents()
            ├─ <OfficeGame>      office-game.tsx — mounts/destroys the Phaser game (StrictMode-safe)
            │    └─ OfficeScene  scenes/office-scene.ts — tilemap, movement, collision, desk slots
            └─ <OfficeHud>       office-hud.tsx — controls hint, online count, proximity prompt, panel
```

**Live data:** `use-office-agents.ts` fetches sessions + tasks via the typed client
(`getSessions`/`getTasks`) with the same `useApiData` pattern as the Sessions page,
so the gateway task-board WebSocket (via `<LiveData/>` → `invalidateData`) refetches
it automatically. `lib/office/agents.ts` maps `SessionSummary` → desk occupants and
derives the status palette from the Sessions page's `SESSION_STATUS_*` constants so
colours/labels match exactly.

**Desks:** `office-scene.ts` defines a fixed set of `DESK_SLOTS`; live agents fill
them in order (most-recently-active first). Empty slots show an unoccupied desk.

**Bridge:** the scene and HUD never talk directly. The scene writes transient state
(`nearbyId`, `active`) into the Zustand store (`lib/office-store.ts`) via the vanilla
API (`useOfficeStore.getState()/.subscribe()`); the HUD reads it through the hook,
and `setAgents` (from the live-data hook) drives the desks. Opening the panel
disables Phaser's keyboard so typing goes to the message box.

**Theme:** structural colours follow the app's light/dark theme — `lib/office/theme.ts`
`buildOfficePalette()` reads the CSS design tokens into Phaser ints and `office-game.tsx`
re-applies them to the scene (`applyPalette`) on `useTheme()` change. Decorative colours
(desk, screen, avatar, highlight) and status tints stay fixed.

> Requires the gateway running (`moon run gateway:dev` or `midnite serve`). With no
> gateway/active sessions the office shows empty desks and an error toast.

## Still mock / not yet wired

- **Call / Message** are mock UI — not yet sending anything to the gateway.

## Roadmap

Higher-fidelity work — a real Tiled map + LimeZu/Kenney sprites (replacing the procedural
blobs), walk animations, status-driven liveliness, and wiring Call/Message to the gateway —
is tracked in [todo/phase-8-office-fidelity.md](../../../../todo/phase-8-office-fidelity.md).
