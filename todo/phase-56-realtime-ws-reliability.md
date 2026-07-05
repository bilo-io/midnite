# Phase 56 — Real-time / WebSocket Reliability (no silent drift)

> midnite is a live product — the kanban board, the office, the embedded terminals, and the new
> cockpits (session detail P51, project detail P55, in-app diff review P52) all update over
> WebSockets. But the grounding is blunt: **only the terminal WS is actually reliable.** It stamps
> every frame with a `seq` and replays a ring buffer on reconnect. Every **board channel** — tasks,
> ideas, workflows, approvals — is **fire-and-forget**: no sequence numbers, no replay, no
> gap-detection, no backpressure, no heartbeat. A client that drops for even a second **silently
> loses** every event published in that window, and because the web ships with
> `refetchOnWindowFocus: false` + `staleTime: 0`, the board **stays stale until the user happens to
> click something**. A missed `task.updated`, a lost `guardrails.updated`, an out-of-order workflow
> node — all leave the UI quietly wrong. Phase 56 **generalizes the terminal's proven pattern** to
> every board channel so clients never silently diverge from gateway truth.

> **Scope guardrails (CLAUDE.md).** No new domain — a **shared reliability layer** under the
> existing WS gateways. Sequence + ring + resume is **lifted from the terminal WS** (already in
> [`terminal.service.ts`](../packages/gateway/src/terminal/terminal.service.ts) /
> [`use-terminal-socket.ts`](../packages/web/hooks/use-terminal-socket.ts)) into a **shared
> reliable-broadcast module** the tasks/ideas/workflows/approvals gateways delegate to — not
> reinvented per feature. Event envelopes gain `seq`/`ts` as **zod schemas in
> [`shared/src/events/`](../packages/shared/src/events/)** (the discriminated unions stay). The
> **single `TaskEventBus` → gateway → `WsBroadcastService`** publish path is preserved; seq
> allocation + the ring sit in the broadcast layer. Team/run scoping
> ([`ws-broadcast.service.ts`](../packages/gateway/src/ws/ws-broadcast.service.ts) `toTeam`/`byRun`)
> is **respected** — a ring per scoped channel. The client side unifies the per-feature hooks
> (`use-task-events`, `use-idea-events`, …) onto **one** reliable subscription hook. Fail-safe: a
> replay that can't cover the gap **tells the client to full-resync** rather than leaving it stale.
> The ring is **in-memory** — a gateway restart forces a resync (correct; dovetails with Phase 54's
> graceful shutdown).

> Effort tags: **S** small · **M** medium · **L** large. **A** (seq + server ring) is the
> foundation; **B** (resume + gap→resync) is the core guarantee; **C** (backpressure + heartbeat)
> hardens the transport; **D** (one client hook) consumes A–C; **E** applies it everywhere + shows
> connection state; **F** aligns the terminal. A→B→C → D → E; F is opportunistic.

---

## Current state (strengths ✅ and gaps ❌)

- **Event contracts** — [`shared/src/events/task.ts`](../packages/shared/src/events/task.ts)
  `TaskBoardEventSchema` (discriminated `type`): `task.created`/`updated`/`deleted`,
  `tasks.bulkCreated`, `agent.activity`, `agent.attention`, `guardrails.updated`; plus
  [`idea.ts`](../packages/shared/src/events/idea.ts) + [`workflow.ts`](../packages/shared/src/events/workflow.ts).
  ❌ Events carry only `at: string` (decoration) — **no `seq`, no ordering/version field.**
- **Publish path** — [`tasks/task-event-bus.ts`](../packages/gateway/src/tasks/task-event-bus.ts)
  (`emit` → synchronous in-process fan-out) → [`tasks.gateway.ts`](../packages/gateway/src/tasks/tasks.gateway.ts)
  `broadcast()` → [`ws/ws-broadcast.service.ts`](../packages/gateway/src/ws/ws-broadcast.service.ts)
  (`toTeam`/`toAll`, `trySend` skips non-OPEN sockets). In-process ordering is fine; **cross-client
  delivery is fire-and-forget.**
- **WS gateways** — `/ws/terminal` ([`terminal.gateway.ts`](../packages/gateway/src/terminal/terminal.gateway.ts)),
  `/ws/tasks` ([`tasks.gateway.ts`](../packages/gateway/src/tasks/tasks.gateway.ts)), `/ws/ideas`,
  `/ws/workflows` (per-`runId`), `/ws/approvals` (snapshot-on-connect). Subscribe = client sends
  `{ type: 'subscribe' }`; server adds the socket to a `Set`.
