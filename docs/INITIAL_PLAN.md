# midnite — Multitask Claude Code

A task orchestrator wrapped around a pool of Claude Code agents. Drop in a freeform list, let it classify each item, queue them, and run them in parallel across a pool of agent slots — interact via CLI or browser kanban.

## Mental model

You dump a freeform list → midnite classifies each item → ready items queue as `todo` → a scheduler assigns them to free agent slots → each slot spawns a Claude Code session (in a managed pty or a native terminal window) → status transitions flow back as the agent works → done tasks land with a PR link.

Everything is mediated by a single long-running **gateway**. The CLI and the browser are both clients of it.

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
       │ (client)│    │  (React) │      │ sessions ×N     │
       └─────────┘    └──────────┘      │ (pty / terminal)│
                                        └───────┬─────────┘
                              hooks (Stop/Notification) │
                                        callbacks ──────┘
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

## Repo layout (moon + proto)

```
midnite/
├── .prototools                 # pins node, pnpm via proto
├── .moon/
│   ├── workspace.yml           # declares projects
│   ├── toolchain.yml           # node + pnpm setup for moon
│   └── tasks.yml               # shared task defaults (lint, test, build)
├── packages/
│   ├── shared/  moon.yml       # zod config schema, types, task state machine
│   ├── gateway/ moon.yml       # Fastify + ws + SQLite + scheduler + spawners
│   ├── cli/     moon.yml       # commander client + `midnite serve`
│   └── web/     moon.yml       # React + Vite kanban
├── midnite.json                # per-project user config
├── knowledge/                  # MD knowledge base
├── package.json
└── pnpm-workspace.yaml
```

**`.prototools`** (proto pins toolchain versions):

```toml
node = "22.11.0"
pnpm = "9.15.0"
```

**`.moon/toolchain.yml`** (moon picks up the same versions):

```yaml
node:
  version: '22.11.0'
  packageManager: 'pnpm'
  pnpm:
    version: '9.15.0'
typescript:
  syncProjectReferences: true
```

**`.moon/workspace.yml`**:

```yaml
projects:
  - 'packages/*'
```

**Per-package `moon.yml`** (e.g. `packages/gateway/moon.yml`):

```yaml
type: 'application'
language: 'typescript'
dependsOn: ['shared']
tasks:
  build:
    command: 'tsc -b'
    inputs: ['src/**/*', 'tsconfig.json']
  dev:
    command: 'tsx watch src/main.ts'
    local: true
  test:
    command: 'vitest run'
```

Cross-package task graph is first-class — `moon run gateway:build` will build `shared` first; `moon run :dev` fans out across all packages.

## Tech stack

- **Toolchain**: **proto** (manages node/pnpm versions) + **moon** (runs tasks across packages with caching & affected-only builds).
- **Gateway**: Node + **Fastify** (HTTP) + **ws** (WebSocket). State in **SQLite via better-sqlite3 + Drizzle**.
- **CLI**: **commander** for commands. Optionally **Ink** (React-for-terminals) for a live TUI board.
- **Web**: **React + Vite**, **@dnd-kit** for kanban drag-drop, **TanStack Query** + WS subscription, **xterm.js** to stream agent terminals into the browser.
- **Process spawning**: **node-pty** for managed sessions; native spawners for tmux/warp/iterm.
- **Config**: **zod** schema in `shared`, single source of truth across CLI / gateway / web.

## Data model

```ts
type Status = 'backlog' | 'todo' | 'wip' | 'waiting' | 'done' | 'abandoned';

interface Task {
  id: string;
  title: string;            // original list line
  kind?: 'bug' | 'feature' | 'question' | 'chore' | 'unknown';
  repo?: string;
  prompt?: string;          // generated execution prompt
  status: Status;
  agentId?: string;
  sessionId?: string;       // Claude Code session id
  prUrl?: string;
  events: TaskEvent[];      // append-only timeline
}

interface AgentSlot {
  id: string;
  status: 'idle' | 'busy';
  taskId?: string;
  pid?: number;
}
```

## Agent pool & scheduler

- N slots, where N = `agent.pool` from config.
- Tick-based scheduler: when a slot is idle and a `todo` exists, pick the highest-priority one → `wip` → spawn a session in the slot.
- **Open decision:** does `waiting` hold its slot? Claude Code blocks on input, so the session literally sits there. Holding the slot is simplest and matches reality; releasing it (to start more `todo`s) means suspending the waiting session, which is more powerful but harder. **Recommend holding the slot in v1.**

## Wiring Claude Code → status transitions

The hard part of any orchestrator like this is knowing *when* a task moves `wip → waiting → done` without screen-scraping output. Claude Code's **hooks** give us the clean integration:

- **Notification hook** → `POST /tasks/:id/waiting`  (agent needs input)
- **Stop hook** → `POST /tasks/:id/done`  (and report the PR URL — `gh pr view --json url` or derive from branch)

No terminal parsing. The provider abstraction (`provider: claude`) can also accept the Claude Agent SDK as a headless backend that emits the same lifecycle events as structured callbacks.

## Plan / act split for task inference

The config's `plan` and `act` models map cleanly onto two phases:

1. **Inference (plan model, e.g. opus4.7):** for each list line — detect URLs (fetch GitHub issue/PR context), classify intent, guess the target repo, and either generate an execution prompt (→ `todo`), answer directly (questions), or park if ambiguous (→ `backlog`).
2. **Execution (act model, e.g. sonnet4.7):** the spawned session runs the generated prompt.

## Terminal spawning backends

Abstract a `Spawner` interface; pick one via `terminal.mode`:

- **`pty`** (node-pty) — gateway-managed, streams to the browser via xterm.js. Most portable, best browser UX. **Build first.**
- **`tmux`** — scriptable splits/windows, cross-platform, easy to test.
- **`warp`** — Launch Configs / `warp://` URI scheme.
- **`iterm`** — AppleScript / Python API.

## Knowledge base

A watched folder of MD files (chokidar). v1: let the plan model pick relevant files and inject them as context into generated execution prompts. Later: embeddings/RAG if the KB gets large.

## `midnite.json` config

```json
{
  "agent": {
    "pool": 4,
    "provider": "claude",
    "plan": "opus4.7",
    "act": "sonnet4.7"
  },
  "terminal": { "mode": "pty", "layout": "split" },
  "knowledge": { "dir": "./knowledge" },
  "repos": [
    { "name": "ekko-api", "path": "~/dev/ekko-api" }
  ],
  "gateway": { "port": 7777 }
}
```

## Phased build plan

- **Phase 1 — Board you drive by hand.** Gateway + SQLite store + REST/WS + CLI `add` / `list` / `move`. No agents yet. Proves the data model and live updates.
- **Phase 2 — Agents.** Pool + scheduler + `pty` spawner + Claude Code hooks → status callbacks. `todo`s actually run.
- **Phase 3 — Browser.** React kanban with live WS; xterm.js terminals embedded per task.
- **Phase 4 — Inference.** LLM classification of list items (plan/act split) + KB injection.
- **Phase 5 — Polish.** tmux / warp / iterm backends, multi-repo, priorities, retries.

Phase 1 alone is a usable tool, which keeps the project honest.

## Open decisions to settle

1. **Does `waiting` hold its slot?** (recommend: yes, v1)
2. **First execution backend** — `pty` (best browser story) vs native terminal windows. (recommend: `pty` first, native second.)
3. **Where does this live** — new repo, or a folder under an existing workspace?
