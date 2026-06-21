# Phase 17 — Pluggable spawner & durable tmux sessions

> midnite runs every agent inside a **PTY** that the gateway owns and streams to the browser. The plan always called for a pluggable backend selected by `terminal.mode` ([`config.ts`](../packages/shared/src/config.ts) — the enum exists: `pty | tmux | warp | iterm`), but **only `pty` is wired** and the enum is **never read**. The whole lifecycle lives in one ~880-line file: [`terminal.service.ts`](../packages/gateway/src/terminal/terminal.service.ts) is the **sole owner of `node-pty`** — three spawn paths (`spawnAgentSession` for autonomous task runs, `spawnManagedRun` for councils + ad-hoc, and the on-attach human shell) all funnel through `loadPty()` → `pty.spawn()`. **Phase 17 extracts that lifecycle behind a `Spawner` interface and adds a `tmux` backend whose payoff is durability:** a tmux session outlives the gateway, so an in-flight agent run **survives a gateway restart** instead of being orphaned and requeued. (Closes [`outstanding.md`](outstanding.md) #10, scoped to `tmux` only.)

> **Scope guardrails (CLAUDE.md).** `TerminalService` keeps **all backend-agnostic orchestration** — the bounded ring buffer + scrollback replay, attach tokens, idle-reap, approval/hook wiring, cwd resolution, `onModuleDestroy` cleanup. Only the **process lifecycle** moves behind `Spawner` (`spawn → { pid, write, resize, onData, onExit, kill }`). New config/wire shapes live in [`@midnite/shared`](../packages/shared/src/) — `shared` is the contract; `cli`/`web` stay pure clients and don't learn about backends. New backend code is **additive**: the `pty` path must behave **identically** after the refactor (existing terminal/approval/gateway specs stay green). No second crypto/fetch/IO path; `tmux` reuses the existing streaming path rather than inventing a parallel one.

> **The tmux insight (read first).** tmux's value here is **not** a different I/O model — it's a *durable process*. The cleanest backend is `tmux new-session -d` for the persistent session **plus a node-pty running `tmux attach`** for the live stream, so the entire ring-buffer / resize / streaming machinery is reused unchanged. Sessions are named deterministically (`midnite-<sessionId>`) so on boot the gateway can `tmux list-sessions`, match them against persisted running sessions, and **reattach** — or run the normal `onExit` path for ones that finished while it was down. (The current "reattach" only means a *client* re-attaching to a still-live PTY; a gateway restart today runs `onModuleDestroy` and **kills every PTY**.)

> Effort tags: **S** small · **M** medium · **L** large. Themes are ordered **A → B → C** (the interface gates the backend; the backend gates restart-reattach); **D** rides alongside. Every box starts unchecked — this is net-new work.

---

## Current state (baseline to build on)

- **shared:** `TerminalConfigSchema.mode = z.enum(['pty','tmux','warp','iterm']).default('pty')` ([`config.ts:39`](../packages/shared/src/config.ts)); also `command`, `args`, `scrollbackBytes`, `idleDisposeMs`, `maxSessions`, `inheritSecrets`, `approvals`. The enum is **defined but never consumed** anywhere in the gateway.
- **gateway:** [`terminal.service.ts`](../packages/gateway/src/terminal/terminal.service.ts) (~880 lines) is the **only** module that imports `node-pty` (lazily, via `loadPty()` with a fail-closed `ptyLoadFailed` flag). It owns: `PtyHandle` map, the `OutputFrame[]` ring + `ringBytes` trim, attach-token mint/verify, ad-hoc terminals, `spawnManagedRun`, `spawnAgentSession`, `killManagedRun`, idle-reap, hook/approval `--settings` wiring, `resolveCwd`, and `onModuleDestroy` (kills all live PTYs).
- **consumers of the spawners:** [`pool/agent-runner.service.ts`](../packages/gateway/src/pool/agent-runner.service.ts) → `spawnAgentSession` (autonomous task agent, `sessionId = task id`); [`councils/council-runner.service.ts`](../packages/gateway/src/councils/council-runner.service.ts) → `spawnManagedRun` (×2). All three are the seam.
- **restart behaviour:** none survives. `onModuleDestroy` reaps every PTY; in-flight runs orphan/requeue on next boot. No boot-time session rediscovery exists.
- **tests:** [`terminal.service.spec.ts`](../packages/gateway/src/terminal/terminal.service.spec.ts), [`terminal.gateway.spec.ts`](../packages/gateway/src/terminal/terminal.gateway.spec.ts), [`terminal.e2e.spec.ts`](../packages/gateway/src/terminal/terminal.e2e.spec.ts), `approval.*` — a solid base the refactor must keep green.

---

## Theme A — Extract the `Spawner` interface — **L** — ✅ DONE (PR #56, 2026-06-21)

The dominant, behavior-preserving refactor — node-pty now lives behind a `Spawner` seam; `pty` behaviour is byte-for-byte unchanged (553 gateway tests pass unedited). See [done.md](done.md). **Themes B / C / D landed in PR #72 (2026-06-22) — phase complete.**

### A1. Define `Spawner` + `SpawnHandle` — **S** — ✅ DONE
- [x] `Spawner` / `SpawnSpec` / `SpawnHandle` + `SPAWNER` DI token in [`terminal/spawner/spawner.ts`](../packages/gateway/src/terminal/spawner/spawner.ts). `SpawnHandle` mirrors node-pty's `IPty` surface so the field type swap is the only call-site change. Gateway-internal (no wire shape).

### A2. `PtySpawner implements Spawner` — **M** — ✅ DONE
- [x] [`terminal/spawner/pty-spawner.ts`](../packages/gateway/src/terminal/spawner/pty-spawner.ts) owns the lazy `require('node-pty')` + fail-closed semantics (throws `SpawnUnavailableError` — never a silent disable) and is the only node-pty importer in the spawn path; a thin pass-through (returns the `IPty` as a `SpawnHandle`). `TerminalService` no longer imports `node-pty`; `PtyHandle.proc` is a `SpawnHandle` and all three paths (`spawnAgentSession`, `spawnManagedRun`, on-attach) route through the injected `Spawner`. Ring/scrollback/tokens/idle-reap/approvals/`resolveCwd`/`onModuleDestroy` unchanged.

### A3. Wire it in the module — **S** — ✅ DONE
- [x] [`terminal.module.ts`](../packages/gateway/src/terminal/terminal.module.ts) provides `SPAWNER` via a `config.terminal.mode` factory (returns `PtySpawner` for every mode until tmux lands). `TerminalService` also defaults the injected spawner to a real `PtySpawner` so direct construction (specs, in-process `serve`) keeps working without DI — existing specs pass unedited.

---

## Theme B — `TmuxSpawner`: durable sessions — **M–L** — ✅ DONE (PR #72, 2026-06-22)

The first alternative backend. A `tmux` session is a process that outlives the gateway; the spawner reuses the existing stream path.

- [x] **`TmuxSpawner implements Spawner`** — [`terminal/spawner/tmux-spawner.ts`](../packages/gateway/src/terminal/spawner/tmux-spawner.ts). `spawn`: `tmux new-session -d -s midnite-<sessionId>` (deterministic name, **Decision §6**) running `exec env … <cmd>` in `cwd`, chained with `set-option remain-on-exit on` in one tmux invocation; then a **node-pty running `tmux attach-session`** for the live byte stream. `write`/`resize` drive the attach-pty; `onData` comes from it; `onExit` fires from a `pane_dead_status` poll so callers get the **real inner exit code** (the attach client's exit code isn't the process's); `kill` → `tmux kill-session`.
- [x] **Availability is fail-closed** — `ensureAvailable()` probes `tmux -V`; a missing/unusable binary throws `TmuxUnavailableError` (mirrors `loadPty`'s `ptyLoadFailed`), surfaced to the caller — **never** a silent `pty` fallback.
- [x] **Distinguish kill-vs-detach** — `SpawnHandle.detach?()` kills the attach-pty but leaves the tmux session running; only `kill()` / idle-reap / graceful-stop tears it down. The ring-buffer + scrollback path is reused unchanged (reattach registers a handle exactly like a fresh spawn).
- [x] Reuse [`terminal/lib/`](../packages/gateway/src/terminal/lib/) helpers as-is; no parallel output-processing path — tmux streams through the same `TerminalService` ring/broadcast as `pty`.

---

## Theme C — Backend selection + survive-restart reattach — **M** — ✅ DONE (PR #72, 2026-06-22)

Read the config, prune the dead backends, and make tmux durability real on boot.

### C1. Read `terminal.mode`; drop warp/iterm — **S** — ✅ DONE
- [x] The module factory ([`terminal.module.ts`](../packages/gateway/src/terminal/terminal.module.ts)) selects `PtySpawner` / `TmuxSpawner` by `config.terminal.mode`. `warp`/`iterm` removed from `TerminalConfigSchema.mode` → enum is now `pty | tmux` (**Decision §3**); a config still naming them fails validation (covered by `config.test.ts`). Sample [`midnite.json`](../midnite.json) stays `pty` (valid); README + [`CLAUDE.md`](../CLAUDE.md) config/spawner docs updated.

### C2. Boot-time session rediscovery + reattach — **M** — ✅ DONE
- [x] Boot recovery moved from `AgentPoolService` to [`AgentRunnerService.onModuleInit`](../packages/gateway/src/pool/agent-runner.service.ts) (it has the slot/timeout/onExit wiring reattach needs; runs after the pool inits, before the scheduler ticks). Under `tmux`: `terminal.liveSessionIds()` (← `tmux list-sessions` for `midnite-*`) is cross-referenced with persisted `wip`/`waiting` tasks; each still-live one is **reattached** via `terminal.reattachAgentSession()` — registered in the `handles` map exactly as a fresh spawn (`maxSessions` stays honest, **Decision §8**).
- [x] A task whose session **died while the gateway was down** is requeued (not orphaned); a live `midnite-*` session with **no** owning `wip`/`waiting` task is reaped via `discardSession` so it isn't double-spawned.

### C3. Don't reap durable sessions on shutdown — **S** — ✅ DONE
- [x] `TerminalService.onModuleDestroy` branches on `spawner.durable`: `tmux` **detaches** each handle (leaves the session running) so a restart can reattach; `pty` still kills. Only explicit `kill` / idle-reap / graceful-stop ends a durable session. Divergence documented in [`CLAUDE.md`](../CLAUDE.md).

---

## Theme D — Spawner contract tests + tmux in CI — **S–M** — ✅ DONE (PR #72, 2026-06-22)

- [x] A **`Spawner` contract spec** ([`spawner.contract.spec.ts`](../packages/gateway/src/terminal/spawner/spawner.contract.spec.ts)) that both backends satisfy: spawn → stream output → `write` reaches the process → `resize` takes → `onExit` fires with the **inner** exit code. Runs against `pty` always and `tmux` **skip-guarded** on `tmux -V` (it ran green locally — tmux present). Plus pure-helper unit tests ([`tmux-spawner.test.ts`](../packages/gateway/src/terminal/spawner/tmux-spawner.test.ts)) for command/arg/list/status parsing.
- [x] **Survive-restart** behaviour is covered at the recovery layer ([`agent-runner.service.test.ts`](../packages/gateway/src/pool/agent-runner.service.test.ts)): a fresh runner over the same persisted state reattaches live sessions, requeues dead ones, and reaps strays — the deterministic equivalent of a gateway restart without a real cross-process tmux dance.
- [x] All existing terminal/approval/gateway/pool specs stay green (the `pty` refactor is behaviour-preserving — `terminal.service.spec` et al. run unedited). `moon ci` green.

---

## Out of scope (named, not built here)

- **`warp` / `iterm` backends** — native windows bypass the browser xterm stream, approval routing, and the ring buffer; they don't compose with midnite's gateway-owned live-terminal model ([`outstanding.md`](outstanding.md) #10 flags this itself). Removed from the enum (C1), not implemented.
- **Suspending/parking `waiting` sessions** to free a slot — [`outstanding.md`](outstanding.md) #12 / [open-decision #1](open-decisions.md); true process suspension is a separate, harder problem.
- **midnite managing the tmux server** beyond its own `midnite-*` sessions (no global tmux config, no socket management).
- **Multi-host / remote tmux** — sessions are local to the gateway host.

---

## Files this phase touches (map)

- **shared:** [`config.ts`](../packages/shared/src/config.ts) — drop `warp`/`iterm` from `TerminalConfigSchema.mode` (+ schema test update). Only a `mode` string crosses the wire if `web` surfaces the active backend; otherwise no new shapes.
- **gateway:** new `terminal/spawner/` (or `terminal/lib/`) — `spawner.ts` (interface + `SpawnSpec`/`SpawnHandle`), `pty-spawner.ts`, `tmux-spawner.ts`; refactor [`terminal.service.ts`](../packages/gateway/src/terminal/terminal.service.ts) to drive a `Spawner` (remove its direct `node-pty` import); the selection factory + boot reattach hook in [`terminal.module.ts`](../packages/gateway/src/terminal/terminal.module.ts) / `TerminalService` init; `onModuleDestroy` detach-vs-kill split. Consumers ([`pool/agent-runner.service.ts`](../packages/gateway/src/pool/agent-runner.service.ts), [`councils/council-runner.service.ts`](../packages/gateway/src/councils/council-runner.service.ts)) are unchanged — they call the same `TerminalService` methods.
- **cli / web:** no functional change (pure clients). Optional: web shows the active `mode` badge somewhere in the session UI — defer unless trivial.
- **config / docs:** sample [`midnite.json`](../midnite.json) (`terminal.mode` now `pty | tmux`); [`CLAUDE.md`](../CLAUDE.md) (Scheduler/Agent-Pool / terminal notes — pluggable spawner, tmux durability) + README config docs; append to [`done.md`](done.md) as slices land; tick [`outstanding.md`](outstanding.md) #10 (scoped to tmux).

---

## Verification

- [x] With `terminal.mode: 'pty'` (default), every existing terminal behaviour is unchanged: spawn-on-attach, scrollback replay on re-attach, idle-reap, approvals, autonomous agent runs, councils — all green, **no spec edits needed** (terminal/approval/gateway/council specs run unedited).
- [x] With `terminal.mode: 'tmux'`: the contract spec proves a `tmux` session streams output, takes typed input, and resizes — identical surface to `pty` (ran green locally; tmux present). Browser UX is the same path (`TerminalService` ring/broadcast, unchanged).
- [x] **Durability:** reattach is covered deterministically at the recovery layer (`agent-runner.service.test.ts`): a fresh runner over the same persisted state reattaches a still-live session (not requeued). Live cross-process restart against a real long run is left as a manual smoke check (needs a deployed gateway + tmux).
- [x] A tmux session whose inner process exited *while the gateway was down* is requeued on boot, and a live session with no owning task is reaped — no orphan, no double-spawn (recovery test).
- [x] `mode: 'tmux'` with `tmux` not installed fails closed with `TmuxUnavailableError` (no silent `pty` fallback).
- [x] A `midnite.json` naming `warp`/`iterm` fails config validation (`config.test.ts`).
- [x] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across the graph; `moon ci` green. (Web tests run from the **primary checkout**, not a `.git` worktree.)

---

## Decisions / open questions

1. **tmux I/O model** *(recommend: pty-attach).* Run `tmux new-session -d` for durability and a node-pty `tmux attach` for the stream, reusing the entire ring/resize/streaming path. The alternative — `tmux pipe-pane` capture + `send-keys` — is a second I/O path with worse fidelity (no clean resize/exit signal). Pty-attach wins.
2. **Durability scope** *(settled in brainstorm: full).* Survive-restart reattach (Theme C) is **in scope** — it's the reason to choose tmux over pty. Without it tmux buys nothing.
3. **warp/iterm fate** *(settled in brainstorm: dropped).* Removed from the `mode` enum → `pty | tmux`. Honest about what's supported; accepts the breaking config change (a clear validation error guides anyone who set them).
4. **Default backend** *(recommend: pty).* `pty` stays the default; tmux is opt-in via `terminal.mode`. No behaviour change for existing users until they flip the flag.
5. **Spawn paths covered** *(recommend: all uniformly).* `spawnAgentSession` (autonomous), `spawnManagedRun` (councils/ad-hoc), and the human shell all go through `Spawner`, so tmux durability applies everywhere — the biggest win is long autonomous/council runs surviving a restart.
6. **Session naming / rediscovery key** *(recommend: deterministic `midnite-<sessionId>`).* Deterministic names let boot-time `tmux list-sessions` match persisted running sessions without extra bookkeeping. `sessionId` is the task id for agent runs; councils/ad-hoc get their existing attach id.
7. **Shutdown semantics divergence** *(recommend: mode-dependent).* `pty` shutdown kills (PTYs can't outlive the process); `tmux` shutdown detaches (sessions must survive). Documented so the asymmetry isn't surprising.
8. **`maxSessions` accounting across restart** *(open).* On reattach, rebuild the live-session count from rediscovered tmux sessions so the `maxSessions` cap stays honest. Confirm in the C2 PR.
