# Phase 64 — Office multiplayer presence

> The office has always been single-player: agents bustle, but every human sees an empty floor.
> Phase 64 makes it **multiplayer** — teammates appear as live avatars walking the office,
> with name plates, minimap dots, an emote wheel, and locate/walk-to — the longest-deferred
> item in the tracker (explicitly out-of-scope since Phase 8). The grounding says the hard
> parts are mostly built: the gateway already tracks every socket with `{ userId, teamId }`
> ([`ws/connection-registry.ts`](../packages/gateway/src/ws/connection-registry.ts)), heartbeats
> reap dead connections ([`ws/heartbeat.service.ts`](../packages/gateway/src/ws/heartbeat.service.ts)),
> team-scoped broadcast exists ([`ws/ws-broadcast.service.ts`](../packages/gateway/src/ws/ws-broadcast.service.ts)),
> the client transport hook gives reconnect + status + a `send()` for free
> ([`hooks/use-reliable-subscription.ts`](../packages/web/hooks/use-reliable-subscription.ts)),
> and the 2D scene's `Actor` abstraction (sprite + shadow + name label + bubble + A* walking in
> [`office-scene.ts`](../packages/web/components/office/scenes/office-scene.ts)) can render remote
> humans almost wholesale. What's genuinely new: a **presence channel** (last-known-state, not
> the Phase-56 ring — replaying stale positions is wrong), a **scene→network position sampler**
> (the player's position never leaves Phaser today), and an **identity story that works with
> auth off** (the default local mode has anonymous sockets). Renders in **both engines** —
> the 2D Phaser office now, the Phase-63 three.js office when it lands.

> **Scope guardrails (CLAUDE.md).** Wire shapes are **zod in `shared`**
> ([`shared/src/events/`](../packages/shared/src/events/)) — a `presence` event union +
> client→server frame union (the [`terminal.ts`](../packages/shared/src/events/terminal.ts)
> bidirectional pattern) + a `PRESENCE_WS_PATH` constant; **no untyped payloads**. The gateway
> side is a thin [`gateway`-layered] module (`presence.gateway.ts` → `PresenceService`) with
> **zero DB** — presence is fully ephemeral, in-memory only, gone on restart by design; nothing
> for Drizzle, nothing for retention. It **reuses** `ConnectionRegistry` + `WsBroadcastService`
> and deliberately does **not** adopt the Phase-56 `ReliableBroadcastService` ring (wrong
> semantics for ephemeral state — a joiner gets a **snapshot**, not a replay). Web stays a pure
> WS client; the 2D office remains **behavior-preserving for solo use** (no teammates connected ⇒
> exactly today's office; existing specs run unedited). Position fan-out must respect the
> backpressure limit (`ws.maxBufferedBytes` closes laggards with `4014`) — coalesce server-side,
> never per-client-per-frame. Chat (Theme G) is a **stretch**: ephemeral bubbles, never
> persisted, no moderation machinery this phase.

> Effort tags: **S** small · **M** medium · **L** large. A→B→C is the spine; **D is blocked on
> Phase 63** (Themes A–C of it) — everything else is unblocked immediately; E/F build on C;
> G is stretch and may slip to a later phase without hurting this one; H runs throughout.

---

## Current state (what exists to build on)

- ✅ **Connection identity & scoping** — [`connection-registry.ts`](../packages/gateway/src/ws/connection-registry.ts)
  maps every socket → `{ userId, teamId }` (`byTeam`/`byUser`/`getAll`);
  [`tasks.gateway.ts`](../packages/gateway/src/tasks/tasks.gateway.ts) `resolveUserContext` shows
  the handshake JWT pattern (`?token=`, close `4001` on invalid). ❗ **Auth is off by default**
  ([`jwt.service.ts`](../packages/gateway/src/auth/jwt.service.ts) `enabled` ⇔
  `MIDNITE_JWT_SECRET`) — anonymous sockets are `{ null, null }` and only reachable via `toAll`.
- ✅ **Broadcast + liveness** — [`ws-broadcast.service.ts`](../packages/gateway/src/ws/ws-broadcast.service.ts)
  (`toTeam`/`toAll`, backpressure `4014`), [`heartbeat.service.ts`](../packages/gateway/src/ws/heartbeat.service.ts)
  (30s ping, coarse), [`ws-metrics.service.ts`](../packages/gateway/src/ws/ws-metrics.service.ts)
  (per-channel counters). ❌ No high-frequency coalescing/tick primitive — presence adds one.
- ✅ **Client transport** — [`use-reliable-subscription.ts`](../packages/web/hooks/use-reliable-subscription.ts):
  connect + token + reconnect/backoff + status ([`connection-store.ts`](../packages/web/lib/connection-store.ts))
  + a `send()` for client→server; [`terminal.ts`](../packages/shared/src/events/terminal.ts) is
  the existing client→server frame-union precedent (`input`/`resize` ≈ position pushes).
- ✅ **Rendering seams (2D)** — the `Actor` type + `createActor`/`walkActor`/`destroyActor`
  lifecycle in [`office-scene.ts`](../packages/web/components/office/scenes/office-scene.ts);
  sprite/tint/anim pipeline in [`lib/office/textures.ts`](../packages/web/lib/office/textures.ts)
  (human + robot variants); minimap already draws per-actor dots
  ([`lib/office/minimap.ts`](../packages/web/lib/office/minimap.ts) is pure geometry).
- ✅ **Surfaces to extend** — the dashboard **widget registry**
  ([`dashboard-widgets.ts`](../packages/web/lib/dashboard-widgets.ts)), the office HUD
  ([`office-hud.tsx`](../packages/web/components/office/office-hud.tsx) — its "N agents online"
  is *agent sessions*, not humans), Phase-43 preferences for the ghost-mode toggle.
- ❌ **Net-new:** the presence channel + service, the scene→network position sampler (player
  position lives only as `this.player.x/y` in Phaser), guest identity, remote-avatar rendering,
  emotes/locate, every surface. Avatar `playerVariant`/`playerTint` are **localStorage-only**
  (not in [`preferences.ts`](../packages/shared/src/preferences.ts)) — shipped in presence
  frames instead.

---

## Theme A — Presence contract + gateway service — **M** — ✅ DONE (PR #356, 2026-07-07)

The channel: typed frames up, coalesced state down, nothing stored.

- [x] **shared:** `PRESENCE_WS_PATH` (`/ws/presence`) + zod unions in
      [`shared/src/events/presence.ts`](../packages/shared/src/events/presence.ts) — client→server:
      `presence.hello { name, variant, tint, ghost }`, `presence.move { x, y, facing, scene }`,
      `presence.emote { emoji }`; server→client: `presence.snapshot { selfId, peers[] }` (on join,
      `selfId` lets clients filter their own echo), `presence.peer-updated { peers[] }`,
      `presence.peer-left { peerId }`, `presence.emote { peerId, emoji }` — discriminated `type`.
      *`presence.chat` deferred to the stretch Theme G.* (PR #356)
- [x] **gateway:** `presence/presence.module.ts` + `presence.gateway.ts` (thin — origin + JWT
      handshake reusing the [`tasks.gateway.ts`](../packages/gateway/src/tasks/tasks.gateway.ts)
      pattern, frame parsing) → `PresenceService`: an in-memory **last-known-state map** keyed by
      connection — **no DB, no ring**. (PR #356)
- [x] **Tick-coalesced fan-out:** a fixed server tick (~10Hz, config `presence.tickMs`) batches all
      dirty renderable peers into one `peer-updated` frame per scope per tick. Fan-out uses the
      service's **own** scoped socket set via `WsBroadcastService.toAll` (not the shared
      `ConnectionRegistry`, which mixes task/terminal/presence sockets) — presence frames never leak
      cross-channel, and the `4014` backpressure guard still applies. (PR #356)
- [x] **Join/leave lifecycle:** on join → scope snapshot of current renderable peers; on
      `handleDisconnect` **or** a stale-silence timeout (config `presence.staleMs`, under the 30s
      heartbeat) → `peer-left`; ghost peers held in the map but **excluded from snapshots/updates/
      emotes**. (PR #356)
- [x] **Hybrid identity:** JWT on → verified email overrides a forged hello name + team-scopes
      broadcast (peerId `user:<id>`); JWT off (local default) → guest hello trusted, global scope.
      Duplicate connections from one user coalesce to the newest socket. (PR #356)

## Theme B — Client presence store + sampler — **M** — ✅ DONE (PR #358, 2026-07-07)

Engine-agnostic state so 2D and 3D are just two renderers of one slice.

- [x] **`lib/presence-store.ts`:** a vanilla Zustand store (the
      [`office-store.ts`](../packages/web/lib/office-store.ts) pattern) — `peers` by peerId
      (`{ name, variant, tint, x, y, facing, scene, emote?, lastUpdate }`, world-pixel coords) +
      `self`/`connected`/`ghost`, **no Phaser/three imports**; the office store stays untouched.
      Frame reduction lives in the pure `presence-frames.ts` `reducePresence` (filters the client's
      own peerId out of snapshot/peer-updated, preserves a live emote across a move). (PR #358)
- [x] **`hooks/use-presence.ts`:** rides [`use-reliable-subscription.ts`](../packages/web/hooks/use-reliable-subscription.ts)
      as a **snapshot channel** (no ring/resume — presence is last-known-state); decodes frames into
      the store; sends `hello` on connect (+ on avatar/ghost change); exposes `sendMove` /
      `sendEmote` — `sendMove` **throttled ~10Hz + dedup'd + idle keepalive** (`shouldSendMove`,
      under the 15s server stale timeout); resets on unmount. (PR #358)
- [x] **Guest identity:** `lib/presence-identity.ts` — stable guest id + display name in
      localStorage with a friendly generated default; the controlled
      [`presence-name-dialog.tsx`](../packages/web/components/office/presence-name-dialog.tsx) is the
      first-visit prompt; avatar `variant`/`tint` read from the office store, shipped in the hello
      (re-sent on picker change). (PR #358)
- [x] **Interpolation buffer:** per-peer target-position smoothing (frame-rate-independent lerp;
      snap on scene change or large jumps) in the pure `lib/presence-interp.ts` helper —
      unit-testable, shared by both renderers. (PR #358)

## Theme C — 2D renderer (Phaser office) — **M** — ✅ DONE (PR #361, 2026-07-07)

- [x] **Remote avatars as Actors:** the reusable `PeerLayer`
      ([`peer-layer.ts`](../packages/web/components/office/scenes/peer-layer.ts)) diffs the presence
      store's peers each frame (create/update/destroy) into
      [`office-scene.ts`](../packages/web/components/office/scenes/office-scene.ts) — sprites with
      the peer's variant/tint ([`textures.ts`](../packages/web/lib/office/textures.ts) pipeline),
      always-on name plates, eased toward the reported position via the shared `interpStep`, with a
      distance-driven 2-frame step cycle (no anim-system dependency). The player's position is
      published each frame via a non-React bridge (`presence-bridge.ts`) that the `use-presence`
      hook's throttled `sendMove` registers with. (PR #361)
- [x] **Scene scoping:** peers render only in the scene they're in (`office`/`corner`); the
      corner-office scene instantiates the same `PeerLayer`; teardown respects the `alive` guard +
      destroys the layer. (PR #361)
- [x] **Minimap dots:** remote peers as distinct cyan dots via `worldToMinimap` — visible across
      rooms even when the avatar isn't. (PR #361)
- [x] **Solo-preserving:** with zero peers the scene renders byte-for-byte today's behavior; existing
      office specs pass unedited. First-visit guests get a name prompt; `use-presence` mounts in the
      2D office view. (PR #361)

## Theme D — 3D renderer (three.js office) — **M** · ⛔ blocked on [Phase 63](phase-63-office-3d.md) A–C

- [ ] **Remote low-poly figures:** a `presence-avatars.tsx` r3f component rendering peers from
      the same store slice — Phase-63 low-poly figures (variant/tint) + billboarded name plates,
      walking via the shared interpolation helper.
- [ ] **Emote bubbles + minimap parity:** emotes as billboarded sprites over 3D avatars; peers
      on the Phase-63 minimap HUD.
- [ ] **Frustum-friendly:** peer meshes participate in Phase 63's room-chunk visibility rules
      (a peer in an unseen room costs no draw calls; the minimap still shows them).

## Theme E — Emotes + locate — **M**

- [ ] **Emote wheel:** a small radial/row picker in the office HUD (keyboard shortcut + button)
      — 👋 👍 ☕ 🎉 ❓ etc.; sends `presence.emote`; renders as an ephemeral bubble (reusing the
      `Actor.bubble` object in 2D; billboard in 3D) with a short TTL and per-peer rate limit.
- [ ] **Roster:** the HUD gains a "teammates here" list (name, avatar chip, room) — the human
      counterpart to the existing agent count.
- [ ] **Locate / walk-to:** clicking a roster entry (or their minimap dot) auto-walks your player
      to that teammate — reusing the existing A* click-to-walk (`walkTo`) in 2D; in 3D, a
      waypoint marker + optional auto-walk via the Phase-63 rig.
- [ ] **Self-view:** your own ghost/connected state visible in the roster; emotes you send
      render over your own avatar too.

## Theme F — Surfaces & privacy — **S-M**

- [ ] **Nav/topbar pill:** a compact "N in the office" indicator (avatar chips, hidden at zero)
      in the app chrome linking to `/office` — driven by a lightweight subscription (or the
      roster store when the office is already mounted).
- [ ] **Dashboard widget:** a "Who's in the office" widget registered in
      [`dashboard-widgets.ts`](../packages/web/lib/dashboard-widgets.ts) (existing picker/sizing
      conventions) — online teammates + their room, live.
- [ ] **Ghost mode:** a HUD toggle — you still see everyone, nobody sees you (`hello.ghost`,
      server-side exclusion so it's not client-cosmetic); persisted via a Phase-43 preference
      key; clearly indicated on your own HUD while active.

## Theme G — Proximity chat bubbles — **M** · *stretch (may slip without hurting the phase)*

- [ ] **Ephemeral bubbles:** a short text input (opened via the HUD/keyboard, using the existing
      panel keyboard-disable contract) sending `presence.chat`; rendered as speech bubbles over
      the sender **only for peers within a proximity radius** (server sends to the team; clients
      radius-filter for display) with a short TTL; **never persisted anywhere**.
- [ ] **Input hygiene:** length cap + simple rate limit server-side; bubble text sanitized
      (plain text only); chat input focus fully suppresses scene keys (existing store mechanism).
- [ ] **2D first:** bubbles ride `Actor.bubble` in Phaser; the 3D billboard variant lands with
      Theme D if both are in flight, else follows.

## Theme H — Tests & hardening — **S-M**

- [ ] **Gateway specs:** `PresenceService` unit tests — hello/identity resolution in both auth
      modes, snapshot-on-join, tick coalescing (N moves → 1 frame per tick), stale-timeout
      departure, ghost exclusion, duplicate-connection coalescing, chat rate limit (fakes, no
      `@nestjs/testing`).
- [ ] **Contract tests:** shared zod unions round-trip (snapshot the WS event shapes, the house
      convention); the client hook decodes every server frame type.
- [ ] **Pure-helper units:** interpolation buffer (lerp/snap rules), throttle/dedup sampler —
      alongside-file Vitest.
- [ ] **Flow smoke:** Playwright with **two browser contexts** on `/office` — both see each
      other's avatar, an emote propagates, ghost mode hides one from the other; plus a
      solo-regression check (no peers ⇒ existing office specs unedited and green).

---

## Files this phase touches (map)

- **New (shared):** `presence.ts` event unions + `PRESENCE_WS_PATH` in
  [`shared/src/events/`](../packages/shared/src/events/) (re-exported from
  [`index.ts`](../packages/shared/src/index.ts))
- **New (gateway):** `presence/` module — `presence.module.ts`, `presence.gateway.ts`,
  `presence.service.ts` (+ specs) — registered in `AppModule`; config keys
  (`presence.tickMs`, `presence.staleMs`) via the shared config schema
- **Reuse (gateway):** [`ws/connection-registry.ts`](../packages/gateway/src/ws/connection-registry.ts),
  [`ws/ws-broadcast.service.ts`](../packages/gateway/src/ws/ws-broadcast.service.ts),
  [`ws/heartbeat.service.ts`](../packages/gateway/src/ws/heartbeat.service.ts),
  [`ws/ws-metrics.service.ts`](../packages/gateway/src/ws/ws-metrics.service.ts) (presence
  channel counters) — **not** `reliable-broadcast.service.ts` (deliberate)
- **New (web):** `lib/presence-store.ts`, `lib/presence-interp.ts`, `hooks/use-presence.ts`,
  the guest-name dialog, emote wheel + roster HUD pieces, `office3d` `presence-avatars.tsx`
  (Theme D), the nav pill + dashboard widget (+ `.test` siblings)
- **Edit (web):** [`office-scene.ts`](../packages/web/components/office/scenes/office-scene.ts)
  + [`corner-office-scene.ts`](../packages/web/components/office/scenes/corner-office-scene.ts)
  (remote-actor diff + position sampler hook-in),
  [`office-hud.tsx`](../packages/web/components/office/office-hud.tsx) (roster, emote wheel,
  ghost toggle), [`dashboard-widgets.ts`](../packages/web/lib/dashboard-widgets.ts), the app
  chrome (nav pill), the Phase-43 preference bag (ghost-mode key)
- **Zero DB / zero migrations** — presence is ephemeral by design

---

## Verification

- [ ] **Two humans, one office:** two browsers on `/office` see each other walk in real time
      (smooth interpolation, correct variant/tint/name), across room changes and the corner-
      office scene switch; closing a tab removes the avatar promptly (well under 30s).
- [ ] **Identity both ways:** with auth off, guest names/avatars flow and everyone shares the
      global scope; with JWT on, names come from the verified user, presence is team-scoped
      (team A never sees team B), and a forged hello name is ignored.
- [ ] **No replay of stale state:** a joiner receives a current snapshot only; reconnect never
      renders ghost trails of old positions.
- [ ] **Coalescing holds:** N clients moving simultaneously produce ≤ 1 presence frame per team
      per tick (verified in specs + `GET /ws/metrics`); no socket hits the `4014` backpressure
      close under a realistic load test.
- [ ] **Social:** emotes render over the right avatar in both connected clients with TTL + rate
      limit; locate walks the player to the teammate via A*; the roster matches reality.
- [ ] **Ghost mode:** enabling it removes you from others' offices/rosters/widgets server-side
      (verified from the second client) while you still see everyone; the state persists via
      preferences.
- [ ] **Surfaces:** the nav pill and dashboard widget show live counts/rooms and clear at zero.
- [ ] **Solo regression:** with no peers, the office behaves exactly as before — existing office
      specs pass unedited.
- [ ] `moon run :typecheck` · `:lint` · `:test` green (shared contract snapshots; gateway
      presence specs; web store/interp/hook units; two-context Playwright smoke; **web tests from
      the primary checkout or a `.worktrees/` worktree, never under `.git/`**).

---

## Decisions / open questions

1. **Last-known-state, not the Phase-56 ring** *(settled — design).* Presence is ephemeral: a
   joiner needs a snapshot, not a replay; stale-position replay is actively wrong. The presence
   service keeps its own in-memory map and uses the raw `WsBroadcastService`; the reliable layer
   stays for board data.
2. **Hybrid identity** *(settled — user call).* Guest hello (name prompt + persisted local id +
   variant/tint) trusted in the no-auth local-only default; JWT-verified identity + team scoping
   override it when auth is on. Guest trust is acceptable precisely because no-auth is documented
   as local-only.
3. **Both engines in this phase** *(settled — user call).* The protocol/store are engine-agnostic;
   2D (Theme C) is unblocked now, 3D (Theme D) is **blocked on Phase 63 A–C** — the phase is
   expected to complete after Phase 63 lands, but `/exec` can build A/B/C/E/F/H immediately.
4. **Social scope: emotes + locate committed; chat is stretch** *(settled — user call).* Theme G
   can slip to a later phase without hurting this one; if it slips, mark it `⏳` rather than
   blocking the phase.
5. **Tick + rates** *(recommend).* Client sends moves throttled to ~10Hz (dedup'd when idle);
   server broadcasts one coalesced frame per team per ~100ms tick; client lerps between samples.
   Config-tunable (`presence.tickMs`/`presence.staleMs`); revisit only if metrics show need.
6. **Ghost mode semantics: asymmetric** *(recommend).* You see others; they don't see you —
   enforced server-side (excluded from snapshots/updates), not client-cosmetic. Indicated on
   your own HUD so it's never ambiguous.
7. **Avatar identity ships in frames, not preferences** *(recommend).* `playerVariant`/`playerTint`
   stay localStorage-backed and travel in the hello frame — no `UserPreferencesSchema` change for
   avatars (only the ghost-mode key is added). Server-synced avatars can ride a later phase if
   cross-device identity starts to matter.
8. **Out of scope** *(settled).* Any persistence of positions/chat/history (zero DB), voice/AV,
   cross-instance or federated presence, moderation tooling beyond length/rate caps, mobile/touch,
   and "follow" camera modes.
