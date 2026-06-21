# Phase 30 — Quality gates: verified completion

> midnite's premise is **start a batch and walk away** — but today "done" means only that the agent's Stop hook fired with a PR URL in its output ([`lifecycle-hook.controller.ts:50-60`](../packages/gateway/src/pool/lifecycle-hook.controller.ts)): the gateway calls [`TasksService.markDone()`](../packages/gateway/src/tasks/tasks.service.ts) and frees the slot, **trusting the agent's word**. Nothing re-runs the tests, lint, or build on the branch the agent left. **Phase 30 turns "the agent said done" into "the gateway verified done":** before a task's `done` transition, run a configured set of **checks** (test / lint / build / custom command) in the task's repo working directory, gate the transition on the result, and — opt-in — loop the agent to fix what failed. It's the verification half of unattended execution, the natural successor to dependency-ordered scheduling ([Phase 27](phase-27-task-dependencies.md)): once tasks run in the right order, the gate makes each one's *completion* trustworthy.

> **Scope guardrails (CLAUDE.md).** The gate is a new gateway **`checks` module** (`controller? → service → repository`): the runner executes user-configured commands via a bounded `execFile` in a **resolved repo cwd** — a short, non-interactive **batch** concern, deliberately **not** routed through the PTY [`Spawner`](../packages/gateway/src/terminal/spawner/) (which exists for long-lived interactive sessions). The decision logic (run → pass/fail → done / fix / wait) is **business logic in a service**, not the thin Stop-hook controller. New wire shapes (`Check`, `CheckResult`, `CheckRun`, the `config.checks` block) live in [`@midnite/shared`](../packages/shared/src/) with zod schemas; `cli`/`web` stay pure clients. Check runs are **DB-backed** via a new normalized child table (forward-only migration; mirrors `task_events`) — no triggers, no cross-domain FKs, a task references its runs **by id** (intra-domain). **No new task status** (Decision §3, per [Phase 27](phase-27-task-dependencies.md)) — "verifying" / "checks failing" is *derived* from the latest run + a task event, so the `backlog · todo · wip · waiting · done · abandoned` state machine and all its consumers stay untouched. Repo cwd resolution **reuses** [`ReposService.findByName()`](../packages/gateway/src/repos/repos.service.ts) — no second path. `shared` is the contract.

> Effort tags: **S** small · **M** medium · **L** large. Themes ordered **A → B → C/D** (the runner + contract gate the `done`-transition gate, which gates the auto-fix loop and the surfaces). **A → B is the spine**; **C** (auto-fix) and **D** (surfaces) layer on and are independently shippable. Settled in brainstorm: failure action is **gate + opt-in auto-fix loop** (Theme C, default off); checks are configured **globally with per-repo-name overrides**. Every box starts unchecked — this is net-new work.

---

## Current state (baseline to build on)

