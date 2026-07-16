# Task lifecycle — the signal → edge map

> **Read this before adding any code that changes a task's `status`.** The task
> state machine (`ALLOWED_TRANSITIONS` + `canTransition()` in
> [`shared/src/task.ts`](../packages/shared/src/task.ts)) legalises a fixed set of
> edges; this doc is the audit (Phase 69 Theme A) of **which real signal drives
> each edge, through which writer, under which guard**. Every legal edge is
> accounted for below — either it has a driver, or it's recorded as deliberately
> undriven. A table-driven spec
> ([`lifecycle-writer-matrix.spec.ts`](../packages/gateway/src/tasks/lifecycle-writer-matrix.spec.ts))
> pins this matrix so the doc and the code can't drift.

The six statuses (`shared/src/task.ts`): `backlog` · `todo` · `wip` · `waiting`
· `done` · `abandoned`. `done`/`abandoned` are **terminal** — no outgoing edges
(`isTerminal`); reviving a terminal task is always a bug (Phase 60 E), so a
deliberate revival is a dedicated `reopen()` action (Phase 69 Theme E), *not* a
loosened edge.

---

## 1 · The writers (edge-deciders)

Every status mutation goes through one of these `TasksService` methods — the
repository (`repo.updateStatus`) is never called from outside the service. Each
row is the writer's edge(s), its guard, and the task event it appends. (Create
paths set an *initial* status, not a transition — listed last.)

| Writer | Edge(s) | Guard | Event(s) emitted |
|--------|---------|-------|------------------|
| `updateStatus(id, to)` | any **legal** edge (REST / board drag) | `canTransition(from, to)` throws on an illegal edge; same-status = no-op; ends the resume episode; `abandoned` also archives + `notifyDependents` | `status.changed`, `task.updated` (+ `task.archived` on abandon) |
| `startTask(id)` | `todo`/`backlog`/`waiting` → `wip` | exists-guard only (the scheduler only ever hands it a **ready `todo`**); binds `sessionId = id`, clears `nextRetryAt` + `waitReason`; ends resume episode | `agent.started`, `task.updated` |
| `requeue(id, target)` | `wip`/`waiting`/… → `todo`\|`backlog` | exists-guard; clears session + backoff + `waitReason`; ends resume episode | `agent.requeued`, `task.updated` |
| `retry(id, nextRetryAt)` | `wip`/`waiting` → `todo` | exists-guard; increments `retryCount`, sets backoff `nextRetryAt`, clears session + `waitReason`; ends resume episode | `agent.retried`, `task.updated` |
| `markWaiting(id, reason)` | `wip` (or `todo`) → `waiting` | **terminal-guarded** (no-op on `done`/`abandoned`); idempotent on `(status, reason)`; **post-resume debounce** for `needs-input` (Phase 69 B) | `agent.waiting`, `task.updated` (both deferred when debounced) |
| `resumeFromWaiting(id)` | `waiting` → `wip` | terminal-guarded; **only** a live `needs-input` wait (dead needs-attention waits are resolve-only); cancels a pending debounced wait, arms the resume window | `agent.resumed`, `task.updated` |
| `escalate(id, reason)` | `wip`/`waiting` → `waiting` (needs-attention) | terminal-guarded; clears the (dead) session; ends resume episode | `agent.escalated`, `task.updated` |
| `markDone(id, prUrl?)` | `wip`/`waiting` → `done` | terminal-guarded (idempotent, never un-abandons a cancelled task); clears `waitReason`; `notifyDependents`; ends resume episode | `agent.done`, `task.updated` |
| `resolveNeedsAttention(id, action)` | `waiting` → `todo` (requeue/replan) \| `abandoned` (abandon) | delegates to `requeue` / `updateStatus`; `replan` also rewrites the prompt (`task.replanned`) | via the delegate |
| *(create)* `createFromPrompt` | — → `done` (inline-answered question) \| given `status` \| `todo` (triage ready) \| `backlog` | classifier + planner triage | `task.created` (+ `answer` if inline) |
| *(create)* `createForProject` / `createBulk` | — → `todo` | — | `task.created` (bulk coalesced) |