- ✅ **Terminal reliability** — `TerminalOutputMessage.seq` + a **ring buffer replayed on reattach**;
  client [`use-terminal-socket.ts`](../packages/web/hooks/use-terminal-socket.ts) dedups on `lastSeqRef`.
  **The pattern to generalize.**
- ✅ **Approvals** — replays the *current pending snapshot* on connect (not a historical log).
- ❌ **Board replay/gap-detection** — none. A reconnecting `/ws/tasks` (and ideas/workflows) client
  gets **only new events**; anything published during the disconnect is **lost**.
- **Client cache** — [`use-task-events.ts`](../packages/web/hooks/use-task-events.ts) validates then
  calls `invalidateData()` (full `queryClient.invalidateQueries()`), except ephemeral
  `agent.activity`/`attention`/`guardrails.updated`; exponential reconnect backoff. But
  [`query-client.ts`](../packages/web/lib/query-client.ts): `staleTime: 0`, `retry: false`,
  **`refetchOnWindowFocus: false`** — so a missed event has **no autopilot recovery.**
- ❌ **No backpressure** (slow client → dropped/ out-of-order sends), ❌ **no heartbeat** (dead
  connections detected only on TCP timeout).

---

## Theme A — Sequenced event contracts + server event ring — **M-L** — ✅ DONE (PR #305, 2026-07-05)

Give every board event an identity and remember the recent ones.

- [x] **shared:** add a `seq: number` (monotonic per channel) + `ts: number` (ms, for ordering) to the
      board-event envelope in [`events/task.ts`](../packages/shared/src/events/task.ts),
      [`idea.ts`](../packages/shared/src/events/idea.ts), [`workflow.ts`](../packages/shared/src/events/workflow.ts)
      — a shared `SequencedEnvelope` wrapper; the discriminated `type` unions are unchanged.
- [x] **gateway:** a **bounded event ring per scoped channel** in a new `ReliableBroadcastService`
      (wrapping [`ws-broadcast.service.ts`](../packages/gateway/src/ws/ws-broadcast.service.ts)) — keyed by
      channel + scope (tasks/ideas per **team**, workflows per **run**), holding the last N events with their
      seq. Monotonic seq allocation lives here.
- [x] Publishers are **unchanged** — `TaskEventBus.emit` still fires; the gateway stamps seq + appends to the
      ring on the way out. Config: ring size + retention (`ws.ringSize`).

---

## Theme B — Resume protocol + gap-detection — **L**

Replay what a client missed; when you can't, tell it to resync. The core guarantee.

- [ ] **Protocol:** subscribe carries `{ type: 'subscribe' | 'resume', lastSeq? }`. On **resume**, the gateway
      replays ring events with `seq > lastSeq`, then streams live; a **fresh subscribe** returns the current seq
      **watermark** so the client anchors.
- [ ] **Gap-detection:** if `lastSeq` is older than the ring's oldest retained seq (the gap exceeds the buffer),
      the gateway emits **`{ type: 'resync-required' }`** → the client does a **full refetch** (invalidate) rather
      than applying a partial, drift-prone stream. No silent gaps.
- [ ] **Client dedup:** track `lastSeq` per channel and drop already-applied events (mirrors the terminal's
      `lastSeqRef`), so replay + live overlap is idempotent.

---

## Theme C — Per-client backpressure + heartbeat — **M** — ✅ DONE (PR #315, 2026-07-05)

Protect the gateway from slow clients; detect dead ones fast.

- [x] **Backpressure** in the send chokepoint (`WsBroadcastService.trySend`): a socket whose outbound buffer
      exceeds `ws.maxBufferedBytes` (default 1MB) is **dropped to resync** — closed with **4014** so it reconnects
      and full-resyncs — rather than blocking the broadcast or buffering unboundedly. (Uses the `ws` lib's own
      outbound buffer as the signal; ordering preserved since we never reorder, only drop.)
- [x] **Heartbeat:** a single `HeartbeatService` pings every live socket (`ConnectionRegistry.getAll()`) every
      `ws.heartbeatMs` (30s); a socket that misses `ws.maxMissedPongs` (2) consecutive pongs is `terminate()`d,
      freeing the slot. **No client change:** browsers auto-answer protocol pings, and the existing onclose backoff
      reconnects when the server closes a dead/backpressured socket. (Resume-with-`lastSeq` on reconnect is Theme B.)
