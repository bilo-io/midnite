# Phase 31 — Office live-activity layer

> Phase 9 ([phase-9-office-visual-overhaul.md](phase-9-office-visual-overhaul.md)) made the [`/office`](../packages/web/components/office/README.md) a *place* — multiple rooms, distinct characters, interactable fixtures. **Phase 31 makes it tell the truth.** The office already renders live sessions ([`use-office-agents.ts`](../packages/web/components/office/use-office-agents.ts)) and walks actors when status changes, but **rooms are decorative** (status only picks desk-vs-lounge) and **activity labels are mock** (`session.subtitle`). The real per-tool detail an agent is running *exists at the gateway* (the `PreToolUse` hook) but is never fanned to web clients. This phase wires the office to live agent/task state — down to the current tool — and makes "an agent needs you" impossible to miss.

> Scope guardrails: this **builds on Phase 9's seam** — the Phaser scene ([`office-scene.ts`](../packages/web/components/office/scenes/office-scene.ts)), the Zustand↔HUD bridge ([`office-store.ts`](../packages/web/lib/office-store.ts)), the live-data hook, and the existing task-board WS ([`use-task-events.ts`](../packages/web/hooks/use-task-events.ts) ← [`tasks.gateway.ts`](../packages/gateway/src/tasks/tasks.gateway.ts)) all stay. We **extend the contract** with a new `agent.activity` event rather than building a new socket. **Out of scope:** distinct per-agent character art, sub-agent satellite characters, camera-follow/corner-office (all Phase 9 leftovers — orthogonal art/render work); activity **persistence/replay** (a separate future phase — activity here is ephemeral, live-only); and any new gateway auth. **Provider-agnostic, like Phase 9:** activity bubbles show provider-neutral tool actions ("git fetch", "editing file.ts") and must never assume a specific agent provider.

> Effort tags: **S** small · **M** medium · **L** large.

> **Privacy guardrail (applies to Theme A throughout):** activity events carry **only a short summary** — tool name + a derived one-line label — **never raw `tool_input`** (which can hold file contents, secrets, prompts). Reuse the gateway's existing approval-request summarizer so nothing sensitive reaches the wire.

---

## Theme A — Live activity event backbone — **M**

The contract piece, and the spine the rest of the phase hangs off. Today the gateway receives `PreToolUse` at [`lifecycle-hook.controller.ts`](../packages/gateway/src/pool/lifecycle-hook.controller.ts) (`POST /hooks/sessions/:sessionId/pre-tool-use`) only to make an allow/deny decision, and approval/attention state rides the per-session terminal WS. We surface a coarse, **summarized** activity signal to the board WS instead.