`archive` / `unarchive` set `archivedAt` only — **not** a status edge, so they're
excluded from the transition matrix (abandon archives as a side-effect above).

---

## 2 · The signals (what fires each writer)

| Signal | Path | Writer → edge |
|--------|------|---------------|
| Scheduler tick picks a ready `todo` | [`AgentPoolScheduler`](../packages/gateway/src/pool/agent-pool-scheduler.service.ts) → `AgentRunnerService.start` | `startTask` → `todo → wip` |
| Agent spawn fails | `AgentRunnerService.start` | `requeue` → `wip → todo` |
| **Stop hook** + PR URL in output | [`LifecycleHookController.stop`](../packages/gateway/src/pool/lifecycle-hook.controller.ts) → `completeWithChecks` | `markDone` → `wip → done` |
| **Stop hook**, checks gate fails | `completeWithChecks` | `markWaiting('gate-failed')` → `wip → waiting` |
| **Stop hook**, no PR URL (agent paused) | `LifecycleHookController.stop` | `markWaiting('needs-input')` → `wip → waiting` |
| **Notification hook** (blocked on user) | `LifecycleHookController.notification` | `markWaiting('needs-input')` → `wip → waiting` |
| **UserPromptSubmit hook** (new prompt) | `LifecycleHookController.userPromptSubmit` (Phase 69 B) | `resumeFromWaiting` → `waiting → wip` |
| **PreToolUse hook** (approval-resume fallback) | [`ApprovalController.preToolUse`](../packages/gateway/src/terminal/approval.controller.ts) (Phase 69 B) | `resumeFromWaiting` → `waiting → wip` |
| PTY exits while live (crash) | `AgentRunnerService.onExit` → `resolveFailedRun` | `retry` \| `escalate` \| `updateStatus('abandoned')` — `wip → todo`/`waiting`/`abandoned` |
| Run exceeds `runTimeoutMs` | `AgentRunnerService.onTimeout` → `resolveFailedRun` | same as onExit |
| Watchdog finds a run unhealthy | `AgentRunnerService.reconcileUnhealthy` → `resolveFailedRun` (Phase 54 C) | same as onExit |
| User "stop" (return to queue) | `AgentRunnerService.stop` | `requeue` → `wip → todo`/`backlog` |
| User "cancel" (give up) | `AgentRunnerService.cancel` | `updateStatus('abandoned')` → `wip → abandoned` |
| Boot recovery — dead `pty`, or dead `tmux` | `AgentRunnerService.onModuleInit` | `requeue` → `wip`/`waiting → todo` |
| Boot recovery — **live `tmux`** | `AgentRunnerService.reattach` | *(none — the run resumes, stays `wip`)* |
| REST board drag / move | [`TasksController`](../packages/gateway/src/tasks/tasks.controller.ts) → `updateStatus` | any legal edge |
| Resolve a needs-attention wait | REST → `resolveNeedsAttention` | `waiting → todo`/`abandoned` |

For agent sessions **`sessionId == taskId`**. Hook callbacks are authenticated by
the per-session secret **header** (never the body) — see the controllers.

---

## 3 · Dead-edge accounting

Every edge legal under `ALLOWED_TRANSITIONS` and its driver. **All 18 legal edges
are driven** — there are currently no legal-but-undriven ("dead") edges.