- [x] Metrics: `WsMetricsService` — per-channel subscriber count (reported by the tasks/ideas/workflows gateways),
      dropped-to-resync + dead-clients-reaped counters, ring-hit vs. resync-required (0 until Theme B). `GET /ws/metrics`.

---

## Theme D — Shared reliable client subscription hook — **M** — ✅ DONE (PR #316, 2026-07-05)

One resilient subscription, not four ad-hoc ones.

- [x] **web:** `useReliableSubscription(channel, handlers, enabled?)` — transport-only (connect, exponential-backoff
      reconnect, per-channel decode, `lastSeq` tracking, `send`). Migrated [`use-task-events.ts`](../packages/web/hooks/use-task-events.ts),
      [`use-idea-events.ts`](../packages/web/hooks/use-idea-events.ts), and [`use-approvals-socket.ts`](../packages/web/hooks/use-approvals-socket.ts)
      onto it. **Resume-safe:** still sends plain `{type:'subscribe'}` — the `resume`/`resync-required` handling
      pairs with **Theme B's** server protocol (not merged; sending `resume` now would break against today's
      gateways), so it's a one-line flip once B lands; `lastSeq` is already tracked. ⏳ **use-workflow-run** stays
      bespoke — its imperative start→subscribe→poll-fallback→terminal-cleanup lifecycle doesn't fit the declarative
      hook (folding it in would lose its REST poll fallback); it already consumes the 56 A envelope.
- [x] **Per-event-type cache strategy** — lives in each channel's `onEvent` (the hook is transport-only): `task.*`
      → invalidate board; `agent.activity`/`attention`/`guardrails.updated` → skip (ephemeral, own consumers);
      workflow `node.*` → patched in `use-workflow-run`'s reducer.
- [x] **Fallback** already in place: `refetchOnWindowFocus: true` + `staleTime: 5s` in `query-client` (Phase 57 E),
      so a long-backgrounded tab self-heals on refocus.

---

## Theme E — Apply across cockpits + connection-status UI — **M**

Make every live surface resilient, and make the connection legible.

- [ ] Wire `useReliableSubscription` into the **board**, the **office**, and the cockpit views — **session detail
      (P51)**, **project detail (P55)**, **in-app diff review (P52)** — so their live panels resume/resync instead
      of drifting.
- [ ] A shared **connection-status indicator** (`live` / `reconnecting` / `stale — refreshing`) surfaced in the app
      chrome + on cockpit panels, driven by the hook's state, so users know when data may be behind.
- [ ] A brief **"reconnected — resynced"** affordance after a `resync-required` full refetch, so a sudden board
      refresh isn't mysterious.

---

## Theme F — Terminal WS alignment (opportunistic) — **S** — ✅ DONE (PR #311, 2026-07-05)

Fold the one channel that already works onto the shared vocabulary.

- [x] Aligned the terminal's seq/replay with the shared vocabulary: output frames now carry the
      `SequencedEnvelope` identity (`seq` + `ts`, flattened with the `type` tag since this socket multiplexes
      sequenced output with un-sequenced control messages), and a new `resume` client message carries `lastSeq`
      (mirrors the board channels' subscribe/resume split).
- [x] Covered the edge case: on a `resume`, if the ring rolled past the client's `lastSeq` (oldest retained
      seq > lastSeq + 1), the gateway sends **`resync-required`** (`reason` + `fromSeq`) instead of a silent
      partial replay; the client clears its screen, drops its `lastSeq`, and re-renders from the fresh ring.

---

## Files this phase touches (map)

- **New/edit (shared):** a `SequencedEnvelope` (+ `seq`/`ts`) + `resume`/`resync-required`/heartbeat message shapes
  in [`events/`](../packages/shared/src/events/) (task/idea/workflow); `ws.ringSize`/backpressure config in
  [`config.ts`](../packages/shared/src/config.ts)
- **New (gateway):** `ws/reliable-broadcast.service.ts` (seq allocation + per-channel ring + per-client queue +
  heartbeat), wrapping [`ws/ws-broadcast.service.ts`](../packages/gateway/src/ws/ws-broadcast.service.ts)
- **Edit (gateway):** [`tasks.gateway.ts`](../packages/gateway/src/tasks/tasks.gateway.ts),
  `ideas.gateway.ts`, `workflows.gateway.ts`, `approvals.gateway.ts` — delegate subscribe/resume/broadcast to the
  reliable layer; [`terminal.gateway.ts`](../packages/gateway/src/terminal/terminal.gateway.ts) (Theme F alignment)
