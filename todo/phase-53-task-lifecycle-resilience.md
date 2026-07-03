# Phase 53 — Task Lifecycle Resilience (fail loudly, recover safely)

> midnite's whole promise is **agents driving tasks to done unattended**. The machinery for the
> happy path is solid — crash retries, a 30-minute per-run timeout, clean boot recovery — but the
> **failure path is thin**, and that's where an autonomous system earns or loses trust. Today a
> task that stalls in **`waiting`** sits there forever (no timeout, no nudge, no un-wait path) and
> can **hold an agent slot indefinitely**; every kind of failure — crash, timeout, gate-fail,
> cancel — collapses into a single `abandoned` state **with no recorded reason**; retries fire
> **immediately with no backoff** and **blindly regardless of why** the task failed; and **nothing
> watches for a `wip` session that's silently died**. Phase 53 hardens the lifecycle: it
> **classifies** why tasks fail, **backs off** intelligently, **watches** for stuck states, and
> **escalates to a visible "needs attention" state** instead of quietly abandoning work. It's the
> complement to Phase 50 — 50 bounds what *can* go wrong; this handles it *when it does*.

> **Scope guardrails (CLAUDE.md).** An **additive resilience layer** on the existing task
> lifecycle — **do not refactor the ad-hoc state machine** (spread across
> [`shared/src/task.ts`](../packages/shared/src/task.ts),
> [`web/lib/task-transitions.ts`](../packages/web/lib/task-transitions.ts),
> [`tasks.service.ts`](../packages/gateway/src/tasks/tasks.service.ts), and
> [`agent-runner.service.ts`](../packages/gateway/src/pool/agent-runner.service.ts)). **Escalation
> reuses the existing `waiting` state** + a typed reason rather than adding a status (Decision §1,
> mirroring Phase 27's "blocked is computed, not a new status" restraint). New wire shapes (failure
> class, failure record, wait reason) are **zod schemas in [`shared`](../packages/shared/src/)`;
> failures persist in a new `task_failures` table (forward-only Drizzle migration) + a companion
> `task_events` entry — no editing merged migrations. Watchdog work rides the gateway's **single**
> tick discipline (no parallel schedulers). Nudges reuse **Phase 21 notifications**; slot handling
> reuses the pool's acquire/release guards (a failure-escalated `waiting` task has a dead session,
> so its slot is already released — Decision §7). Fail-open like the PR poller: a watchdog error
> logs `warn` and never breaks task flow.

> Effort tags: **S** small · **M** medium · **L** large. **A** (taxonomy + records) unblocks
> everything — backoff, watchdogs, escalation, and the UI all read the failure class. **B**
> (backoff) makes retries smart; **C** (watchdogs) is the biggest gap and the hardest; **D**
> (escalation + nudges) closes the loop; **E** (board + health view + CLI) makes it visible. A→B/C
> in parallel → D → E.

---

## Current state (strengths ✅ and gaps ❌)

- **State machine** — `backlog` → `todo` → `wip` → `waiting` → `done`/`abandoned`
  ([`shared/src/task.ts`](../packages/shared/src/task.ts)). **Ad-hoc**, imperative, spread across the
  web transition map + gateway services + the runner. `waiting` = agent blocked (no PR / needs input /
  gate failed); `abandoned` = terminal (timeout / retries exhausted / cancel).
- ✅ **Crash retry** — [`agent-runner.service.ts`](../packages/gateway/src/pool/agent-runner.service.ts)
  `onExit`: non-zero exit while `wip`/`waiting` → `retryCount >= config.agent.maxRetries` (3) ⇒ `abandoned`,
  else `safeRetry` (`retryCount++`, → `todo`). Recorded as `task_events` `agent.retried` `{ retryCount }`.
  ❌ **No backoff** (immediate re-queue), ❌ **no class** (retries regardless of why).
- ✅ **Per-run timeout** — `config.agent.runTimeoutMs` (30 min) armed per slot; expiry ⇒ `cancel` ⇒ `abandoned`.
  ❌ The **only** time-based guard.
- ✅ **Boot recovery** — `onModuleInit`: pty requeues `wip`/`waiting`; tmux reattaches live / requeues dead /
  reaps stray. Solid — keep untouched.
- ❌ **`waiting` is a black hole** — entered from the Stop hook (no PR), the Notification hook (needs input),
  or a gate-fail with no auto-fix ([`lifecycle-hook.controller.ts`](../packages/gateway/src/pool/lifecycle-hook.controller.ts)).
  **No timeout, no nudge, no auto un-wait** — a human must drag it back. With `config.agent.waitingHoldsSlot`
  (default true), an input-blocked PTY **holds its slot forever**.
- ❌ **No failure taxonomy / reason** — crash/timeout/gate-fail/cancel all become `abandoned`; the task row has
  no `failureReason`/`failureClass`. `task_events` (`{ id, taskId, at, kind, data }`) is coarse; gate detail lives
  in `taskCheckRuns` but isn't linked to abandonment.
- ❌ **No stuck-state watchdog** — the scheduler tick
  ([`agent-pool-scheduler.service.ts`](../packages/gateway/src/pool/agent-pool-scheduler.service.ts), 5s, fills
  free slots from `listReadyTodoTasks()`) never assesses **time-in-status**: no `wip` inactivity/heartbeat check,
  no aged-`todo` detector, no `waiting` timeout.

---

## Theme A — Failure taxonomy + failure records — **M** — ✅ DONE (PR #271, 2026-07-02)

Name every failure and remember it. Unblocks backoff, watchdogs, escalation, and the UI.

- [x] **shared:** a `FailureClassSchema` enum — `crash` | `timeout` | `no-pr` | `gate-failed` | `tool-denied` |
      `inactivity` | `retries-exhausted` | `unknown` — with a `FAILURE_RETRYABLE` mapping (crash+timeout+inactivity);
      a `TaskFailureSchema` (`taskId`, `class`, `detail`, `exitCode?`, `lastOutput?` snippet, `retryIndex`, `at`); a
      typed `WaitReason`.
- [x] **gateway:** a `task_failures` table (migration `0063`) + a `TaskFailuresRepository`; record a typed failure
      at the existing sites — `onExit` (`crash`), run-timeout (`timeout`), gate-fail (`gate-failed`) — with a
      best-effort `lastOutput` tail. Emit a companion `task_events` `agent.failed` `{ class, detail }`. (`tool-denied`
      is a defined enum arm, wired when Phase 50's blast-radius lands.)
- [x] Classification is **one place** — a pure `classifyFailure(site)` helper the runner calls — so a new failure
      mode adds one `case`, not scattered `if`s. Recording is **purely additive** (no task-state change).

---

## Theme B — Retry backoff + class-aware retry — **M** — ✅ DONE (PR #277, 2026-07-02)

Retry the things worth retrying, and give them room to breathe.

- [x] **Exponential backoff + jitter** between retries (config: `agent.retryBackoffBaseMs`, `maxBackoffMs`).
      Persist a `nextRetryAt` (new `tasks.next_retry_at` column, migration 0065); `listReadyTodoTasks(now)` **skips a
      task until its `nextRetryAt` elapses** (SQL-gated) — so a crash-looping task doesn't hammer the pool. Full
      jitter (`random(0, min(base·2^n, cap))`); `base=0` disables backoff (instant retry = pre-Phase-53 behaviour).
- [x] **Class-aware:** retry is gated on `isRetryableFailure` — `crash`/`timeout` auto-retry with backoff; a
      non-retryable exit **abandons immediately** rather than re-running identically (Theme D will later escalate
      these to needs-attention). A run timeout now routes through the same backoff-retry path instead of straight to
      `abandoned`.
- [x] Each retry records its attempt + class in `task_failures` (via the Theme A `recordFailure` at each site), so
      "failed 3× — all timeouts" is a queryable fact; the `agent.retried` event now carries `nextRetryAt`.

---

## Theme C — Stuck-state watchdogs — **L**

Notice the tasks that quietly stopped moving. The biggest gap.

- [ ] A **watchdog pass** (a dedicated interval, or folded into the existing scheduler tick — never a second
      scheduler) evaluating **time-in-status** against config thresholds, fail-open.
- [ ] Detections + actions: (1) **`wip` inactivity** — no session output for N min (a per-session `lastActivityAt`
      heartbeat off the terminal stream) ⇒ classify `inactivity`, cancel + retry-or-escalate; (2) **`wip` past
      timeout with a lost timer** (belt-and-suspenders after a crash/reattach) ⇒ reconcile; (3) **`waiting` too
      long** ⇒ nudge then escalate (Theme D); (4) **aged `todo`** (ready but never picked up, or blocked by an
      `abandoned` blocker) beyond N ⇒ flag for attention.
- [ ] Thresholds in [`config`](../packages/shared/src/config/) (`agent.watchdog.*`), all opt-out-able (`0` = off =
      today's behavior).

---

## Theme D — Escalate-to-human + waiting nudges — **M** — ✅ DONE (PR #281, 2026-07-03)

Fail loudly: a failed task becomes visible work, not a silent tombstone.

- [x] **Escalation model:** on a **non-retryable** failure or **exhausted** retries, route to a **needs-attention**
      state — **reuse `waiting`** with a typed `waitReason` (`agent-failed` / `timed-out` / `retries-exhausted` /
      `gate-failed`) + the linked `task_failures` record — **instead of silent `abandoned`** (Decision §1).
      `abandoned` remains the **explicit** human give-up terminal. Behind `agent.escalateOnFailure` (default on;
      off restores the pre-Phase-53 straight-to-abandoned path). Reason mapping lives beside `classifyFailure`.
- [x] **Waiting nudges:** a task in `waiting` beyond N hours fires a **Phase 21 notification** (escalating
      reminders; config `agent.waitingNudge.*`), so "needs input" doesn't rot. A configurable max
      (`maxReminders`) before it stops. A **dedicated `WaitingNudgeService` interval** (not the scheduler — no
      scheduling decisions), fail-open; `afterHours = 0` disables it (default = behaviour-preserving).
- [x] **Resolution actions:** a human (or CLI) resolves a needs-attention task → **requeue** (`→ todo`, clears the
      wait), **re-plan** (requeue with a fresh prompt — human-triggered; auto-re-plan is out of scope, Decision §5),
      or **abandon** (explicit terminal) via `POST /tasks/:id/resolve` + typed web/CLI client methods. Slot-safe: a
      failure-escalated `waiting` task's session is already dead,
      so no slot is held (Decision §7).

---

## Theme E — Board "needs attention" + failures/health view + CLI — **L**

Make resilience something you can see.

- [ ] **Board:** a **"Needs attention"** grouping/filter (derived: `waiting` tasks with a failure `waitReason`) +
      a **failure-reason chip** on the task card (class + retry count); the task detail shows the `task_failures`
      history (what failed, when, exit code, last-output snippet) + retry timeline.
- [ ] **Failures / health view:** recent failures by class, retry timelines, a **stuck-task list** (wip-silent,
      aged-todo) and a **waiting-too-long list** — the operator's "what's wedged?" page.
- [ ] **CLI:** `midnite tasks doctor` (stuck/waiting/failing summary), `midnite tasks failures [--class …]`, and a
      resolve helper (requeue/abandon) — respects global `--json`. Typed client methods in
      [`web/lib/api.ts`](../packages/web/lib/api.ts) + [`cli/src/client.ts`](../packages/cli/src/client.ts).

---

## Files this phase touches (map)

- **New/edit (shared):** `FailureClass` / `TaskFailure` / `WaitReason` schemas + `agent.watchdog.*`,
  `agent.retryBackoff*`, `agent.waitingNudge.*` config in [`shared/src/`](../packages/shared/src/) /
  [`config/`](../packages/shared/src/config/); client methods in [`web/lib/api.ts`](../packages/web/lib/api.ts) +
  [`cli/src/client.ts`](../packages/cli/src/client.ts)
- **New (gateway):** `task_failures` table in [`db/schema.ts`](../packages/gateway/src/db/schema.ts) + a
  forward-only [`drizzle/`](../packages/gateway/drizzle/) migration; a `TaskFailuresRepository`; a
  `lib/classify-failure.ts` helper; a watchdog service (or a watchdog pass on the scheduler)
- **Edit (gateway):** [`agent-runner.service.ts`](../packages/gateway/src/pool/agent-runner.service.ts) (classify +
  record at `onExit`/`cancel`/gate-fail; escalate-vs-abandon; backoff `nextRetryAt`);
  [`agent-pool-scheduler.service.ts`](../packages/gateway/src/pool/agent-pool-scheduler.service.ts) (skip
  backing-off tasks; watchdog pass); [`tasks.service.ts`](../packages/gateway/src/tasks/tasks.service.ts)
  (`waitReason` + resolution transitions); a per-session `lastActivityAt` heartbeat in the terminal stream
- **Edit (web):** the board (needs-attention grouping/filter + failure chip),
  [`task-detail.tsx`](../packages/web/components/task-detail.tsx) (failure history + retry timeline); a new
  failures/health view
- **New (cli):** `tasks doctor` / `tasks failures` / resolve commands in [`cli/src/index.ts`](../packages/cli/src/index.ts)
- **Reuse:** Phase 21 notifications, the pool slot guards, boot recovery, `taskCheckRuns` (gate detail) — no changes
  to their contracts.

---

## Verification

- [ ] A **crashing** task retries with **exponential backoff** (visible `nextRetryAt`, not an instant re-queue),
      and each attempt is recorded with its **class** in `task_failures`; a `gate-failed`/`tool-denied` failure
      **does not** blindly auto-retry.
- [ ] On **exhausted retries** or a **non-retryable** failure, the task escalates to a **visible needs-attention
      state** (`waiting` + `waitReason` + a failure record) — **never silently `abandoned`**; `abandoned` only via
      explicit give-up.
- [ ] A **`wip` session that goes silent** (no output for the configured window) is detected, classified
      `inactivity`, and cancelled + retried/escalated; an **aged `todo`** and a **`wip` with a lost timer** are
      likewise caught.
- [ ] A task stuck in **`waiting`** past the threshold fires an escalating **notification nudge**; a human/CLI can
      **requeue / re-plan / abandon** it, and requeue clears the wait.
- [ ] The board shows a **"Needs attention"** grouping + a **failure-reason chip**; the task detail shows the
      failure history + retry timeline; the **failures/health view** lists recent failures by class, stuck tasks,
      and waiting-too-long tasks; `midnite tasks doctor`/`failures` report the same.
- [ ] **Defaults preserve behavior:** with watchdog/backoff/nudge thresholds unset (`0`), the lifecycle behaves as
      before this phase; **boot recovery** and the pty/tmux paths still work unchanged.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green (shared taxonomy units; gateway
      classify/record + backoff-skip + watchdog-detection + escalate-vs-abandon tests with fakes; a boot-recovery
      regression; web RTL for the needs-attention board + failure history; CLI snapshot).

---

## Decisions / open questions

1. **Escalate via `waiting` + `waitReason`, not a new status** *(settled).* Reusing `waiting` (already "needs a
   human") keeps the ad-hoc state set stable and lets the board **derive** "needs attention" — mirroring Phase 27's
   choice to compute "blocked" rather than store it. A failure carries a typed `waitReason` + a `task_failures`
   record. `abandoned` becomes the **explicit** give-up terminal. *(Alt considered: a dedicated `needs_attention`
   status — clearer semantics, but invasive across the three ad-hoc transition sites.)*
2. **Failure records in a `task_failures` table** *(recommend).* A queryable table (not just `task_events` text)
   powers the health view + backoff decisions; a companion event keeps the thread readable.
3. **Class-aware retry + backoff** *(recommend).* Only `retryable` classes auto-retry, with exponential backoff +
   jitter gated by `nextRetryAt`; the rest escalate. Prevents crash-loops and pointless identical re-runs.
4. **Watchdog rides the single tick discipline** *(recommend).* A watchdog pass (dedicated interval or folded into
   the scheduler) — **never a second scheduler**. Config-driven thresholds, fail-open, opt-out at `0`.
5. **Auto-re-plan is out of scope** *(settled).* You chose **escalate-to-human** as the default; re-plan is a
   human-triggered resolution action, not automatic. Auto-re-plan-on-failure is a future theme.
6. **Inactivity via a session heartbeat** *(recommend).* Record `lastActivityAt` off the terminal output stream
   (ties to the Phase 51 session stat); `wip` with no output past the window is the `inactivity` signal.
7. **Slot safety** *(note).* A failure-escalated `waiting` task's session is already dead (slot released by
   `onExit`); only an input-blocked `waiting` holds a slot (`waitingHoldsSlot`). The watchdog must distinguish the
   two and never double-release.
8. **Don't refactor the state machine** *(settled).* This is an additive resilience layer over the existing
   transitions — a formal state-machine library refactor, ML failure prediction, and cross-task root-cause
   correlation are all deferred.