| From → To | Driver |
|-----------|--------|
| `backlog → todo` | `updateStatus` (manual promote) |
| `backlog → wip` | `updateStatus` / `startTask` (manual start) |
| `backlog → abandoned` | `updateStatus` / `cancel` |
| `todo → backlog` | `updateStatus` (manual park) |
| `todo → wip` | `startTask` (scheduler) |
| `todo → waiting` | `updateStatus` (manual only) |
| `todo → done` | `updateStatus` (manual) / inline-answer create |
| `todo → abandoned` | `updateStatus` / `cancel` |
| `wip → todo` | `retry` / `requeue` / `stop` |
| `wip → backlog` | `requeue` / `stop(backlog)` |
| `wip → waiting` | `markWaiting` / `escalate` |
| `wip → done` | `markDone` |
| `wip → abandoned` | `cancel` / `resolveFailedRun` (escalation off) |
| `waiting → todo` | `requeue` / `retry` / `resolveNeedsAttention` |
| `waiting → backlog` | `requeue(backlog)` |
| `waiting → wip` | `resumeFromWaiting` (Phase 69 B) |
| `waiting → done` | `markDone` (Stop after a resume, or manual) |
| `waiting → abandoned` | `cancel` / `resolveNeedsAttention(abandon)` / `resolveFailedRun` |
| `done → *` | **none** — terminal; revival only via `reopen()` (Phase 69 Theme E), a dedicated action outside the table |
| `abandoned → *` | **none** — terminal; ditto |

The programmatic half of this table lives in
[`lifecycle-writer-matrix.spec.ts`](../packages/gateway/src/tasks/lifecycle-writer-matrix.spec.ts):
it iterates `ALLOWED_TRANSITIONS` and fails CI if a legal edge is neither in the
driven set nor an explicit `deliberately-dead` allowlist — so a future edge can't
be added to the table without being accounted for here.

---

## 4 · Race audit

The concurrency hazards around these writers, and how each is handled. **No new
defects were found** — every race is covered by an existing guard (Phase 60 E
terminal-guard, Phase 69 B debounce, idempotency, or the dead-session-only
requeue invariant). Each is pinned by a regression test in the matrix spec's
`race convergence` block.

1. **Stop vs Notification ordering.** Both call `markWaiting('needs-input')`,
   which is idempotent on `(status, reason)`. Either order converges to a single
   `waiting` — the second is a no-op. *Verified safe.*
2. **Late hook after a terminal transition.** A trailing Stop/Notification (whose
   per-session secret still verifies) hitting a `done`/`abandoned` task no-ops:
   `markWaiting`/`markDone` are terminal-guarded (Phase 60 E). *Verified safe.*
3. **Stop right after a resume (the `wip ⇄ waiting` ping-pong).** Claude fires
   Stop at the end of *every* turn, so a resumed task would flip straight back.
   The Phase 69 B debounce coalesces this: a Stop-driven wait within
   `agent.resumeDebounceMs` of a resume is held, and a follow-up reply cancels it.
   The sequence converges to a stable state. *Verified safe.*
4. **`onExit` racing `markDone`.** `completeWithChecks` sets `done` *before* the
   session is torn down; the kill's `onExit` then sees a non-`wip`/non-live task,
   so its `live` guard skips re-processing and it merely releases the slot.
   *Verified safe.*
5. **Boot recovery vs in-flight hooks.** Recovery (`onModuleInit`) runs before the
   scheduler's first tick. It only ever **requeues a task whose session is dead**
   (dead `pty` — the process died with the gateway; dead `tmux`) — a dead session
   fires no hooks. A live `tmux` session is *reattached* (stays `wip`, same
   secret), so its hooks keep flowing to the right task. A stale hook from a
   superseded session fails the per-session secret check. *Verified safe.*

---

## 5 · Adding an edge or a driver

1. If it's a genuinely new edge, add it to `ALLOWED_TRANSITIONS` in
   [`shared/src/task.ts`](../packages/shared/src/task.ts) — the single source of
   truth the gateway (throws) and the web (disables illegal drags) share.
2. Give it a driver **or** add it to the `deliberately-dead` allowlist in
   [`lifecycle-writer-matrix.spec.ts`](../packages/gateway/src/tasks/lifecycle-writer-matrix.spec.ts),
   else the cross-check fails CI.
3. Update §1–§3 of this doc so the matrix and the code stay in lockstep.