### A1. `agent.activity` event type — **S**
- [x] ✅ (PR #157) Add an `agent.activity` event to the discriminated union in [`shared/src/events/task.ts`](../packages/shared/src/events/task.ts) (piggybacked on the existing `/ws/tasks` socket — **Decisions §1**), e.g. `{ type: 'agent.activity', at, sessionId, phase: 'running' | 'blocked' | 'idle', tool?: string, label?: string }`. Extend `TaskBoardEventSchema` so existing clients validate it.
- [x] ✅ (PR #157) Add a coarse **attention** event `{ type: 'agent.attention', at, sessionId, reason: 'approval' | 'waiting', summary? }` on the same socket (**Decisions §2**) — fired when an agent blocks on the user.

### A2. Gateway emission — **M**
- [x] ✅ (PR #157) In [`lifecycle-hook.controller.ts`](../packages/gateway/src/pool/lifecycle-hook.controller.ts), after the existing allow/deny logic, derive a `tool` + one-line `label` from `tool_name` + a **summary** of `tool_input` (reuse the approval summarizer — **never** raw input) and emit `agent.activity` via the [`TaskEventBus`](../packages/gateway/src/tasks/task-event-bus.ts).
- [x] ✅ (PR #157) Emit `agent.attention` from the `notification` hook (`markWaiting`) and from the approval-request path, and a `phase: 'idle'`/clearing `agent.activity` when a turn stops (`stop` hook). Keep the emit helper alongside the existing one in [`tasks.service.ts`](../packages/gateway/src/tasks/tasks.service.ts) (or a small sibling) so [`tasks.gateway.ts`](../packages/gateway/src/tasks/tasks.gateway.ts) fans it out unchanged.
- [x] ✅ (PR #157) Tests: gateway integration test asserting a `PreToolUse` POST produces a summarized `agent.activity` broadcast (and that raw `tool_input` never appears in the payload).

### A3. Web consumption — **S**
- [x] ✅ (PR #157) Extend the web WS client to surface the new events: add a typed listener path in [`lib/task-events.ts`](../packages/web/lib/task-events.ts) / [`use-task-events.ts`](../packages/web/hooks/use-task-events.ts) so consumers can subscribe to `agent.activity` / `agent.attention` without a full refetch (the refetch path stays for board events). Feeds Themes C/D/E.

---

## Theme B — Task-aware room routing — **S–M**

Make rooms *mean* something. Today an agent sits at a desk when `status !== 'idle'` and on a lounger when idle — room choice ignores the task. Drive room assignment from task status instead.

### B1. Surface `task.status` on the office agent — **S**
- [x] ✅ (PR #161) Add `taskStatus` (one of the [`shared/src/task.ts`](../packages/shared/src/task.ts) statuses: `backlog`/`todo`/`wip`/`waiting`/`done`/`abandoned`) to the `OfficeAgent` shape in [`lib/office/agents.ts`](../packages/web/lib/office/agents.ts). The linked task is **already fetched** in the `sessionsToOfficeAgents` mapping — thread its status through (no new gateway call).

### B2. Status→room mapping — **S–M**
- [x] ✅ (PR #161) Define a pure `statusToRoom` table over the `ROOMS` in [`lib/office/layout.ts`](../packages/web/lib/office/layout.ts): `wip` → work-room desks, `waiting` → a "blocked"/meeting spot, `done` → the Agent pool / lounge. **Backlog/todo agents don't appear** until they're `wip` (**Decisions §3**) — keeps the floor uncluttered.
- [x] ✅ (PR #161) Route actors to the mapped room on status change, **reusing the existing walk-tweens** in [`office-scene.ts`](../packages/web/components/office/scenes/office-scene.ts) (the desk/lounge seat-assignment + tween machinery already exists — extend the target selection, don't rebuild movement).
- [x] ✅ (PR #161) Tests: `statusToRoom` is pure + unit-tested; a status change yields a different room target.

---

## Theme C — Tool-level bubbles & poses — **M**

The visible payoff. Today the speech bubble is status-only (`···` / `?` / `✓` / `z`). Expand it to the live action, driven by Theme A's `agent.activity`.

### C1. Live action bubbles — **M**
- [x] ✅ (PR #163) Expand the status-bubble logic in [`office-scene.ts`](../packages/web/components/office/scenes/office-scene.ts) to render the current `label` from `agent.activity` ("git fetch", "editing file.ts", "running tests") when present, falling back to the status glyph when idle/unknown.
- [x] ✅ (PR #163) Keep bubbles legible: truncate long labels, and let Theme E's throttling prevent flicker on rapid tool calls.

### C2. Activity poses — **M**
- [x] ✅ (PR #163) Distinct sprite poses/animations per `phase`: **working** (typing at desk), **blocked** (raised-hand / `?`), **idle** (existing `zzz` sleep). Drive off the same `agent.activity` phase; reuse the existing 2-frame animation approach in the scene.

---

## Theme D — Attention & approval surfacing — **M**

When an agent is blocked on *you*, the office should shout — not bury it in a terminal modal.

### D1. "Needs you" office state — **M**
- [x] ✅ (PR #163) On `agent.attention`, put the actor into a loud, unmistakable state: a glow/pulse + distinct bubble, and optionally walk it to a "reception"/door spot. Clear it when the agent resumes (next `agent.activity` with `phase: 'running'`).

### D2. HUD attention badge — **S**
- [x] ✅ (PR #163) Surface a count/badge in the office HUD ([`office-hud.tsx`](../packages/web/components/office/office-hud.tsx)) — "N agents need you" — clickable to focus/center the nearest waiting agent. Pure state in [`office-store.ts`](../packages/web/lib/office-store.ts) (mirror the existing proximity/`nearBoard` flags).

---

## Theme E — Push-patch over refetch — **S**

Today every board WS fire calls `invalidateData()` → a full sessions+tasks refetch → `setAgents()`. Fine for board moves; **too coarse for tool events** that can fire several times a second.

### E1. Patch the store directly — **S**
- [x] ✅ (PR #161) Apply `agent.activity` / `agent.attention` straight onto the matching `OfficeAgent` in the [`office-store.ts`](../packages/web/lib/office-store.ts) Zustand store (patch one agent's `activity`/`phase`/`attention`), **without** a full refetch. Board events (`task.created/updated/...`) keep the refetch path.

### E2. Throttle/coalesce — **S**
- [x] ✅ (PR #161) Debounce per-agent activity updates (latest-wins, ~250ms — **Decisions §4**) so a burst of tool calls renders as a smooth "current action", not a flood. Coalesce in the web client (the gateway emits per hook; the client smooths).

---

## Files this phase touches (map)

- **Contract (events):** [`shared/src/events/task.ts`](../packages/shared/src/events/task.ts) (`agent.activity` + `agent.attention` + schema), referencing statuses in [`shared/src/task.ts`](../packages/shared/src/task.ts) / [`shared/src/session.ts`](../packages/shared/src/session.ts)
- **Gateway emission:** [`pool/lifecycle-hook.controller.ts`](../packages/gateway/src/pool/lifecycle-hook.controller.ts) (derive summary, emit), [`tasks/task-event-bus.ts`](../packages/gateway/src/tasks/task-event-bus.ts), [`tasks/tasks.service.ts`](../packages/gateway/src/tasks/tasks.service.ts) (emit helper), [`tasks/tasks.gateway.ts`](../packages/gateway/src/tasks/tasks.gateway.ts) (fans out unchanged)
- **Web WS client:** [`hooks/use-task-events.ts`](../packages/web/hooks/use-task-events.ts), [`lib/task-events.ts`](../packages/web/lib/task-events.ts), [`components/live-data.tsx`](../packages/web/components/live-data.tsx)
- **Office data layer:** [`lib/office/agents.ts`](../packages/web/lib/office/agents.ts) (add `taskStatus`), [`lib/office/layout.ts`](../packages/web/lib/office/layout.ts) (`statusToRoom`), [`lib/office-store.ts`](../packages/web/lib/office-store.ts) (activity/attention state)
- **Scene + HUD:** [`components/office/scenes/office-scene.ts`](../packages/web/components/office/scenes/office-scene.ts) (room routing, bubbles, poses, attention glow), [`components/office/office-hud.tsx`](../packages/web/components/office/office-hud.tsx) (attention badge)
- **Docs:** update [`components/office/README.md`](../packages/web/components/office/README.md) and append to [`done.md`](done.md) as items land.

## Verification

- `moon run gateway:dev` + `moon run web:dev`, run a real agent against a task, open `/office`:
  - [x] ✅ (PR #163) As the agent runs, its speech bubble shows the **live tool/action** ("git fetch", "editing X"), not a static label; the bubble updates smoothly (no flicker) as tools change.
  - [x] ✅ (PR #162) Agents route to the **room matching their task status** — `wip` at work desks, `done` toward the pool/lounge; backlog/todo agents don't appear until `wip`.
  - [x] ✅ (PR #163 + main a581cbf) When an agent blocks on input, the office shows a loud "needs you" state and the HUD shows an attention badge; clicking it focuses the waiting agent. Clears on resume.
  - [x] ✅ (PR #157) No raw `tool_input` in any WS frame — approval-request summarizer produces label-only output.
  - [x] ✅ (PR #163) Activity updates patch the store directly (no full sessions+tasks refetch per tool call).
- `moon run :typecheck`, `moon run :lint`, `moon run :test` green. (Run web tests from the **primary checkout**, not a `.git` worktree — vite can't collect inside `.git/**`.)

## Decisions / open questions

1. **WS channel** — *resolved:* **piggyback `agent.activity`/`agent.attention` on the existing `/ws/tasks` socket** rather than a dedicated `/ws/activity` gateway. Reuses all plumbing ([`use-task-events.ts`](../packages/web/hooks/use-task-events.ts)); Theme E's throttling absorbs the extra chattiness.
2. **Attention source** — *resolved:* **coarse board-level `agent.attention` event** (sessionId + reason) rather than subscribing the office to each agent's per-session terminal WS. No N-sockets; the office just flips the agent into a loud state.
3. **Room for backlog/todo agents** — *recommend (default in B2):* they **don't appear** until `wip`, keeping the floor uncluttered. Alternative: a "queue" waiting area near the entrance — defer unless it reads better in practice.
4. **Throttle window** — *recommend:* per-agent **latest-wins ~250ms** debounce on the web client (E2). Tune during build if bubbles feel laggy or jumpy.
5. **`tool_input` safety** — *resolved:* activity events carry **summary only** (tool name + derived label), **never raw input**; reuse the gateway's approval-request summarizer. (Restated as the Theme A privacy guardrail.)
6. **Activity lifetime** — *resolved:* **ephemeral/live-only, no persistence.** Durable per-session timelines are the separate "session replay" idea, explicitly out of scope here.
