# Phase 2 — Agents

> Pool + scheduler + `pty` spawner + Claude Code hooks → status callbacks. `todo`s actually run.

## Agent pool

- [ ] `AgentPoolService` — N idle/busy slots, N = `config.agent.pool`
- [ ] Tick-based scheduler: idle slot + a `todo` task → assign → spawn
- [ ] Decision: hold the slot while `waiting` (recommended v1) — implement and document

## Spawner

- [ ] `Spawner` interface (`spawn(task) → { pid, sessionId, stdout$, stdin$ }`)
- [ ] `PtySpawner` using `node-pty`, launches `claude code` in the configured repo
- [ ] Stream stdout to an in-memory ring buffer per task (later consumed by xterm.js in the browser)

## Claude Code hook integration

- [ ] Generate a per-session hook config: Notification → `POST /tasks/:id/waiting`, Stop → `POST /tasks/:id/done`
- [ ] `POST /tasks/:id/waiting` — flips `wip` → `waiting`
- [ ] `POST /tasks/:id/done` — flips `wip` → `done`, captures PR URL via `gh pr view --json url` if available
- [ ] Provide a fallback "agent crashed" path (pty exit without `Stop` hook) → `abandoned`

## Done criteria

- [ ] `midnite add "fix typo in README"` on a real repo → agent spawns, edits file, opens a PR, task lands in `done` with `prUrl`
