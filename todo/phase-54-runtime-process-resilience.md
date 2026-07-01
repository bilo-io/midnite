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

## Theme A — Boot preflight + config validation + fail-fast — **M**

Boot either healthy or loudly broken — never silently degraded.

- [ ] **shared:** a `PreflightCheck` / `PreflightReport` schema (`name`, `status` `ok`|`warn`|`fail`, `detail`,
      `remedy`) and a `strict` config flag (`gateway.strictBoot`, default false).
- [ ] **gateway:** a `PreflightService` run in bootstrap that validates + reports: **config** parsed (a parse
      failure is a **loud warn**, or `fail` under `strict` — no more silent defaults), **DB** dir writable +
      migrations applied, **`MIDNITE_SECRET_KEY`** present (when secrets/non-loopback need it), the **agent CLI**
      (`claude`) + **`gh`** on PATH, **node-pty/tmux** availability for the configured `terminal.mode`, configured
      **repo paths** resolvable.
- [ ] **Severity model:** hard failures (DB unwritable, agent CLI missing when `poolEnabled`) **fail fast** with an
      actionable message; soft gaps (`gh` missing, key unset on loopback) **warn**. `strictBoot` escalates warns to
      failures. The report feeds the readiness endpoint (Theme B) + `midnite doctor` (Theme F).

---

## Theme B — Readiness / liveness health endpoints — **S-M**

Tell orchestrators + monitors the truth about "ready".

- [ ] **gateway:** split health into **liveness** (`GET /health/live` — process is up, cheap) and **readiness**
      (`GET /health/ready` — DB writable + migrations applied + pool initialized + scheduler running-or-intended +
      spawner available), returning **structured per-check JSON** (reuse the `PreflightCheck` shape). Keep
      `GET /health` as a **liveness alias** (backwards-compatible), auth/rate-limit exempt as today.
- [ ] Readiness reflects **live degradation** (DB went away, spawner backend unavailable), not just boot state —
      it reads the same checks the watchdog + scheduler gate use.

---

## Theme C — Live watchdog: slot-leak + session health (auto-heal) — **L**

Notice — and fix — a pool that's quietly wedging. The core of the #1 half.

- [ ] A **watchdog pass** (folded into the scheduler tick or a dedicated interval — **never a second scheduler**),
      fail-open, config-driven, that reconciles the in-memory pool against reality each cycle.
- [ ] **Detections + auto-heal:** an **orphaned slot** (busy, but its task is missing / already terminal) → reclaim
      + release; a **dead-but-unreleased session** (slot busy, spawner reports not-live) → run the `onExit`-equivalent
      reconcile; a **silent/hung pty** → treat as dead. Auto-healed reclaims **classify** the cause via the
      **Phase 53 failure taxonomy** (`inactivity`/`crash`) and requeue-or-escalate rather than silently dropping.
- [ ] **pty liveness probe:** add a pid-alive check + a **no-output heartbeat** (last-activity window) to the pty
      spawner path so a hung session is caught **before** the 30-min timeout — matching tmux's `pane_dead` poll.
      Emit slot/health metrics.

---

## Theme D — Scheduler resilience: readiness gate + backoff + pause — **M**

Don't tick into a dead database; stop cleanly when asked.

- [ ] **Readiness gate:** the tick checks readiness (DB reachable, pool healthy) **before** doing work; when a
      dependency is down it **skips with exponential backoff** instead of hammering + log-spamming.
- [ ] **Clean pause/resume:** a first-class `pause()`/`resume()` on the scheduler (distinct from `onModuleDestroy`
      clearing the timer) — the **shared mechanism** graceful shutdown (Theme E) uses to stop accepting new work,
      and which **Phase 50's kill switch** can reuse.
- [ ] A tick that throws is contained (already reentrancy-guarded) and now records a health signal that readiness
      (Theme B) reflects.

---

## Theme E — Graceful shutdown: drain in-flight agents — **M-L**

Die on purpose, not by surprise. Where the #1 and #7 halves fuse.

- [ ] Implement the missing shutdown on `AgentRunnerService` (`onModuleDestroy` / `OnApplicationShutdown`): **(1)**
      `scheduler.pause()` — stop accepting new work; **(2)** wait up to a **grace window** (`gateway.shutdownGraceMs`,
      config) for running agents to reach a terminal/`waiting` state; **(3)** for the rest, **requeue (pty)** or
      **detach (tmux)**, clear timeouts, free slots, persist state; **(4)** **WAL-checkpoint + `sqlite.close()`**
      after in-flight writes flush.
- [ ] **Ordering:** this drain must run **before** `TerminalService.onModuleDestroy` kills/detaches PTYs, so tasks
      are moved to a clean state first (Nest destroy order / an explicit orchestration hook — verify + pin it).
- [ ] Record a **"clean shutdown" marker** so the next boot (and Theme F) can report whether the last stop was
      graceful or a crash.

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
