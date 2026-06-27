# Features

A high-level tour of what **midnite** does. midnite is *Multitask Claude Code* — a
task orchestrator wrapped around a pool of Claude Code agents. You drop in a
freeform list of work, it classifies and queues each item, then runs them in
parallel across N agent slots — driven from a CLI or a browser kanban, all
mediated by a single long-running **gateway** daemon.

For setup and the full configuration reference see the [README](../README.md);
for how the pieces fit together see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Task board

A kanban board with the lifecycle `backlog → todo → wip → waiting → done →
abandoned` (plus an `abandoned` escape hatch). Drive it from the CLI or the
browser — both talk to the same gateway over REST + WebSocket, so the board
updates live everywhere at once.

- **Smart intake** — paste a freeform list and each item is auto-classified
  (bug / feature / question / chore) and triaged into a starting column. Bulk and
  paste-add are supported.
- **Linked context** — GitHub issue/PR URLs and other links in a task's prompt
  are resolved and folded into the agent's seed prompt (best-effort, fail-open).

## Agent pool & scheduler

A pool of N agent slots, filled by a scheduler that picks the next `todo` task by
**priority** (Low / Normal / High / Urgent) and then age (oldest first).

- Spawns Claude Code sessions to do the work.
- **Retries on crash**, enforces run timeouts, and supports **per-repo
  concurrency caps** so two agents never race on the same working tree.
- Start tasks **autonomously** (the scheduler fills free slots) or **manually**
  (a Start button / dragging a card into *In progress*).

## Browser-embedded terminals

Watch agents work in real time. The gateway owns each session's PTY and streams
it to an `xterm.js` terminal in the browser.

- **Human-in-the-loop approvals** — gate risky commands on your OK.
- **Reconnect / reattach** — terminals survive page reloads; with the `tmux`
  backend, in-flight runs survive a gateway restart.

## Repo registry

DB-backed, CRUD-able repos that resolve each task's working directory.

- Per-repo concurrency caps.
- Branch-prefix and PR-body conventions injected into the agent prompt.

## Knowledge files

Point midnite at a folder of Markdown notes (runbooks, conventions, domain
knowledge). When a task starts, the plan model picks the relevant files and their
content is injected into the seed prompt — so agents always have your standing
context on hand. Live-watched, so edits are picked up without a restart.

## Workflows, Councils & Brainstorms

A node-based **workflow builder** with an expression engine, reshape/storage
nodes, run history, live run streaming, and CLI commands. Plus:

- **Councils** — multi-agent deliberation over a question.
- **Brainstorms** — generative idea sessions.

## Dashboards & office

- **Office view** — a visual layout of the agent fleet at work.
- **Widget dashboard** — configurable widgets for throughput, system health, LLM
  cost & usage, shipped PRs, and activity, plus market / weather / news /
  world-clock widgets.

## LLM usage tracking

Per-call cost recording across the fleet, with optional **soft budgets** to keep
spend in view.

## Live PR status

A gateway-owned poller keeps each task's GitHub PR state/CI/review status fresh
(gh-first, with an anonymous fallback for public repos). Fail-open — a missing
`gh` or a network hiccup never breaks the board.

## Component library & design system

**`@midnite/ui`** — a reusable, framework-agnostic component library with design
tokens and a Storybook catalog, consumed by the web app and documented in the
docs site.

## Apps & distribution

- **Browser UI** — the primary kanban + terminals experience (installable as a
  PWA).
- **CLI** — a full client for the board and workflows.
- **Desktop app** — wraps the web UI; per-platform installers (macOS
  arm64/x64 `.dmg`, Windows x64 `.exe`, Linux x64 `.AppImage`) are built on every
  tagged release and published to the public companion repo for download.
- **Public site** — the marketing / landing site.