- **The `done` seam (where the gate slots in):** the autonomous Stop hook fires at the end of *every* agent turn; it treats the turn as completion **only when a PR URL is in the output**, then calls `tasks.markDone(sessionId, prUrl)` + `runner.complete(sessionId)` ([`lifecycle-hook.controller.ts:50-60`](../packages/gateway/src/pool/lifecycle-hook.controller.ts)). No PR → `markWaiting`. This is the single chokepoint a gate intercepts.
- **`markDone` is idempotent and event-emitting** ([`tasks.service.ts:194-210`](../packages/gateway/src/tasks/tasks.service.ts)): → `done`, optionally records `prUrl`, inserts an `agent.done` event, emits `task.updated`. Sibling transitions `markWaiting` / `retry` / `requeue` follow the same shape — the gate reuses these, it doesn't fork a new transition path.
- **A retry budget already exists (the precedent, and a thing NOT to reuse):** the PTY's `onExit` retries a crashed run up to `config.agent.maxRetries`, then abandons ([`agent-runner.service.ts:112-142`](../packages/gateway/src/pool/agent-runner.service.ts)). A **gate-fix** loop needs its **own** budget (`checks.autoFix.maxAttempts`) — a failed check is not a crash, and conflating the two would let flaky tests burn the crash budget.
- **Repo → cwd resolution is solved:** a task's `repo` reference resolves through [`ReposService.findByName()`](../packages/gateway/src/repos/repos.service.ts) → a real filesystem `path`, and the terminal already picks that cwd via `resolveCwd` ([`terminal.service.ts`](../packages/gateway/src/terminal/terminal.service.ts)). Checks run in the **same cwd**, on the **branch the agent left** (it has already pushed + opened the PR by the time Stop fires).
- **The child-table pattern to mirror:** `task_events`, `task_links`, `task_attachments` — normalized children keyed by `task_id`, queried only in [`tasks.repository.ts`](../packages/gateway/src/tasks/tasks.repository.ts). A `task_check_runs` table fits this exactly (Decision §1).
- **Manual start funnels through the same seam:** `POST /tasks/:id/start` ([`pool.controller.ts`](../packages/gateway/src/pool/pool.controller.ts)) kicks a run that ends through the **same Stop hook → `markDone`** — so gating the seam covers autonomous *and* manual completions with no extra wiring.
- **Config precedent (track-and-warn, the shape NOT to copy here):** `config.usage` carries **soft budgets** that warn but **never block** ([`usage.ts:119-125`](../packages/shared/src/usage.ts)). Checks are the opposite — a **blocking gate** — but the optional, defaulted, back-compatible config-block style is the pattern to follow.
- **No checks concept anywhere:** nothing in [`config.ts`](../packages/shared/src/config.ts), [`db/schema.ts`](../packages/gateway/src/db/schema.ts), or the pool models verification. Latest migration is [`0030_repos`](../packages/gateway/drizzle/) → this phase's is `0031`.

---

## Theme A — Check runner + contract (shared + gateway) — **M**

The engine everything keys off: what a check *is*, and a service that runs a list of them in a cwd and reports structured results.

### A1. `config.checks` schema + per-repo overrides — **S–M**
- [ ] Extend [`config.ts`](../packages/shared/src/config.ts) with an optional, defaulted `checks` block (so existing `midnite.json` keeps validating):
  - `enabled` (default **false** — opt in), `gates: Check[]` (defaults applied to any repo), `byRepo: Record<repoName, Check[]>` (per-repo **override**, not merge — Decision §5), `autoFix: { enabled (default false), maxAttempts (default 2) }`, `perCheckTimeoutMs` (default e.g. 10min), `outputCapBytes` (default e.g. 16 KiB).
  - `Check = { name, command, cwd? (repo-relative), timeoutMs? }`. zod + tests; read only via `loadConfig()`.
- [ ] A pure helper `resolveChecksForRepo(config, repoName) → Check[]` in `shared` (`byRepo[name] ?? gates`), unit-tested — both the gateway and any client agree on which checks apply.

### A2. `Check` / `CheckResult` / `CheckRun` wire shapes — **S**
- [ ] New [`checks.ts`](../packages/shared/src/) in `shared`: `CheckResult = { name, command, exitCode, passed, durationMs, output (truncated) }`; `CheckRun = { id, taskId, trigger: 'gate' | 'manual' | 'auto-fix', startedAt, finishedAt, passed, results: CheckResult[] }`; a `CheckRunStatus` for the derived board affordance. zod schemas + barrel export + tests; typed client functions stubbed for Theme D.

