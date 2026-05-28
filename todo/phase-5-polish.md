# Phase 5 — Polish

> tmux / warp / iterm backends, multi-repo, priorities, retries.

## Spawner backends

- [ ] `TmuxSpawner` — scriptable splits/windows
- [ ] `WarpSpawner` — Launch Configs / `warp://` URI
- [ ] `ItermSpawner` — AppleScript / Python API

## Scheduling improvements

- [ ] Priorities on tasks (`priority: 0..3`), scheduler picks highest first
- [ ] Retries for tasks that hit `abandoned` due to crashes
- [ ] Per-repo concurrency caps (don't run 4 agents on the same repo)
- [ ] Optional: suspend `waiting` sessions so the slot frees up (revisit the open decision)

## Multi-repo / quality of life

- [ ] Per-repo branch naming conventions in `midnite.json`
- [ ] PR template injection per repo
- [ ] eslint + prettier across the workspace
- [ ] CI: typecheck + build on PR
- [ ] Vitest suites for `shared` (zod schema) and `gateway` (controllers, scheduler)
