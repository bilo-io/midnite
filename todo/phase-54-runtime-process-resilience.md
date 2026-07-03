# Phase 54 — Runtime & Process Resilience (boot clean, run watched, die gracefully)

> midnite runs as a **long-lived daemon** that spawns and supervises agent sessions. Phase 53
> hardened the *task* lifecycle (stuck tasks, failures, escalation); Phase 54 hardens the
> **gateway process itself** — the worker that executes those tasks. The grounding is honest:
> the bones are good (boot recovery, idempotent slot acquire, a 30-min timeout, `enableShutdownHooks()`,
> WAL journaling, tmux's `pane_dead` poll) but the runtime/shutdown **choreography has holes**.
> `AgentRunnerService` has **no `onModuleDestroy`**, so SIGTERM abandons in-flight agents with no
> drain; there's **no slot-leak watchdog** (an orphaned slot is reclaimed only on restart); **pty
> sessions have no liveness probe** (a hung PTY looks alive until the 30-min timeout); boot does
> **no preflight** (bad config silently defaults; missing `claude`/DB-write/secret-key are all
> discovered at runtime); and `/health` **always returns `{ok:true}`** regardless of whether the DB
> or pool is actually usable. This phase fills the process-lifecycle gaps: **boot** (preflight +
> validation + readiness) → **run** (auto-healing watchdog) → **shutdown** (drain + clean close).

> **Scope guardrails (CLAUDE.md).** All **gateway + shared + web/CLI surface** — no new domain.
> The watchdog **rides the single tick discipline** (a pass, not a second scheduler); the
> scheduler pause/resume is **one shared mechanism** used by graceful shutdown (and reusable by
> Phase 50's kill switch). Boot recovery, the pty/tmux `Spawner` split (Phase 17), and
> `TerminalService.onModuleDestroy` are **preserved** — new shutdown logic is **ordered around
> them** (drain *before* PTYs are killed), not a rewrite. New config lives in the
> [`shared` zod schema](../packages/shared/src/config.ts) with safe defaults (behavior-preserving
> when unset). Readiness/preflight checks are **structured data** (zod), surfaced by an endpoint +
> CLI, not ad-hoc logs. `synchronous=NORMAL` + WAL already prevent corruption on a hard kill; this
> phase adds *graceful* flush + close on top. Fail-open like the existing poller — a watchdog or
> readiness error logs `warn`, never crashes the process.

> Effort tags: **S** small · **M** medium · **L** large. **A** (preflight) + **B** (readiness)
> are the boot half; **C** (watchdog) + **D** (scheduler resilience) are the run half; **E**
> (graceful shutdown) is where the two halves fuse; **F** surfaces it. A/B → C/D → E → F.

---

## Current state (strengths ✅ and gaps ❌)

- **Bootstrap** — [`main.ts`](../packages/gateway/src/main.ts) → [`bootstrap.ts`](../packages/gateway/src/bootstrap.ts):
  `loadConfigFromDisk()` → `assertAuthForHost()` (✅ fail-closed on non-loopback) → `NestFactory.create`
  → `enableCors` → `WsAdapter` → ✅ `enableShutdownHooks()` → `listen`. Module order (guaranteed by Nest):
  `DbModule` (migrations in `DbFactory.get`) → config → tasks → `AgentPoolService` →
  `AgentRunnerService.onModuleInit` (recovery) → `AgentPoolScheduler.onModuleInit` (tick).
- ✅ **Boot recovery** — [`agent-runner.service.ts`](../packages/gateway/src/pool/agent-runner.service.ts)
  `onModuleInit`: pty requeues stale `wip`/`waiting`; tmux reattaches live / requeues dead / reaps stray.
- ✅ **Slot management** — [`agent-pool.service.ts`](../packages/gateway/src/pool/agent-pool.service.ts):
  fixed slot array, **idempotent `acquire`** (double-acquire returns the same signal), `release`,
  `freeSlotCount`, `slotForTask`; `start()` try/catch releases on spawn error. ❌ **No leak watchdog** —
  an orphaned busy slot (task deleted externally, exception past the guard) frees only on restart.
- ✅ **Timeout circuit breaker** — `runTimeoutMs` (30 min) → `cancel`. ❌ **pty has no liveness poll** —
  a silently hung PTY looks live until the timeout (tmux polls `pane_dead` every 400ms; pty relies on `onExit`).
- ❌ **No graceful drain** — `AgentRunnerService` has **no `onModuleDestroy`**. `TerminalService.onModuleDestroy`
  kills (pty) / detaches (tmux) PTYs, but slots aren't drained and in-flight tasks aren't moved to a clean state.
- ❌ **No boot preflight** — [`load-config.ts`](../packages/gateway/src/lib/load-config.ts) falls back to schema
  defaults on missing/bad config (**silent**); DB-writable, `claude`/`gh` on PATH, node-pty/tmux availability,
  `MIDNITE_SECRET_KEY` are all discovered at first use.
- ❌ **`/health` is binary** — [`health.controller.ts`](../packages/gateway/src/health/health.controller.ts)
  returns `{ ok: true }` always; no readiness (DB/pool/scheduler) vs. liveness split (auth/rate-limit already
  exempt it).
- ❌ **Scheduler ticks into errors** — [`agent-pool-scheduler.service.ts`](../packages/gateway/src/pool/agent-pool-scheduler.service.ts)
  has a reentrancy guard + clears its timer on destroy, but no readiness gate + no backoff if the DB is unhealthy,
  and no pause distinct from teardown.
- ✅ **DB durability** — [`db.module.ts`](../packages/gateway/src/db/db.module.ts): WAL, `synchronous=NORMAL`,
  `busy_timeout=5000`, memoized handle. ❌ **Never closed on shutdown** (WAL mitigates corruption, but no graceful
  checkpoint+flush).

---

## Theme A — Boot preflight + config validation + fail-fast — **M** — ✅ DONE (PR #275, 2026-07-02)

Boot either healthy or loudly broken — never silently degraded.

- [x] **shared:** `PreflightCheck` / `PreflightReport` (+ `Readiness`/`Liveness`) schemas (`name`, `status`
      `ok`|`warn`|`fail`, `detail`, `remedy`) + `worstStatus()` + a `gateway.strictBoot` flag (default false).
- [x] **gateway:** a `PreflightService` run in bootstrap (Nest service, explicit call after the module graph is up,
      before `listen()`) validates + reports: **config** parsed (parse failure → **warn**, `fail` under strict),
      **DB** writable + migrations applied, **`MIDNITE_SECRET_KEY`** presence, the **agent CLI** (`claude`) + **`gh`**
      on PATH, **node-pty/tmux** availability for `terminal.mode`, configured **repo paths** resolvable. All checks
      live in one shared `HealthService` (reused by Theme B, and later the C watchdog).
- [x] **Severity model:** hard failures (DB unwritable, agent CLI / spawner missing when `poolEnabled`) → **log the
      report + `process.exit(1)`**; soft gaps (`gh` missing, key unset, missing repo paths) **warn**. `strictBoot`
      escalates warns to failures. Fail-open: a probe that throws degrades to a result, never crashes the check.

---

## Theme B — Readiness / liveness health endpoints — **S-M** — ✅ DONE (PR #275, 2026-07-02)

Tell orchestrators + monitors the truth about "ready".

- [x] **gateway:** split health into **liveness** (`GET /health/live` — process up, cheap, no DB) and **readiness**
      (`GET /health/ready` — DB reachable + pool initialized + scheduler running-or-intended + spawner available),
      returning **structured per-check JSON** (the `PreflightCheck` shape) with **200 ready / 503 not-ready**. Kept
      `GET /health` as a **liveness alias** (backwards-compatible); all `/health/*` auth + rate-limit exempt.
- [x] Readiness **re-evaluates the cheap checks live each request** (DB ping, spawner, pool, scheduler), so it
      reflects post-boot degradation — it reads the same `HealthService` checks the watchdog + scheduler gate will use.

---

## Theme C — Live watchdog: slot-leak + session health (auto-heal) — **L** — ✅ DONE (PR #280, 2026-07-03)

Notice — and fix — a pool that's quietly wedging. The core of the #1 half.

- [x] A **watchdog pass** — `PoolWatchdogService.sweep()` **folded into the scheduler tick** (never a second scheduler),
      fail-open (per-slot try/catch + a guarded call site), config-driven (`agent.watchdog.enabled`), reconciling the
      in-memory slots against reality each cycle. Runs first in the tick (before the pause check) so a fully-busy
      wedged pool is healed even under a global pause.
- [x] **Detections + auto-heal:** an **orphaned slot** (task missing / terminal / no longer running) → reclaim +
      release (`reclaimOrphanedSlot`); a **lost/dead session** (no live process → `onExit` will never fire) → reconcile
      as a crash; a **silent/hung pty** → reconcile as inactivity. Reconcile **mirrors stop/cancel** (state-first, then
      kill; frees the slot exactly once) and **classifies** via the **Phase 53 taxonomy** (`crash`/`inactivity`),
      retry-or-escalating through the runner.
- [x] **pty liveness probe:** `isSessionAlive(sessionId)` added to the **Spawner interface** — pty tracks its spawned
      handles + a pid-alive check, tmux checks the pane isn't dead. `TerminalService.agentRunHealth()` adds a
      **no-output heartbeat** (`lastDataAt`); the inactivity probe (`agent.watchdog.inactivityMs`, opt-in, pty-only)
      catches a hung session **before** the 30-min timeout. Reclaim ON by default; inactivity probe opt-in so a
      quiet-but-live agent isn't killed.

---

## Theme D — Scheduler resilience: readiness gate + backoff + pause — **M** — ✅ DONE (PR #285, 2026-07-03)

Don't tick into a dead database; stop cleanly when asked.

- [x] **Readiness gate:** the tick probes `HealthService.dbReachable()` (cheap `SELECT 1`, fail-open) **before**
      doing work; when the DB is down it **skips with exponential backoff** (`min(baseMs·2^n, maxMs)`, config
      `agent.readinessBackoff.*`) instead of hammering + log-spamming — logs once per re-probe, recovers on the
      first success. Fail-open: no `HealthService` wired ⇒ no gate (pre-Phase-54-D behaviour).
- [x] **Clean pause/resume:** a first-class `pause()`/`resume()`/`isPaused()` — the interval keeps firing (resume
      is instant, `isRunning()` stays true), distinct from `onModuleDestroy` clearing the timer and from Phase 50's
      business `isGloballyPaused` (the tick short-circuits on **either**). The **shared mechanism** graceful
      shutdown (Theme E) will drain with; reusable by the kill switch. *(Kept alongside Phase 50's pause rather than
      refactoring it — Stage-2.5.)*
- [x] A tick that skips for unreadiness / is paused records a health signal `/health/ready` reflects
      (`checkScheduler` → `warn` when paused or backing off). Wired via a `PoolModule ⇄ HealthModule` forwardRef
      (`@Optional` both ways; DI graph verified to resolve).

---

## Theme E — Graceful shutdown: drain in-flight agents — **M-L** — ✅ DONE (PR #287, 2026-07-03)

Die on purpose, not by surprise. Where the #1 and #7 halves fuse.

- [x] `AgentRunnerService.onModuleDestroy`: **(1)** `scheduler.pause()` (via a runner⇄scheduler forwardRef) — stop
      accepting new work; **(2)** wait up to the **grace window** (`gateway.shutdownGraceMs`, default 10s, `0` =
      immediate) polling the pool for running agents to finish; **(3)** for the rest, **requeue (pty)** — their
      sessions die with the process — or **leave (tmux)** to detach + reattach on boot, clearing run timers either
      way; **(4)** DB **WAL-checkpoint + `sqlite.close()`** in `DbFactory.onModuleDestroy`. Fail-open.
- [x] **Ordering pinned:** the runner injects `TerminalService` + (global) `Db`, so Nest destroys it **before**
      them (dependents first) — the drain runs before `TerminalService.onModuleDestroy` kills/detaches PTYs and
      before `DbFactory` closes (which, being `@Global`, runs last). Verified via a full-graph `NestFactory.create`.
- [x] **Clean-shutdown marker:** a `runtime_meta` singleton (migration `0068`) + `RuntimeMetaService` — boot stamps
      `clean=false`, the drain flips `clean=true`; a still-`false` value at the next boot means the last process
      crashed. `previousShutdownClean()` feeds Theme F.

---

## Theme F — Runtime health in UI + CLI — **M**

Make process health visible, not guessed.

- [ ] **web:** a runtime/status view — slots used/free, degraded readiness checks, spawner mode, uptime, and the
      **last-shutdown-clean** flag — reading `/health/ready` + the preflight report.
- [ ] **cli:** `midnite doctor` — runs the preflight + readiness checks against a running gateway and prints a
      pass/warn/fail table (respects global `--json`); a great first-response tool when something's off.
- [ ] Typed client methods in [`web/lib/api.ts`](../packages/web/lib/api.ts) + [`cli/src/client.ts`](../packages/cli/src/client.ts).

---

## Files this phase touches (map)

- **New/edit (shared):** `PreflightCheck` / `PreflightReport` / readiness schemas + `gateway.strictBoot` /
  `gateway.shutdownGraceMs` / watchdog + backoff config in [`config.ts`](../packages/shared/src/config.ts);
  client methods in [`web/lib/api.ts`](../packages/web/lib/api.ts) + [`cli/src/client.ts`](../packages/cli/src/client.ts)
- **New (gateway):** `PreflightService` (run from [`bootstrap.ts`](../packages/gateway/src/bootstrap.ts));
  a watchdog service (or a watchdog pass on the scheduler); readiness endpoints in
  [`health/health.controller.ts`](../packages/gateway/src/health/health.controller.ts) (+ a `HealthService`
  aggregating checks)
- **Edit (gateway):** [`agent-runner.service.ts`](../packages/gateway/src/pool/agent-runner.service.ts) (add
  graceful `onModuleDestroy` drain; classify auto-healed reclaims); [`agent-pool.service.ts`](../packages/gateway/src/pool/agent-pool.service.ts)
  (leak detection helpers); [`agent-pool-scheduler.service.ts`](../packages/gateway/src/pool/agent-pool-scheduler.service.ts)
  (readiness gate + backoff + `pause`/`resume`); the **pty** spawner
  ([`terminal/spawner/pty-spawner.ts`](../packages/gateway/src/terminal/spawner/pty-spawner.ts)) / terminal service
  (pid-alive + no-output heartbeat); [`db/db.module.ts`](../packages/gateway/src/db/db.module.ts) (checkpoint + close
  on shutdown); [`bootstrap.ts`](../packages/gateway/src/bootstrap.ts) (preflight + shutdown ordering)
- **New (web):** a runtime/status view (Settings or a dedicated page)
- **New (cli):** `midnite doctor` in [`cli/src/index.ts`](../packages/cli/src/index.ts)
- **Reuse:** boot recovery, the `Spawner` interface, `TerminalService.onModuleDestroy`, the Phase 53 failure
  taxonomy, Phase 50's kill switch (shares `pause`) — behavior-preserving where noted.

---

## Verification

- [ ] **Boot preflight:** starting with a **bad/missing config**, a **read-only DB dir**, or **`claude` absent
      while `poolEnabled`** produces a **loud, actionable** failure (fail-fast under `strictBoot`), not a silent
      default-boot; soft gaps (`gh` missing) **warn**. The report is retrievable.
- [ ] **Readiness vs. liveness:** `/health/live` is up whenever the process is; `/health/ready` returns **not-ready**
      (with the failing check) when the DB is unwritable or the pool/scheduler isn't up; `/health` still works
      (liveness alias).
- [ ] **Slot-leak auto-heal:** an orphaned busy slot (its task deleted/terminal) is **reclaimed within one watchdog
      cycle** (not only on restart); sustained exhaustion can't silently deadlock the pool.
- [ ] **pty liveness:** a **hung/silent pty** session is detected via the heartbeat and reconciled **well before**
      the 30-min timeout; tmux `pane_dead` detection still works.
- [ ] **Scheduler degradation:** with the DB made unavailable, the tick **backs off** instead of hammering + log-
      spamming, and readiness reflects the degradation; recovery resumes ticking.
- [ ] **Graceful shutdown:** on SIGTERM, new scheduling **stops**, running agents get the **grace window** to finish,
      the rest are **requeued (pty) / detached (tmux)** with slots freed + timeouts cleared, the **DB is checkpointed
      + closed**, and a **clean-shutdown marker** is written; a restart shows no orphaned slots/sessions.
- [ ] **Surface:** the web status view shows slots/degradation/last-shutdown-clean; `midnite doctor` prints the
      preflight + readiness table.
- [ ] **Defaults preserve behavior:** with new config unset, boot/run/shutdown behave as before (drain grace, strict
      boot, backoff all opt-in); boot recovery + pty/tmux paths unchanged.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green (shared schema units; gateway preflight +
      readiness + watchdog auto-heal + drain-on-destroy + scheduler-backoff tests with fakes; a boot-recovery +
      clean-shutdown regression; web RTL for the status view; CLI `doctor` snapshot).

---

## Decisions / open questions

1. **Drain-with-timeout on shutdown** *(settled).* Stop scheduling → grace window for agents to finish → requeue
   (pty) / detach (tmux) the rest → checkpoint + close the DB. Balances work-preservation against a bounded exit.
   The drain runs **before** `TerminalService` kills PTYs — pin the ordering explicitly.
2. **Watchdog auto-heals** *(settled).* Reclaim orphaned/dead slots + reconcile the task (classified via Phase 53),
   not just alert. Fail-open, on the single tick discipline — never a second scheduler.
3. **Add a pty liveness probe** *(recommend).* A pid-alive + no-output heartbeat gives pty the circuit-breaker tmux
   already has (`pane_dead`), so a hung session doesn't wait out the full 30-min timeout.
4. **Preflight severity: fail-fast hard, warn soft, `strict` escalates** *(recommend).* Keep fail-open as the default
   (don't regress existing installs) but make gaps **loud + actionable**; `gateway.strictBoot` turns warns into
   hard failures for production.
5. **Liveness/readiness split, `/health` kept as alias** *(recommend).* `/health/live` + `/health/ready` for
   orchestrators; the legacy `/health` stays as liveness for backwards compatibility.
6. **One pause/resume mechanism** *(settled).* The scheduler's `pause`/`resume` serves graceful shutdown **and** is
   reusable by Phase 50's kill switch — don't build two.
7. **DB checkpoint + close on shutdown** *(recommend).* WAL + `synchronous=NORMAL` already prevent *corruption* on a
   hard kill; this adds a graceful flush + `sqlite.close()` in the drain sequence so a clean stop loses nothing.
8. **Out of scope** *(settled).* DB referential-integrity / cross-domain FK enforcement (the separate #4 direction),
   multi-node / HA / distributed coordination, and OS/container resource limits are deferred — this phase is the
   single-process lifecycle.