### A3. `ChecksService` runner (gateway) — **M**
- [ ] New `checks` module: `ChecksService.run(taskId, checks, cwd, trigger) → CheckRun`. Each check runs via **bounded `node:child_process` `execFile`** (shell-parsed command), with a **per-check timeout** that kills the child → `passed: false`, output captured and **ring-buffer-truncated** to `outputCapBytes`. Runs are sequential (predictable, cwd not contended); first definition is enough — parallelism is a later optimization.
- [ ] Fail-safe + boundary: the runner **never throws into the lifecycle path** (a spawn error → a failed `CheckResult`, not an unhandled rejection); it owns no task status (that's Theme B); it resolves no config itself (takes a resolved `Check[]` + `cwd`). Unit tests with a fake command set: all-pass, one-fail, timeout-kill, spawn-error, output truncation.

---

## Theme B — Gate the `done` transition (gateway) — **M**

Wire the runner into the `markDone` seam so completion is verified, and persist every run.

### B1. `task_check_runs` table + repository — **S–M**
- [ ] Normalized `task_check_runs` child table (`id`, `task_id`, `trigger`, `passed`, `started_at`, `finished_at`, `results` JSON; indexed by `task_id`) — forward-only migration `0031`, mirroring `task_events`. Repository methods (Drizzle only): `insertRun`, `runsForTask(taskId)`, `latestRunForTask(taskId)`.

### B2. Intercept the seam — **M**
- [ ] Route the Stop-hook completion through a single orchestration method (Decision §2 — recommend it lives in [`AgentRunnerService`](../packages/gateway/src/pool/agent-runner.service.ts), which already owns the slot/session/timeout) instead of the controller calling `markDone` + `complete` directly. The controller stays thin: `runner.completeWithChecks(sessionId, prUrl)`.
- [ ] Decision flow: resolve the task's checks (A1 helper) for its repo. **Skip the gate** (→ `markDone` as today) when checks are disabled, the task has **no repo**, or the resolved set is empty. Otherwise: keep the **slot held** (task stays `wip`, cwd not contended by another run), run the gate (A3) in the resolved cwd, persist the run (B1), then branch:
  - **all pass** → `markDone(prUrl)` + reap the session (today's behaviour, now earned).
  - **any fail** → do **not** mark done; record the failure and take the failure action (default → `markWaiting`; Theme C if auto-fix is enabled).

### B3. Derived "verifying" / "checks failing" + events — **S–M**
- [ ] No new status (Decision §3): insert `checks.started` / `checks.passed` / `checks.failed` task events, and surface state as a **derived** flag computed from the latest `task_check_runs` row (`verifying` while a gate run is in flight, `failing` when the latest gate run failed and the task isn't `done`). Emit `task.updated` so the board reflects it.
- [ ] Tests (`:memory:`): a passing gate completes the task; a failing gate holds it at `waiting` with a recorded run + `checks.failed` event; a repo-less task and a checks-disabled config both pass straight through unchanged; the slot is released exactly once in every branch.

---

## Theme C — Auto-fix loop (gateway, opt-in) — **M–L**

Close the loop: on a failed gate, optionally hand the failures back to the agent instead of waiting for a human. **Behind `checks.autoFix.enabled`, default off** (Decision §4).

- [ ] **Re-spawn with failures folded in** — when a gate fails and auto-fix is enabled and the fix budget isn't exhausted, re-spawn an agent session for the **same task** (slot still held) with a follow-up seed prompt: *"The PR you opened has failing checks: «truncated per-check output». Fix them and update the existing PR."* Reuse the existing `terminal.spawnAgentSession` + the runner's start path; the cwd is still on the agent's branch, so a normal push **updates the same PR**.
- [ ] **Dedicated, separate budget** — count attempts against `checks.autoFix.maxAttempts` on a **new `fixAttempts` counter** (not `retryCount`; not `agent.maxRetries`). Each re-spawn's completion re-enters the gate (B2), so success after a fix marks done; budget exhaustion falls back to `markWaiting` with a clear "checks still failing after N fix attempts" event.
- [ ] **Guardrails** — flaky/`timeout`-killed checks count as failures (don't special-case); a fix re-spawn obeys the same `agent.runTimeoutMs`; the loop can never bypass the gate (it always re-verifies). Tests: pass-after-one-fix marks done; budget exhaustion lands at `waiting`; auto-fix **off** = Theme B's notify/wait path exactly.

---

## Theme D — Surfaces: web + CLI — **M**

Run the gate on demand, and see results everywhere a task lives.

- [ ] **On-demand gate** — `POST /tasks/:id/check` (thin controller → `ChecksService` via the same orchestration, `trigger: 'manual'`): re-run a task's checks any time (e.g. after a human edit, or before merging) without changing status. Typed client in [`api.ts`](../packages/web/lib/api.ts). This is the shared substrate for the web "re-run" button and the CLI command.
- [ ] **Web checks panel** — in the task thread ([`task-thread-modal.tsx`](../packages/web/components/task-thread-modal.tsx)): the latest run's per-check pass/fail, duration, and an expandable output excerpt; a **"Re-run checks"** button; run history. A derived **"checks failing"** / **"verifying"** badge on [`task-card.tsx`](../packages/web/components/task-card.tsx) (locked/dimmed affordance, like Phase 27's "blocked" chip) — no column move.
- [ ] **CLI** — `midnite check <id>` ([`cli/src/`](../packages/cli/src/)): trigger a run and render per-check pass/fail (chalk + table), exit non-zero if the gate fails. Thin: parse → typed client → render.
- [ ] **End-to-end coverage** — gate passes → done; gate fails → held (+ auto-fix loop when enabled → fixed → done); manual `POST /tasks/:id/check`; repo-less / disabled pass-through; CLI render snapshot.

---

## Out of scope (named, not built here)

- **Pre-PR gating** — checking the working tree *before* the agent opens the PR (vs. catching a bad PR after). That would require changing the agent's seed/instructions to "checks then PR"; Phase 30 is **CI-style, post-PR** — the gate catches and (auto-fix) iterates on the PR that exists.
- **Reading external CI status** (GitHub Actions / checks API on the PR) — that's [Phase 22](phase-22-fleet-visibility.md)'s PR-status poller. Phase 30 runs checks **locally** in the repo cwd; it does not consume remote CI.
- **Per-task ad-hoc checks** beyond the repo-level config — a task can't define its own one-off command set; checks come from `config.checks` (global + `byRepo`). The DB-backed per-repo-entity route (a `checks` column edited in the repos UI) is a deferred follow-on (Decision §5).
- **A new `verifying` / `failing` task status** — stays *derived*; no state-machine change (Decision §3).
- **Parsing test output for granular pass counts / coverage thresholds** — the gate is **exit-code based** (0 = pass). Coverage gating, flaky-test quarantine, and structured test-report parsing are later.
- **Cost/budget gating** (pausing on spend) — a different axis; the separate cost-governance direction, not this phase.
- **Parallel check execution** — runs are sequential in v1 for predictability and to avoid cwd contention; parallelism is an optimization, not required.

---

## Files this phase touches (map)

- **shared:** `checks` block in [`config.ts`](../packages/shared/src/config.ts) + `resolveChecksForRepo` helper; new [`checks.ts`](../packages/shared/src/) (`Check` / `CheckResult` / `CheckRun` + zod + status); barrel + tests; typed client funcs (`runChecks`, fetch runs).
- **gateway:** new **`checks` module** (`checks.service.ts`, `checks.module.ts`, a `lib/` runner around `execFile`); `task_check_runs` in [`db/schema.ts`](../packages/gateway/src/db/schema.ts) + forward-only migration `0031`; run methods in [`tasks.repository.ts`](../packages/gateway/src/tasks/tasks.repository.ts); the gate orchestration + auto-fix re-spawn in [`agent-runner.service.ts`](../packages/gateway/src/pool/agent-runner.service.ts); thinned Stop-hook call in [`lifecycle-hook.controller.ts`](../packages/gateway/src/pool/lifecycle-hook.controller.ts); `checks.started/passed/failed` events + derived flag via [`tasks.service.ts`](../packages/gateway/src/tasks/tasks.service.ts); `POST /tasks/:id/check` on [`tasks.controller.ts`](../packages/gateway/src/tasks/tasks.controller.ts); cwd via [`ReposService`](../packages/gateway/src/repos/repos.service.ts) (reuse).
- **web:** checks panel + re-run in [`task-thread-modal.tsx`](../packages/web/components/task-thread-modal.tsx); derived badge on [`task-card.tsx`](../packages/web/components/task-card.tsx); client calls in [`lib/api.ts`](../packages/web/lib/api.ts).
- **cli:** `midnite check` command + [`client.ts`](../packages/cli/src/client.ts) wiring in [`cli/src/`](../packages/cli/src/).
- **Docs:** update [`CLAUDE.md`](../CLAUDE.md) (the gateway "Scheduler & Agent Pool" + config sections — checks gate the `done` transition) + README (`config.checks` docs); append to [`done.md`](done.md) as slices land.

---

## Verification

- [ ] With `config.checks.enabled` and a failing test command configured for a repo, an agent run that opens a PR is **held** (not `done`): a `task_check_runs` row + `checks.failed` event exist, the card shows a "checks failing" badge, the task sits at `waiting`.
- [ ] Make the checks pass (fix or adjust), hit **Re-run** (or `midnite check <id>`) → the gate passes and the task moves to `done` with the PR URL recorded.
- [ ] A passing gate on first completion marks `done` exactly as before (no behaviour change when checks pass).
- [ ] A task with **no repo**, and any task when `checks.enabled` is **false**, complete straight through unchanged — the gate is a no-op.
- [ ] With `checks.autoFix.enabled`, a failing gate **re-spawns** the agent with the failure output; a fix that passes re-verifies → `done`; exhausting `maxAttempts` lands at `waiting` with a clear event. Fix attempts are counted **separately** from crash `retryCount` / `agent.maxRetries`.
- [ ] A per-check **timeout** kills the child and records a failed result (doesn't hang the slot); captured output is **truncated** to the configured cap.
- [ ] The slot is held during verification and released **exactly once** on every branch (pass / fail-wait / fail-fix-exhausted / spawn-error).
- [ ] `config.checks.byRepo['x']` **overrides** the global `gates` for repo `x` and leaves other repos on the defaults.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across the graph; `moon ci` green. (Run web tests from the **primary checkout**, not a `.git` worktree.)

---

## Decisions / open questions

1. **Run storage** *(settled in brainstorm).* A normalized **`task_check_runs` child table** (one row per run, `results` JSON), mirroring `task_events`/`task_links` — clean per-task history + latest-run queries, no cross-domain FK.
2. **Where the gate lives** *(recommend; confirm in the B PR).* The orchestration (run → pass/fail → done/fix/wait) belongs in a **service**, not the thin Stop-hook controller. Recommend **`AgentRunnerService`** (it already owns the slot, session, timeout, and the re-spawn the auto-fix loop needs) exposing `completeWithChecks(sessionId, prUrl)`; the controller just calls it. Alternative: a dedicated small orchestrator service injected into the runner.
3. **Verifying/failing representation** *(settled in brainstorm).* **No new status** — derived from the latest run + a task event (per [Phase 27](phase-27-task-dependencies.md)). Avoids state-machine churn and leaves every status consumer untouched.
4. **Failure action** *(settled in brainstorm).* **Gate + auto-fix loop behind a flag** — `checks.autoFix.enabled` defaults **off** (safe: record + `waiting`); on, the agent is re-spawned to fix, bounded by `checks.autoFix.maxAttempts`, then falls back to `waiting`.
5. **Check config granularity** *(settled in brainstorm; one sub-question open).* **Global `config.checks.gates` + per-repo-name `byRepo` overrides** — leverages the [Phase 13](phase-13-repos-first-class.md) registry without touching the repo DB entity. *Open:* `byRepo` **replaces** vs. **merges** with `gates` — recommend **replace** (predictable; a repo opts into exactly its list). The DB-backed per-repo-entity route is a deferred follow-on.
6. **Which tasks are gated** *(recommend).* Any task with a **resolved repo** + a non-empty resolved check set. Repo-less tasks have no cwd to run in → pass through; `question`-kind tasks resolve inline at creation and never reach this seam. Confirm in the B PR.
7. **Default check commands** *(recommend).* **None** — `gates` defaults to empty; the user opts in per install/repo (no guessing `pnpm test` vs `moon run :test`). The runner never infers a command.
8. **Timeout & output caps** *(recommend; tune in the A PR).* A **per-check** timeout (kills that child → fail) rather than one overall budget; output **ring-buffer-truncated** to `outputCapBytes` for storage + display. The agent's `runTimeoutMs` governs a fix **re-spawn**, not the checks themselves.
9. **Trust boundary** *(noted, not a new surface).* Checks are **user-configured commands** run on a **loopback-only** gateway — the same trust level as the agent that already runs arbitrary code in that cwd. Phase 30 introduces no new remote/exec boundary.
