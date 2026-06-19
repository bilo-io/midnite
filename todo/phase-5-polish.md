# Phase 5 — Polish ⚠️ PARTIAL

> tmux / warp / iterm backends, multi-repo, priorities, retries.

> **Status (2026-06-19): partial.** Priorities, retries, lint/format, CI, and the test suites all landed. The alternative spawner backends and the per-repo scheduling/convention features are outstanding. Scoping in [outstanding.md](outstanding.md).

## Spawner backends

- [ ] `TmuxSpawner` — **NOT IMPLEMENTED**
- [ ] `WarpSpawner` — **NOT IMPLEMENTED**
- [ ] `ItermSpawner` — **NOT IMPLEMENTED**

> `terminal.mode` in config accepts `pty | tmux | warp | iterm`, but only `pty` is wired — the value is never read. A pluggable `Spawner` interface does not yet exist (PTY logic lives directly in `terminal.service.ts`).

## Scheduling improvements

- [x] Priorities on tasks (`priority: 0..3`, default 1), scheduler picks highest first (oldest-first within a priority) — migration `0018`
- [x] Retries for tasks that hit a crash → requeue, capped by `agent.maxRetries` (default 3), then `abandoned`
- [ ] Per-repo concurrency caps (don't run N agents on the same repo) — **NOT IMPLEMENTED** (pool is a single global FIFO)
- [ ] Optional: suspend `waiting` sessions so the slot frees up — **NOT IMPLEMENTED** (deliberately deferred; `waitingHoldsSlot` defaults to holding)

## Multi-repo / quality of life

- [ ] Per-repo branch naming conventions in `midnite.json` — **NOT IMPLEMENTED** (`RepoConfig` is just `{ name, path }`)
- [ ] PR template injection per repo — **NOT IMPLEMENTED**
- [x] eslint + prettier across the workspace — `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`
- [x] CI: typecheck + test + build + lint on PR — `moon ci` via [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) (plus a tagged-release workflow)
- [x] Vitest suites for `shared` (zod schemas) and `gateway` (controllers, scheduler, services) — 270+ gateway tests
