# Phase 69 — Lifecycle edges: resume & reply

> [Phase 60 E](phase-60-fable-analysis.md) formalised the task state machine — `ALLOWED_TRANSITIONS` + `canTransition()` in [`shared/src/task.ts`](../packages/shared/src/task.ts) — and [Phase 53](phase-53-task-lifecycle-resilience.md) gave `waiting` a typed `waitReason` + needs-attention escalation. But the machine has **legal edges nothing drives**: a session that goes from *requiring input* back to *executing* leaves its task stranded in the "waiting" column, because the only `→ wip` writer is `startTask()` at spawn. The in-PTY hook set ([`lifecycle-hook.controller.ts`](../packages/gateway/src/pool/lifecycle-hook.controller.ts)) covers Stop/Notification (`wip → waiting`) and PreToolUse (approvals + activity) — there is **no `UserPromptSubmit` hook**, so no resume signal. **Phase 69 closes the loop:** a full signal→edge audit of every status writer, a hook-driven `waiting → wip` resume edge, a first-class **reply** affordance (board card + detail + CLI) so you can answer a waiting agent without opening its terminal, and the long-designed-for explicit **reopen** action for terminal states.
>
> **Scope guardrails (CLAUDE.md).** Hook callbacks stay authenticated by the per-session secret **header** — never trust the body. New wire shapes (`UserPromptSubmit` payload, session prompt, reopen) get zod schemas in `shared`; `web`/`cli` speak only the typed client. The reply write path lives in the **terminal** module (it owns the PTY); `sessions/` stays a reader. `ALLOWED_TRANSITIONS` keeps terminal states edge-free — reopen is a **dedicated explicit action**, not a loosened table. **Out of scope:** suspending `waiting` sessions to free their slot ([outstanding #12](outstanding.md) — deliberately deferred to real slot pressure; this phase is its *prerequisite*, since suspend-on-wait needs exactly this resume signal), WS reconnect-resume ([Phase 56](phase-56-realtime-ws-reliability.md) — unrelated "resume"), and notification *rule* changes beyond resume hygiene.
>
> Effort tags: **S** small · **M** medium · **L** large. **A** (audit) is the map; **B** (resume edge) is the payoff and can land in parallel; **C → D** is the reply stack (transport before UX); **E** (reopen) is independent. B+C+D form the user-visible core.

---

## Current state (what exists to build on)

- **State machine** — [`shared/src/task.ts`](../packages/shared/src/task.ts): `ALLOWED_TRANSITIONS` (Phase 60 E) already legalises `waiting → wip`; `canTransition()` is enforced in `TasksService.updateStatus` and disables illegal board drags. The edge is legal — it just has **no driver**.
- **Hook wiring** — [`terminal.service.ts`](../packages/gateway/src/terminal/terminal.service.ts) `applyHookWiring()`/`writeHookSettings()` write an ephemeral `--settings` file per agent session registering **PreToolUse** (when approvals on) + **Stop**/**Notification** (when `opts.lifecycle`), with the per-session secret + callback URL in env. Hook scripts live in [`terminal/hooks/`](../packages/gateway/src/terminal/hooks/) (`pre-tool-use-hook.cjs`, `stop-hook.cjs`, `notification-hook.cjs`).
- **Lifecycle callbacks** — [`pool/lifecycle-hook.controller.ts`](../packages/gateway/src/pool/lifecycle-hook.controller.ts): Stop → `completeWithChecks` (PR URL) or `markWaiting`; Notification → `markWaiting` + `emitAttention('waiting')`. [`terminal/approval.controller.ts`](../packages/gateway/src/terminal/approval.controller.ts): PreToolUse → `emitActivity('running')` (+ attention when a human must answer). For agent sessions **sessionId == taskId**.
- **Waiting semantics** — [`tasks.service.ts`](../packages/gateway/src/tasks/tasks.service.ts): `markWaiting()` (idempotent, terminal-guarded, Phase 60 E), `escalate()` (dead-session needs-attention wait, clears the session binding), `resolveNeedsAttention()` (requeue/replan/abandon). `WaitReason` distinguishes live `needs-input` from dead escalated waits.
- **Waiting-nudge loop** — [Phase 53 D](phase-53-task-lifecycle-resilience.md): escalating `task.needs-attention` notifications while a task sits waiting ([`notifications.service.ts`](../packages/gateway/src/notifications/notifications.service.ts)).
- **Session input today** — only via the terminal WS ([`terminal.gateway.ts`](../packages/gateway/src/terminal/terminal.gateway.ts) `type: 'input'` → `terminal.write()`). No REST path; no CLI path.
- **Surfaces** — waiting cards on the board, the unified task/session detail (Phases 42/51) with timeline, `midnite watch` (Phase 32), the office activity layer (Phase 31) already flipping on `agent.activity`.

---

## Theme A — Signal→edge audit & writer inventory — **M** — ✅ DONE (PR #442, 2026-07-16)

Every status writer enumerated, every edge accounted for: driven, guarded, or deliberately dead. "Fix everything found" is bounded to this inventory — it's a finite commitment, not an open hunt.

- [x] **Writer inventory:** enumerate every status-mutation site — all `TasksService` writers (`updateStatus`, `startTask`, `markWaiting`, `markDone`, `escalate`, `requeue`, `resolveNeedsAttention`, abandon/archive paths…), [`LifecycleHookController`](../packages/gateway/src/pool/lifecycle-hook.controller.ts) (stop/notification), [`ApprovalController`](../packages/gateway/src/terminal/approval.controller.ts), [`AgentRunnerService`](../packages/gateway/src/pool/agent-runner.service.ts) (`onExit`, run-timeout, `completeWithChecks`, boot recovery), the scheduler tick, the doctor service, and REST/board-drag `updateStatus` — into a **signal→edge table** in a new `docs/LIFECYCLE.md` (signal, writer, edge, guard, event emitted). *(Scheduler + doctor confirmed read-only / delegating — scheduler only calls `startTask` via the runner; doctor never writes status.)*
- [x] **Pin current behavior:** one table-driven spec (`lifecycle-writer-matrix.spec.ts`) asserting each writer's edge + guard (from-status check, terminal guard, idempotency) so the matrix in the doc and the tests can't drift apart.
- [x] **Race audit:** Stop-vs-Notification ordering, late hooks after a terminal transition (Phase 60 E guard — verified), Stop firing right after a resume (the `wip ⇄ waiting` ping-pong — convergence asserted), `onExit` racing `markDone`, boot recovery vs in-flight hooks. **No new defects found** — each hazard is already covered (terminal guard / Phase 69 B debounce / idempotency / dead-session-only requeue) and pinned by a regression test in the matrix spec's `race convergence` block.
- [x] **Dead-edge accounting:** all 18 legal edges in `ALLOWED_TRANSITIONS` are driven (documented in `docs/LIFECYCLE.md` §3); a programmatic cross-check in the matrix spec fails CI if a legal edge is neither driven nor in the `deliberately-dead` allowlist (empty today). `waiting → wip` → Theme B; terminal reopen stays Theme E's dedicated action.
- [x] Link `docs/LIFECYCLE.md` from the CLAUDE.md scheduler/agent-pool section so future writers land on the table before adding an edge.

---

## Theme B — The resume edge: `UserPromptSubmit` → `waiting → wip` — **M** — ✅ DONE (PR #441, 2026-07-16)

The missing driver. Status truth comes from the hook round-trip — no optimistic client flips.

- [x] `TasksService.resumeFromWaiting(id)`: idempotent no-op unless `status === 'waiting'` (terminal-guarded like `markWaiting`); sets `wip`, clears `waitReason`, inserts an **`agent.resumed`** task event, emits `task.updated`.
- [x] New [`terminal/hooks/`](../packages/gateway/src/terminal/hooks/) script `user-prompt-submit-hook.cjs` (fire-and-forget POST with the secret header, mirroring `notification-hook.cjs`); register **`UserPromptSubmit`** under `opts.lifecycle` in `writeHookSettings()`.
- [x] `POST /hooks/sessions/:sessionId/user-prompt-submit` on [`LifecycleHookController`](../packages/gateway/src/pool/lifecycle-hook.controller.ts): verify secret, parse a new `UserPromptSubmitHookRequestSchema` (in `shared/src/events/`), then `resumeFromWaiting(sessionId)` + `emitActivity(sessionId, 'running')`.
- [x] **Approval-resume fallback:** `ApprovalController.preToolUse` also calls `resumeFromWaiting()` — a permission-wait resumes mid-turn with *no* new prompt, so the tool-use signal is the only one that fires. Idempotence makes the double-wiring safe.
- [x] **Notification hygiene:** on resume, auto-resolve stale unread needs-input notifications for the task (via a `task.updated`-driven `markReadForEntity` in `NotificationsService`, generalised to every un-wait path), and spec that the Phase 53 D waiting-nudge loop stands down once the task is `wip` again.
- [x] Specs: controller (bad secret 404, bad payload 400, terminal-status no-op, happy path) + service transition matrix (`waiting→wip` ✓, `wip` no-op, `done`/`abandoned` untouched, `waitReason` cleared, event emitted).

> **Ping-pong debounce (Decision §7 — resolved to *debounce* in review, overriding the doc's "no debounce v1" recommendation):** `agent.resumeDebounceMs` (default 1500) coalesces the `wip ⇄ waiting` oscillation Claude's per-turn Stop hook causes. A Stop-driven wait within the window of a resume is held in `markWaiting`; a follow-up reply cancels it. Only the post-resume `needs-input` path debounces — a first wait flips immediately (behaviour-preserving). Set `0` to disable.

---

## Theme C — Reply transport: REST + typed client + CLI — **M** — ✅ DONE (PR #443, 2026-07-16)

One authenticated write path from "text" to the PTY's stdin, usable by web and CLI alike.

- [x] `shared`: `SessionPromptRequestSchema` (`{ text }`, trimmed / non-empty / ≤8000) + `SessionPromptResponseSchema` (`{ ok: true }`), and a typed API-client method (`sendSessionPrompt(sessionId, text)`).
- [x] `POST /sessions/:sessionId/prompt` served from the **terminal** module (thin controller → `TerminalService.sendPrompt()` writes text + one Enter to the live PTY, trailing newlines stripped). `sessions/` stays a reader; terminal owns the write. Dumb pipe: no status gate — the `wip` flip is earned by Theme B's hook round-trip.
- [x] Guards: session must be a **live agent session** (404 unknown/out-of-scope, 409 dead/non-agent); RBAC via scoped `getTask` (agent `sessionId === taskId`; TerminalModule can't import SessionsModule — that edge is a cycle), consistent with existing session-scoped visibility (Phase 33/35).
- [x] CLI: `midnite reply <task-id> "text"` (inline in `cli/src/index.ts`, matching the repo's command layout) — thin: send immediately → typed client; errors surface the 404/409 distinction ("no live session — resolve the task instead of replying").

---

## Theme D — Reply UX on the board & detail surfaces — **M** — ✅ DONE (PR #444, 2026-07-16)

Answer a waiting agent where you see it waiting. The status flip is *earned* via Theme B's hook round-trip — the UI just sends the prompt and watches the WS event move the card.

- [x] Shared **`ReplyBox`** web component (input + send, pending/disabled state, error surface) calling `sendSessionPrompt` (Theme C transport); lives with the task components in `web`. Enter-to-send; 409 → friendly "no live session — needs resolve, not reply".
- [x] **Waiting card quick-reply** on the board: renders **only for live waits** (`waitReason === 'needs-input'`, a reliable proxy for a bound live session on the lean board DTO); collapsed-to-icon affordance, rendered outside the card `<button>` (interactives can't nest).
- [x] **Detail surfaces:** the same `ReplyBox` in the unified task/session detail (gated on `sessionId` + `needs-input`) and the session cockpit's left rail.
- [x] **Dead waits stay resolve-only:** the box only renders for `needs-input`; escalated/needs-attention waits keep requeue/replan/abandon.
- [x] Timeline: `agent.resumed` (+ sibling lifecycle kinds) render with friendly copy via an `EVENT_KIND_LABEL` map instead of the raw kind.
- [x] Tests: `reply-box.test.tsx` (6 RTL — gating, trimmed send + clear + onSent, Enter/Shift+Enter, 409 friendly + text retained) + `reply-box.stories.tsx` (4 stories, 2 with `play`). Visual proof via the stories (the board/detail UI is gated on a live `needs-input` wait, not seedable via the public move API).

---

## Theme E — Explicit reopen for terminal states — **M**

The action Phase 60 E's comment promised: *"a deliberate 'reopen' would be its own explicit action that also clears `archivedAt`/`sessionId`."* The transition table stays strict; reopen is a dedicated verb, not a loosened edge.

- [ ] `TasksService.reopen(id)`: only from `done`/`abandoned` → `todo`; clears `sessionId`, `archivedAt`, `waitReason`, retry/backoff state; inserts a **`task.reopened`** event; emits `task.updated`. `ALLOWED_TRANSITIONS` and generic `updateStatus` remain unchanged (drags still can't revive terminal tasks).
- [ ] `POST /tasks/:id/reopen` + shared schema/client method; RBAC: same actor rules as abandon.
- [ ] **Dependency semantics:** reopening a `done` blocker re-blocks its dependents — re-broadcast dependents (`task.updated`) exactly like Phase 27's terminal-transition path, so "blocked by N" chips refresh; scheduler readiness self-corrects on the next tick.
- [ ] Web: "Reopen" in the done/abandoned card context menu + task detail actions (and command palette verb where the pattern is cheap).
- [ ] Specs: reopen clears bindings, rejects non-terminal callers, re-blocks dependents, search index + board reflect the revived task.

---

## Files this phase touches

| Area | Files |
|------|-------|
| shared | [`src/task.ts`](../packages/shared/src/task.ts) (event kinds), `src/events/` (UserPromptSubmit hook schema), `src/session.ts` / API client (prompt + reopen methods) |
| gateway · hooks | [`terminal/hooks/`](../packages/gateway/src/terminal/hooks/) (+`user-prompt-submit-hook.cjs`), [`terminal/terminal.service.ts`](../packages/gateway/src/terminal/terminal.service.ts) (`writeHookSettings`, `sendPrompt`), [`pool/lifecycle-hook.controller.ts`](../packages/gateway/src/pool/lifecycle-hook.controller.ts), [`terminal/approval.controller.ts`](../packages/gateway/src/terminal/approval.controller.ts) |
| gateway · tasks | [`tasks/tasks.service.ts`](../packages/gateway/src/tasks/tasks.service.ts) (`resumeFromWaiting`, `reopen`), [`tasks/tasks.controller.ts`](../packages/gateway/src/tasks/tasks.controller.ts) (reopen route), [`notifications/notifications.service.ts`](../packages/gateway/src/notifications/notifications.service.ts) (resume hygiene) |
| gateway · terminal | new prompt controller (terminal module), specs alongside |
| web | `ReplyBox` component, waiting task card, task/session detail, timeline event renderer, card context menu |
| cli | `cli/src/commands/reply.ts` |
| docs | **new** `docs/LIFECYCLE.md` (signal→edge table), CLAUDE.md pointer |
| tests | table-driven writer-matrix spec (gateway), controller/service specs, RTL + story, Playwright flow in `web/e2e` |

---

## Verification

- [ ] **Playwright e2e (the whole point):** seeded gateway → agent session marks its task `waiting` → type into the card's reply box → `UserPromptSubmit` hook fires → the card moves to **In progress** on the board without a refresh; session view shows executing.
- [ ] Table-driven writer-matrix spec green; every inventory fix has a regression spec.
- [ ] `moon run :typecheck && moon run :lint && moon run :test` green; gateway/web/cli layers each carry their new specs.
- [ ] Manual: live tmux-mode session — pause (ask a question), reply from the board, watch waiting → wip → waiting ping-pong converge; approve a permission prompt and see the same flip without a typed reply.
- [ ] `docs/LIFECYCLE.md` exists, matches the spec matrix, and CLAUDE.md links it.

---

## Decisions / open questions

1. **Where does the audit table live?** → **Resolved: `docs/LIFECYCLE.md`**, linked from CLAUDE.md's scheduler/agent-pool section (a doc future edge-writers can't miss).
2. **Reply endpoint module?** → **Resolved: terminal module** owns `POST /sessions/:id/prompt` (it owns the PTY write); `sessions/` stays read-only.
3. **Reply transport?** → **Resolved: REST** (not client-side terminal-WS reuse) — buys CLI parity and keeps the client thin; the status flip still comes only from the hook round-trip.
4. **Dead-session waits?** → **Resolved: hide reply, keep resolve actions** — no affordance that writes to a dead PTY.
5. **Audit disposition?** → **Resolved: fix everything found, bounded to the writer inventory** (the enumeration in Theme A is the scope fence).
6. **Reopen and dependents** — recommendation (in Theme E): reopening a `done` blocker **re-blocks** its dependents, mirroring Phase 27's derived-blocked model; the alternative (snapshot dependents as unblocked) breaks the "blocked is computed, not stored" invariant. *Recommended, pending sign-off in review.*
7. **Resume ping-pong cadence** — Stop fires at the end of *every* turn, so `wip ⇄ waiting` will oscillate by design. Recommendation: no debounce in v1 (each edge is cheap + idempotent); revisit only if board churn is visible. *(Open.)*
8. **Suspend-on-wait ([outstanding #12](outstanding.md))** — stays deferred, but this phase is its prerequisite: once resume is reliable, a future phase can park waiting tmux sessions and revive them on reply. *(Deliberately out.)*
