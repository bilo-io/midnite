# Phase 2 — Agents ✅

> Pool + scheduler + `pty` spawner + Claude Code hooks → status callbacks. `todo`s actually run.

> **Status (2026-06-19): complete.** Autonomous scheduling ships behind a feature flag (`agent.poolEnabled`, default **off**); a manual `POST /tasks/:id/start` path lets a user kick a task off on demand regardless of the flag. Lives under [`gateway/src/pool/`](../packages/gateway/src/pool/).

## Agent pool

- [x] `AgentPoolService` — N idle/busy slots, N = `config.agent.pool` — [`agent-pool.service.ts`](../packages/gateway/src/pool/agent-pool.service.ts)
- [x] Tick-based scheduler: idle slot + a `todo` task → assign → spawn — [`agent-pool-scheduler.service.ts`](../packages/gateway/src/pool/agent-pool-scheduler.service.ts) (gated on `poolEnabled`)
- [x] Decision: hold the slot while `waiting` — implemented and configurable via `agent.waitingHoldsSlot` (default `true`); see [open-decisions.md](open-decisions.md)

## Spawner

- [x] PTY spawning launches the session command in the configured repo — _implemented inside [`terminal/terminal.service.ts`](../packages/gateway/src/terminal/terminal.service.ts), not as a standalone `Spawner` interface. The pluggable-`Spawner` abstraction was deferred (only `pty` exists today — see [phase-5-polish.md](phase-5-polish.md))._
- [x] `node-pty` spawner
- [x] Stream stdout to a byte-bounded ring buffer per session (consumed by xterm.js in the browser)

## Claude Code hook integration

- [x] Per-session hook config with a per-session secret — [`pool/lifecycle-hook.controller.ts`](../packages/gateway/src/pool/lifecycle-hook.controller.ts)
- [x] Notification hook → `waiting` — _routed as `POST /hooks/sessions/:sessionId/notification` (not `/tasks/:id/waiting`); authenticated by `x-midnite-hook-secret`_
- [x] Stop hook → `done` (captures PR URL from output; else flips to `waiting`) — _routed as `POST /hooks/sessions/:sessionId/stop`_
- [x] Fallback "agent crashed" path (pty exit without `Stop` hook) → retry up to `agent.maxRetries`, then `abandoned`

## Done criteria

- [x] A task runs in an agent, the session streams to a live terminal, and lifecycle hooks transition it through `wip → waiting/done` with a PR URL captured when present