- **New (web):** `hooks/use-reliable-subscription.ts` (the unified hook) + a connection-status component
- **Edit (web):** [`use-task-events.ts`](../packages/web/hooks/use-task-events.ts),
  [`use-idea-events.ts`](../packages/web/hooks/use-idea-events.ts), the workflow/approvals hooks (delegate to the new
  hook); [`query-client.ts`](../packages/web/lib/query-client.ts) (fallback refetch); board + cockpit views (51/55/52)
- **Reuse:** the terminal seq/ring pattern, `TaskEventBus`, team/run scoping, Phase 54 graceful shutdown (restart →
  resync) — behavior-preserving where noted.

---

## Verification

- [ ] **No missed-event drift:** with a client briefly disconnected while `task.updated`/`task.created` are
      published, on reconnect it **replays the missed events** (via `resume`+ring) and the board matches gateway
      truth — no manual refresh needed.
- [ ] **Gap → resync:** when the disconnect outlasts the ring (more than N events missed), the client receives
      **`resync-required`** and full-refetches — never applies a partial/stale stream.
- [ ] **Ordering + dedup:** replayed + live events apply **in seq order** with **no duplicates** (client dedups on
      `lastSeq`); a fresh subscriber anchors on the current watermark.
- [ ] **Backpressure:** a deliberately slow client is **dropped to resync** (closed with the resync code) without
      stalling the broadcast to other clients or reordering their events.
- [ ] **Heartbeat:** a half-open/dead connection is detected within ~1 min (missed pongs) and the client
      **proactively reconnects** and resumes.
- [ ] **All surfaces:** the board, office, and cockpits (session 51 / project 55 / diff review 52) all recover via
      the shared hook; a **connection-status indicator** shows live/reconnecting/stale accurately.
- [ ] **Terminal unchanged/aligned:** terminal scrollback replay still works; a ring-overflow now yields a
      transcript resync rather than a silent partial (Theme F).
- [ ] **Defaults preserve behavior:** with the ring/backpressure config at defaults, existing single-connected
      clients behave as before (plus the new recovery); a gateway restart cleanly forces a resync (no corruption).
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green (shared envelope + protocol units; gateway
      reliable-broadcast tests — seq monotonicity, ring replay, gap→resync, backpressure drop, heartbeat; web hook
      tests — resume/dedup/resync-required + per-type cache; **web tests from the primary checkout, not a `.git`
      worktree**).

---

## Decisions / open questions

1. **Generalize the terminal pattern (seq + ring + resume + gap→resync)** *(settled).* A monotonic per-channel seq,
   a bounded server ring, client resume-from-seq, and an explicit `resync-required` when replay can't cover the gap —
   one shared reliable-broadcast module + one client hook, delegated to by every board gateway.
2. **Drop-to-resync on backpressure** *(settled).* A bounded per-client queue; on overflow, close the client with a
   resync code so it reconnects + full-refetches — protecting the gateway and preserving other clients' ordering.
   Better than blocking the broadcast or firing out of order.
3. **Ring is per scoped channel, in-memory** *(recommend).* One ring per channel keyed by team (tasks/ideas) or run
   (workflows), respecting existing scoping; in-memory so a **gateway restart forces a resync** (correct — and it
   dovetails with Phase 54's graceful shutdown). A durable cross-restart log is **out of scope** (Decision §7).
4. **Resync over silent drift** *(recommend).* When the gap exceeds the ring, tell the client to refetch rather than
   apply a partial stream; also re-enable a `refetchOnWindowFocus`/last-sync fallback so long-backgrounded tabs
   self-heal.
5. **Per-event-type cache strategy** *(recommend).* Don't blanket-invalidate: tasks invalidate (mutable), workflow
   nodes patch, `agent.activity`/`attention` stay ephemeral, `guardrails.updated` patches state — avoids refetch
   storms while staying correct.
6. **Seq ordering, not causal consistency** *(recommend).* A per-channel monotonic seq is sufficient for a
   single-process gateway; full version-vector/causal consistency is **out of scope**.
7. **In-memory ring, no durable log** *(settled).* Surviving a restart without a resync would need a persistent event
   log — deferred. A restart-forces-resync is acceptable and simpler.
8. **Terminal alignment is opportunistic** *(settled).* The terminal already has seq + ring; fold it onto the shared
   vocabulary + fix the ring-overflow→resync edge only where cheap — it's not the risk surface this phase targets.
