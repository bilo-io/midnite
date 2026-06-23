# Phase 5 — Polish ✅ COMPLETE

> tmux / warp / iterm backends, multi-repo, priorities, retries.

> **Status (2026-06-22): complete.** Priorities, retries, lint/format, CI, and the
> test suites landed in Phase 5 itself. The remaining items were all resolved by
> later phases or deliberately dropped — reconciled here and closed: the spawner
> backend shipped as durable `tmux` in **Phase 17** (the `warp`/`iterm` variants
> were dropped), and the per-repo conventions shipped with the DB-backed repo
> registry in **Phase 13**. Nothing in Phase 5 remains open.

## Spawner backends

- [x] `TmuxSpawner` — ✅ DONE via **Phase 17 B** (PR #77). A pluggable `Spawner` interface ([`terminal/spawner/spawner.ts`](../packages/gateway/src/terminal/spawner/spawner.ts)) selected by `terminal.mode`, with `pty` (default) and durable `tmux` ([`tmux-spawner.ts`](../packages/gateway/src/terminal/spawner/tmux-spawner.ts)) backends; `tmux` sessions survive a gateway restart and reattach on boot.
- [x] `WarpSpawner` — ❌ OUT OF SCOPE — dropped in **Phase 17 C1** (PR #77). `terminal.mode` is now `pty | tmux`; a config naming `warp` fails validation. tmux covers the durability goal; bespoke terminal-emulator backends weren't worth the surface.
- [x] `ItermSpawner` — ❌ OUT OF SCOPE — dropped in **Phase 17 C1** (PR #77), as above.

> ~~`terminal.mode` in config accepts `pty | tmux | warp | iterm`, but only `pty` is wired~~ — superseded: `terminal.mode` is `pty | tmux` ([`config.ts`](../packages/shared/src/config.ts)), the pluggable `Spawner` interface exists, and `tmux` is fully wired (Phase 17).

## Scheduling improvements

- [x] Priorities on tasks (`priority: 0..3`, default 1), scheduler picks highest first (oldest-first within a priority) — migration `0018`
- [x] Retries for tasks that hit a crash → requeue, capped by `agent.maxRetries` (default 3), then `abandoned`
- [x] Per-repo concurrency caps (don't run N agents on the same repo) — `agent.maxPerRepo` (default `0` = unlimited); the scheduler skips a `todo` task whose repo is at the cap and picks the next eligible. Repo-less tasks uncapped. (PR #49)
- [x] ⏳ Suspend `waiting` sessions so the slot frees up — **deliberately deferred** (not closed by code): `waitingHoldsSlot` defaults to `true` (a `waiting` session holds its slot), the conservative behaviour. Revisit if slot pressure from human-in-the-loop waits becomes a real bottleneck.

## Multi-repo / quality of life

- [x] Per-repo branch naming conventions — ✅ DONE via **Phase 13** repo registry. `branchPrefix` is a per-repo field ([`shared/src/repo.ts`](../packages/shared/src/repo.ts), [`gateway/db/schema.ts`](../packages/gateway/src/db/schema.ts)) injected into the agent's seed prompt ([`pool/lib/build-agent-prompt.ts`](../packages/gateway/src/pool/lib/build-agent-prompt.ts)) under a "Repository conventions" section. (Lives on the DB-backed repo registry, not raw `RepoConfig` — the better home.)
- [x] PR template injection per repo — ✅ DONE via **Phase 13**. `prTemplate` is a per-repo field, injected into the agent prompt alongside `branchPrefix` (same `build-agent-prompt.ts`).
- [x] eslint + prettier across the workspace — `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`
- [x] CI: typecheck + test + build + lint on PR — `moon ci` via [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) (plus a tagged-release workflow)
- [x] Vitest suites for `shared` (zod schemas) and `gateway` (controllers, scheduler, services) — 270+ gateway tests

---

> **Closed 2026-06-22.** All boxes are ✅ done or a recorded ⏳ deferred / ❌ out-of-scope; no Phase 5 work remains. See [`done.md`](done.md).
