# midnite

> Multitask Claude Code — a task orchestrator wrapped around a pool of Claude Code agents.

Drop in a freeform list, let midnite classify each item, queue them, and run them in parallel across N agent slots. Interact via CLI or browser kanban. Everything is mediated by a single long-running **gateway** daemon.

```
          ┌──────────────────────────────────────────┐
          │              GATEWAY (daemon)             │
          │  task store · scheduler · agent pool      │
          │  REST + WebSocket API · serves web build  │
          └──────────────────────────────────────────┘
            ▲              ▲                    │
   REST/WS  │       REST/WS│            spawns  ▼
       ┌────┴────┐    ┌────┴─────┐      ┌────────────────┐
       │   CLI   │    │  Browser │      │ Claude Code     │
       │ (client)│    │  (Next)  │      │ sessions ×N     │
       └─────────┘    └──────────┘      │ (pty / terminal)│
                                        └─────────────────┘
```

## Status

**Phase 0 — scaffold.** Empty project skeleton in place; nothing runs end-to-end yet. See [`todo/`](todo/) for the per-phase checklists and `done.md` log.

- **Phase 0 — Monorepo scaffold:** ✅ files in place; verification on a fresh checkout still pending — see [phase-0-scaffold.md](todo/phase-0-scaffold.md).
- **Phase 1 — Board you drive by hand** (gateway + REST/WS + CLI): ⏳ [phase-1-board.md](todo/phase-1-board.md)
- **Phase 2 — Agents** (pool, scheduler, pty spawner, Claude Code hooks): ⏳ [phase-2-agents.md](todo/phase-2-agents.md)
- **Phase 3 — Browser** kanban + embedded terminals: ⏳ [phase-3-browser.md](todo/phase-3-browser.md)
- **Phase 4 — Inference** (plan/act split, KB injection): ⏳ [phase-4-inference.md](todo/phase-4-inference.md)
- **Phase 5 — Polish** (tmux/warp/iterm, priorities, retries): ⏳ [phase-5-polish.md](todo/phase-5-polish.md)

## Quick start

