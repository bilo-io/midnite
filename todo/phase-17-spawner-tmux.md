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

## Theme A — Extract the `Spawner` interface — **L**

The dominant, behavior-preserving refactor. Get the node-pty specifics behind a seam without changing what the terminal does.

### A1. Define `Spawner` + `SpawnHandle` — **S**
- [ ] A `Spawner` interface in the gateway terminal module: `spawn(spec: SpawnSpec) → SpawnHandle`, where `SpawnSpec = { command, args, cwd, env, cols?, rows? }` and `SpawnHandle = { pid, write(data), resize(cols, rows), onData(cb): IDisposable, onExit(cb): IDisposable, kill(signal?) }`. Mirror node-pty's surface so `PtySpawner` is a thin pass-through. Keep it gateway-internal (an implementation detail, not a wire shape) unless `web` needs to *display* the active backend — if so, only a `mode` string crosses into `shared`.

### A2. `PtySpawner implements Spawner` — **M**
- [ ] Move the `loadPty()` / `pty.spawn()` / `onData` / `onExit` / `resize` / `kill` calls out of `TerminalService` into `PtySpawner` (carry the lazy-load + fail-closed `ptyLoadFailed` semantics). `TerminalService` no longer imports `node-pty`.
- [ ] Route **all three** spawn paths — `spawnAgentSession`, `spawnManagedRun`, on-attach shell — through the injected `Spawner`. The ring buffer, scrollback replay, tokens, idle-reap, approval `--settings` wiring, `resolveCwd`, and `onModuleDestroy` cleanup all **stay in `TerminalService`**, now driving a `SpawnHandle` instead of an `IPty`.

### A3. Wire it in the module — **S**
- [ ] Provide the `Spawner` in [`terminal.module.ts`](../packages/gateway/src/terminal/terminal.module.ts) (a factory selecting by `config.terminal.mode`; defaults to `PtySpawner`). `pty` behaviour is **byte-for-byte unchanged** — existing terminal/approval/gateway specs pass without edits.

---

## Theme B — `TmuxSpawner`: durable sessions — **M–L**

The first alternative backend. A `tmux` session is a process that outlives the gateway; the spawner reuses the existing stream path.

- [ ] **`TmuxSpawner implements Spawner`** — on `spawn`: `tmux new-session -d -s midnite-<sessionId>` (deterministic name, **Decision §6**) running the requested command in `cwd` with `env`, then start a **node-pty running `tmux attach -t midnite-<sessionId>`** for the live byte stream. `write` → `send-keys` (or write to the attach-pty); `resize` → resize the attach-pty / `tmux resize-window`; `onData`/`onExit` come from the attach-pty; `kill` → `tmux kill-session`.
- [ ] **Availability is fail-closed** — if `mode: 'tmux'` and the `tmux` binary is absent/unusable, surface a clear error and disable spawning (same contract as `loadPty`'s `ptyLoadFailed`); **never silently fall back to `pty`**.
- [ ] **Distinguish kill-vs-detach** — detaching the attach-pty must **not** end the tmux session (that's the whole point); only `kill()` / idle-reap / graceful-stop tears the session down. Confirm the ring-buffer + scrollback replay path behaves identically to `pty` when re-attaching to a live tmux session.
- [ ] Reuse [`terminal/lib/`](../packages/gateway/src/terminal/lib/) helpers (`oneshot-command`, `clean-output`, …) as-is; no parallel output-processing path.

---

## Theme C — Backend selection + survive-restart reattach — **M**

Read the config, prune the dead backends, and make tmux durability real on boot.

### C1. Read `terminal.mode`; drop warp/iterm — **S**
- [ ] The module factory (A3) selects `PtySpawner` / `TmuxSpawner` by `config.terminal.mode`. **Remove `warp` and `iterm`** from `TerminalConfigSchema.mode` ([`config.ts:39`](../packages/shared/src/config.ts)) → enum becomes `pty | tmux` (**Decision §3** — settled: dropped). Update the sample [`midnite.json`](../midnite.json) + README/[`CLAUDE.md`](../CLAUDE.md) config docs accordingly. (Breaking config change — a config still naming `warp`/`iterm` now fails validation with a clear message.)

### C2. Boot-time session rediscovery + reattach — **M**
- [ ] On gateway start, when `mode: 'tmux'`: `tmux list-sessions` for `midnite-*`, cross-reference the persisted **running** sessions (the DB is the source of truth, CLAUDE.md), and **reattach** a `SpawnHandle` to each still-live session — registering it in the `handles` map exactly as a fresh spawn would, so the existing ring/stream/approval machinery picks up where it left off.
- [ ] A session that **exited while the gateway was down** (named tmux session gone, or its inner process dead) runs the normal `onExit` path — complete/requeue per existing crash/retry policy ([`agent-runner.service.ts`](../packages/gateway/src/pool/agent-runner.service.ts)) — rather than orphaning. Don't double-spawn a task that's still live in tmux.

### C3. Don't reap durable sessions on shutdown — **S**
- [ ] `onModuleDestroy` for `tmux` mode **detaches** (leaves the tmux session running) instead of killing, so a restart can reattach. Only explicit `kill`/idle-reap/graceful-stop ends a session. (For `pty` mode, shutdown still kills — PTYs can't survive the process.) Document the divergence.

---

## Theme D — Spawner contract tests + tmux in CI — **S–M**

- [ ] A **`Spawner` contract spec** that both `PtySpawner` and `TmuxSpawner` satisfy: spawn → receive output → `write` echoes → `resize` takes → `onExit` fires with the right code → `kill` tears down. Run it against each backend (the tmux run **skip-guarded** when `tmux` is absent on the runner).
- [ ] A **survive-restart integration test** (tmux): spawn a long-lived session, simulate a gateway restart (drop + rebuild `TerminalService` against the same persisted state), assert the run is **reattached** (not requeued); a session whose inner process exited mid-restart takes the `onExit`/requeue path.
- [ ] Keep all existing terminal/approval/gateway specs green (proves the `pty` refactor is behaviour-preserving). `moon ci` green.

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

- [ ] With `terminal.mode: 'pty'` (default), every existing terminal behaviour is unchanged: spawn-on-attach, scrollback replay on re-attach, idle-reap, approvals, autonomous agent runs, councils — all green, no spec edits needed.
- [ ] With `terminal.mode: 'tmux'`: create a task → the agent runs in a `midnite-<id>` tmux session; attach from the browser and see live output, type, resize — identical UX to `pty`.
- [ ] **Durability:** start a long agent run under tmux, restart the gateway → the run is **reattached** (still streaming, not requeued); `tmux list-sessions` shows it survived the restart.
- [ ] A tmux session whose inner process exited *while the gateway was down* is detected on boot and takes the normal complete/requeue path — no orphan, no double-spawn.
- [ ] `mode: 'tmux'` with `tmux` not installed fails closed with a clear error (no silent `pty` fallback).
- [ ] A `midnite.json` naming `warp`/`iterm` fails config validation with a clear message.
- [ ] `moon run :typecheck` · `moon run :lint` · `moon run :test` green across the graph; `moon ci` green. (Run web tests from the **primary checkout**, not a `.git` worktree.)

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
