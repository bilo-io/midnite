# Phase 60 Theme E — State-machine, scheduler & concurrency correctness

**Date:** 2026-07-07 · **Scope:** the autonomous core — task state transitions, the scheduler tick + watchdog, WS seq ordering (post-Phase 56), and multi-table write atomicity · **Method:** four parallel static audits.

## Summary

| # | Area | Severity | Status |
|---|------|----------|--------|
| SM-1 | `updateStatus` fully unguarded → terminal→active revival (`done`→`wip` zombie, `done`→`todo` dup PR, `abandoned`→`todo` + archived-but-scheduled) | **HIGH** | ✅ **Fixed** |
| SM-2 | Late Notification/Stop hook revives `done`/`abandoned`→`waiting` | **HIGH** | ✅ **Fixed** (transition guard) |
| SM-3 | `abandoned`→`done` via a late Stop-with-PR (`markDone` un-abandons + notifies dependents) | MED | ✅ **Fixed** |
| SM-4 | `escalate` has no `from`-guard (defence-in-depth) | MED | ✅ **Fixed** |
| SM-5 | Duplicate check-run side-effects on repeated Stop-with-PR | LOW | 📋 Documented |
| SCHED-1 | `completeWithChecks`' slow `await checks.run` races a reclaimer → double-spawn + slot theft | **HIGH** | 📋 Documented — needs run-generation |
| SCHED-2 | auto-fix respawn assumes it still owns the slot after the same await | MED | 📋 Documented |
| SCHED-3 | kill→async `onExit` releases the *next* run's slot (no epoch) | MED | 📋 Documented |
| TX-1 | `createFromPrompt` writes task+edges+attachments+events non-atomically | **HIGH** | 📋 Documented — needs repo txn method |
| TX-2 | `createTasksFromBreakdown` builds a dependency graph non-atomically | **HIGH** | 📋 Documented |
| TX-3/4 | `createCouncil` / `createProject` half-seed on a mid-write throw | MED | 📋 Documented |
| WS-2 | No epoch id → a stale resume cursor is silently accepted after a gateway restart | **HIGH** | 📋 Documented — protocol change |
| WS-3 | REST snapshot vs. subscribe-watermark window (fetch↔subscribe gap) | MED | 📋 Documented |
| WS-5/6 | No positive client gap-detection; single-process seq assumption | LOW | 📋 Documented |

**Applied here:** the task state-machine guard — a centralized `ALLOWED_TRANSITIONS` + `canTransition` + `isTerminal` in `shared/src/task.ts`, enforced authoritatively in the gateway, closing **SM-1..4 (2 HIGH + 2 MED) at one seam** with regression tests. The scheduler-race, transaction, and WS-ordering findings all need larger structural changes (a run-generation token, a service DB handle / transactional repo methods, an epoch id in the WS protocol) — per the iteration's scoping (fix only if low-risk, else document), they are logged with concrete fix designs for dedicated follow-ups.

**Verified correct (no action):** WS seq allocation is synchronous/atomic and per-channel (WS-1/4); slot `acquire`/`release` is synchronous and idempotent-per-task, the tick has a `running` re-entrancy guard, and boot-recovery completes before the first (setInterval-delayed) tick; Phase 49 import, `deleteTask`, workflow/council deletes are correctly transactional. See per-area detail.

---

## Section 1 — Task state machine — ✅ FIXED (SM-1..4)

**The hole:** the lifecycle was a machine with **no transition table and no guard** — `grep canTransition/isValidTransition` returned nothing. Every writer set its target with at most an idempotency check on the *target* status, never a validated *from*. The blanket writer `TasksService.updateStatus` (reachable via `PATCH /tasks/:id/status` **and** a plain board drag routed through it) committed any edge verbatim:

- **SM-1 (HIGH):** `done`→`wip` (drag a Done card to In-progress) set `wip` with no session/slot — a **zombie `wip`** the scheduler never runs (it only pulls `todo`) and the watchdog never reconciles (it only inspects busy slots), silently re-run on the next gateway restart. `done`→`todo` re-queued completed work → **duplicate PR**. `abandoned`→`todo` revived an abandoned task **and** (since the ready-set query doesn't filter `archivedAt`) left it `todo`+archived, scheduled while the board renders it archived.
- **SM-2 (HIGH):** a trailing/in-flight Notification or Stop hook (its per-session secret still verifies after the run ends) called `markWaiting`/`markDone` on an already-terminal task, flipping `done`→`waiting` (a completed task reappears in "needs attention" with no agent).
- **SM-3 (MED):** a late Stop-with-PR after a `cancel()` flipped `abandoned`→`done`, un-abandoning it and firing `notifyDependents` so dependents unblocked off cancelled work.
- **SM-4 (MED):** `escalate` wrote `waiting` from any state (safe today only by caller discipline).

**The fix (this PR):**
- **`shared/src/task.ts`** — new `ALLOWED_TRANSITIONS: Record<Status, Status[]>` (terminal `done`/`abandoned` have **no** outgoing edges), `canTransition(from, to)` (same-status is an allowed no-op), and `isTerminal(status)`. One source of truth the gateway enforces and the web can import to disable illegal drags.
- **`TasksService.updateStatus`** now throws `BadRequestException` on an illegal transition (before any write).
- **`markWaiting` / `escalate` / `markDone`** now no-op when the task is already terminal (`isTerminal`), so a late hook can't revive it — `markDone` additionally never un-abandons.
- **Tests:** `shared/src/task.test.ts` (transition table + terminal rules + the audited revival edges) and `tasks.service.spec.ts` (updateStatus rejects `done`→`wip`/`abandoned`→`todo`, allows the same-status no-op, and late `markWaiting`/`markDone` can't revive a terminal task). The prior `moving out of abandoned does not auto-unarchive` spec — which encoded the SM-1 bug — was replaced to assert the guard.

**SM-5 (LOW, documented):** `completeWithChecks` isn't idempotent — Claude fires Stop every turn, so each Stop-with-PR re-runs the checks and persists duplicate `checks.*` events + `CheckRun` rows before `markDone` no-ops. Wasteful, not corrupting. Fix: short-circuit `completeWithChecks` when the task is already `done`.

**Follow-up (defence-in-depth, not required for correctness):** the web board/palette route non-spawn/non-stop drags straight to `updateStatus`; now the gateway rejects illegal ones (the drag snaps back on the 400). Importing `canTransition` into the board to *disable* those drags up front is a small UX follow-up. Also: clear the per-session secret in `complete()` (call `terminal.discardSession`) so late hooks are rejected at the door, not just no-op'd — belt to the SM-2 braces.

## Section 2 — Scheduler & agent-pool races — 📋 DOCUMENTED

**Root cause (all three):** slots and runs are addressed by **`taskId` only, with no run generation/epoch**. Any `release`/`complete`/`onExit` that resolves *after* the task has been re-picked acts on the wrong run.

- **SCHED-1 (HIGH):** the Stop hook fires `completeWithChecks`, which parks at `await this.checks.run(...)` (a full lint/test/build — many seconds) **with the task still `wip` and the slot still held**. During that window a reclaimer (the PTY's `onExit` treating the quiet agent as a crash, or the watchdog's `inactivityMs` path when enabled) sets the task `todo` and releases the slot; the next tick re-selects it and spawns a **second agent**; then `checks.run` resolves and `complete` releases the *second* run's slot while its agent is live → double-spawn + orphaned agent + clobbered retry state.
- **SCHED-2 (MED):** the same await's fail path (`killManagedRun`+`spawnAgentSession`+`setPid`+`armTimeout`) assumes it still owns the slot — after a reclaim it arms a timer for a slot-less run and can collide with the re-pick (`terminal ... already exists`).
- **SCHED-3 (MED):** `killManagedRun` returns immediately; the PTY's `onExit` fires later and unconditionally `pool.release(taskId)` — if the scheduler re-picked and re-acquired in between, the stale `onExit` frees the **new** run's slot.

**Fix (follow-up — touches the autonomous core, out of [L] scope for a mid-audit change):** stamp each run with a **generation token** at `pool.acquire`, capture it in the `onExit` closure, and make `release`/`complete`/`setPid` no-op unless the generation matches; re-check the task + generation after every `await` in `completeWithChecks`. This closes SCHED-1/2/3 at once.

**Verified correct:** `pool.acquire` is synchronous + idempotent-per-task (no double-assign); the tick's `running` guard + synchronous `watchdog.sweep` close tick-vs-tick and tick-vs-watchdog; `inactivityMs` reclaim is off by default and `agentRunHealth` fail-opens on unknown (no premature reclaim of a slow-but-alive session); boot recovery is fully synchronous and the first tick is `setInterval`-delayed, so recovery always finishes first (the real guarantee is the delay + sync recovery, **not** the DI order — scheduler↔runner is a `forwardRef` cycle, so relying on Nest init order is fragile; worth a comment fix). Single-loop task-selection is guarded in-memory, not by a DB conditional `UPDATE ... WHERE status='todo'` — correct for one tick loop but would double-spawn instantly under a second scheduler/process; worth stating as an explicit invariant.

## Section 3 — Multi-table write atomicity — 📋 DOCUMENTED

The domain services (`TasksService`, `CouncilsService`, `ProjectsService`) don't inject a DB handle, so they **can't** wrap a fan-out of repo calls in `db.transaction` — only `PortabilityImportService` does (and gets it right). So several create paths half-apply on a mid-write throw:

- **TX-1 (HIGH):** `createFromPrompt` — task row, then edges, attachments, and the `task.created` event as separate statements. A throw mid-way leaves a task with partial attachments/edges and **no `task.created` broadcast**; not idempotent (retry makes a second task).
- **TX-2 (HIGH):** `createTasksFromBreakdown` — loop of task inserts then a loop of edges, no txn. A throw leaves a **partially-wired dependency graph** the scheduler mis-orders, or disconnected tasks with no edges.
- **TX-3/4 (MED):** `createCouncil` (council + starter members) and `createProject` (project + N source rows via `Promise.all`) half-seed on a throw; re-create duplicates.

**Fix (follow-up):** give the domain service a DB handle (mirror `PortabilityImportService`) or add a transactional repo method taking a callback, and wrap each create's writes in one `db.transaction`. The AI calls in `createFromPrompt` complete *before* the DB writes, so the txn body is pure DB work — safe to wrap.

**Verified correct / by-design:** Phase 49 import (whole restore in one txn), `deleteTask` (links/attachments/events/deps-both-directions/prStatus/task in one txn), `WorkflowsRepository.deleteWorkflow`, `CouncilsRepository.deleteCouncil`/`reorderMembers` — all transactional. `createBulk` is intentionally non-atomic (Phase 16 partial-success is first-class). Search-index upkeep is best-effort out-of-txn by design (derived + rebuildable via `POST /search/reindex`). Workflow graph is a JSON column on one row (no side table).

## Section 4 — WS event ordering (post-Phase 56) — 📋 DOCUMENTED

**Verified correct:** seq allocation is fully synchronous (`stamp()` does read→+1→set with no `await` between), so two broadcasts in one tick / two concurrent same-channel publishes get distinct strictly-increasing seqs — **no duplicate/backwards seq** (WS-1). Seq is per-channel; the client tracks `lastSeq` per-`ch` and demuxes correctly (WS-4). Ring is bounded → a too-old gap forces a full resync; backpressure closes the socket (code 4014) rather than dropping a frame; replay/live overlap is deduped by `(ch, seq)`.

- **WS-2 (HIGH):** the envelope/watermark carry **no epoch/generation id** and seq resets to 1 on restart. After a gateway restart, a busy channel re-accumulates events during the client's reconnect backoff; when the client resumes from its stale cursor, `resume()` decides purely on seq — so it's told "you're current" (or replays only `> lastSeq`), **silently dropping the new epoch's events**. Board stays stale until the next event or a manual refresh. Fix: add a per-key `epoch` (random id at boot) to the envelope + watermark cursor; force `resyncRequired` on an epoch mismatch regardless of seq (standard session-id+seq pattern).
- **WS-3 (MED):** the REST snapshot that seeds the board and the subscribe-watermark are uncoordinated — an event firing between "REST resolves" and "watermark stamped" is in neither. Self-heals on the next event for tasks/ideas (every event triggers `invalidateData`) but a then-idle channel stays stale. Fix: return the current watermark from the seed endpoint and `resume` from it, or unconditionally `invalidateData` on the first `watermark` frame.
- **WS-5 (LOW):** the client advances its cursor across a skipped seq (only drops `seq ≤ cursor` as dup) — no positive gap detection; relies on TCP order + close-on-backpressure. Fix: treat `seq > cursor + 1` as a gap → resync.
- **WS-6 (LOW):** per-process in-memory seq/ring — under horizontal scaling each instance mints its own line; a client rebalanced across a reconnect sees a mismatched watermark. Fix: shared store or sticky sessions (+ the WS-2 epoch). LOW — current deploy is single-process.

---

## Follow-ups (ranked)

1. **Scheduler run-generation token** (SCHED-1 HIGH + 2/3) — the single highest-value core-correctness fix; its own theme with careful tests around the tick/watchdog/onExit interleavings.
2. **Transaction boundaries** (TX-1/2 HIGH, 3/4 MED) — give domain services a DB handle / transactional repo methods; wrap the create paths.
3. **WS epoch id** (WS-2 HIGH) — add an epoch to the envelope + resume protocol; force resync on mismatch.
4. Web board `canTransition` guard + clear session secret in `complete()` (SM defence-in-depth); `completeWithChecks` done-idempotency (SM-5); WS-3/5/6 hardening.