Requires [proto](https://moonrepo.dev/proto) to manage the toolchain versions pinned in [`.prototools`](.prototools) (Node 22.11.0, pnpm 9.15.0).

```sh
proto use                       # install pinned node + pnpm
pnpm install                    # link workspace packages
pnpm moon run :build            # build all packages (respects depends-on graph)

# Run the pieces (each in its own terminal):
pnpm moon run gateway:dev       # Nest gateway on http://localhost:7777
pnpm moon run web:dev           # Next.js kanban on http://localhost:3000
pnpm moon run cli:build && node packages/cli/dist/index.js --help
```

Sanity check the gateway:

```sh
curl http://localhost:7777/health   # → {"ok":true}
```

## Stack

- **Toolchain:** [proto](https://moonrepo.dev/proto) (pins node/pnpm) + [moon](https://moonrepo.dev) (task graph, caching, affected-only builds) + pnpm workspaces.
- **Gateway** ([`packages/gateway`](packages/gateway)): **Nest.js** with the **Fastify** adapter, SQLite via **better-sqlite3 + Drizzle**, WebSockets via `@nestjs/platform-ws`.
- **CLI** ([`packages/cli`](packages/cli)): **commander**.
- **Web** ([`packages/web`](packages/web)): **Next.js** App Router (React 19). `@dnd-kit` for the kanban + `xterm.js` for embedded agent terminals (Phase 3).
- **Shared** ([`packages/shared`](packages/shared)): **zod** config schema + cross-package types (the only place those live).
- **Process spawning** (Phase 2): `node-pty` for managed sessions; tmux/warp/iterm backends in Phase 5.

> Note: [`docs/INITIAL_PLAN.md`](docs/INITIAL_PLAN.md) was written for bare Fastify + React/Vite. The implementation uses Nest.js (with the Fastify adapter underneath) and Next.js instead. Everything else in the plan still holds.

## Repo layout

```
midnite/
├── .prototools                 # proto pins node + pnpm
├── .moon/
│   ├── workspace.yml           # declares projects
│   ├── toolchain.yml           # node + pnpm setup for moon
│   └── tasks.yml               # shared task defaults
├── packages/
│   ├── shared/                 # zod config schema + types (no runtime deps)
│   ├── gateway/                # Nest.js daemon (Fastify adapter)
│   ├── cli/                    # commander CLI client
│   └── web/                    # Next.js App Router kanban
├── midnite.json                # per-project user config (validated by shared)
├── knowledge/                  # MD knowledge base, watched by gateway
├── todo/                       # progress tracker (phase files + done.md)
├── docs/                       # design docs (INITIAL_PLAN.md)
├── CLAUDE.md                   # agent brief / conventions
└── pnpm-workspace.yaml
```

## Task lifecycle

```
backlog ─▶ todo ─▶ wip ⇄ waiting ─▶ done
                    └────────────▶ abandoned
```

- **backlog** — parked / ambiguous
- **todo** — ready, awaiting a free agent slot
- **wip** — actively running in an agent
- **waiting** — agent paused, needs user input
- **done** — completed (with PR URL)
- **abandoned** — killed before completion

The status union and `Task` shape live in [`packages/shared/src/task.ts`](packages/shared/src/task.ts).

## Configuration

User config lives in [`midnite.json`](midnite.json) at the repo root, validated by the zod schema in [`packages/shared/src/config.ts`](packages/shared/src/config.ts). Defaults:

```json
{
  "agent":     { "pool": 4, "provider": "claude", "plan": "opus4.7", "act": "sonnet4.7" },
  "terminal":  { "mode": "pty", "layout": "split" },
  "knowledge": { "dir": "./knowledge" },
  "repos":     [],
  "gateway":   { "port": 7777 }
}
```

Every consumer (gateway, CLI) takes a parsed `MidniteConfig` — never `JSON.parse` the file yourself.

### Authentication

The gateway's classifier calls Anthropic. Two credential sources are supported, tried in this order:

1. **`ANTHROPIC_API_KEY` env var** — used for CI/prod. If set, the gateway uses pay-as-you-go API credits as normal.
2. **Claude CLI login (macOS only, fallback)** — if no env var is set, the gateway reads the OAuth token that the `claude` CLI already manages in the macOS Keychain (`security -s "Claude Code-credentials"`) and uses it as an `authToken`. Run `claude` once to log in; nothing else to configure.

Heads-up when using the fallback:

- Calls consume your **Claude subscription quota**, not pay-as-you-go API credits. Same model, different meter.
- The first time the gateway reads the Keychain entry, macOS will show a one-time "Allow access" prompt. Accept it.
- Token refresh is handled by the `claude` CLI itself — if you see a 401 from Anthropic, re-run `claude` to refresh.
- Linux/Windows are **not** supported by the fallback yet. Set `ANTHROPIC_API_KEY` on those platforms.

If neither source resolves, the classifier degrades to a placeholder (titles from the first line, `kind: "unknown"`) and the gateway logs a warning at startup.

Implementation: [`packages/gateway/src/agent/anthropic-credentials.ts`](packages/gateway/src/agent/anthropic-credentials.ts), wired into [`AnthropicService`](packages/gateway/src/agent/anthropic.service.ts).

## Common commands

```sh
pnpm moon run :build            # build everything
pnpm moon run :typecheck        # workspace-wide tsc --noEmit
pnpm moon run :test             # vitest across the graph (no tests yet)

pnpm moon run gateway:dev       # tsx watch — Nest gateway on :7777
pnpm moon run gateway:build     # tsc -b
pnpm moon run web:dev           # Next.js dev server on :3000
pnpm moon run web:build         # next build
pnpm moon run cli:build         # tsc -b → packages/cli/dist/index.js
```

Prefer `moon run <project>:<task>` over invoking `pnpm`/`tsc`/`vitest` directly — moon's affected-detection and caching only work through it.

## Where to go next

- **Designing a change?** Read [`docs/INITIAL_PLAN.md`](docs/INITIAL_PLAN.md) first.
- **Picking up work?** Open the relevant `todo/phase-N-*.md` and grab an unchecked box. When you finish, move it into [`todo/done.md`](todo/done.md) (most-recent first).
- **Coding conventions?** [`CLAUDE.md`](CLAUDE.md) is the agent brief — it also documents the layering rules, package boundaries, and the golden rule (`shared` is the contract).
