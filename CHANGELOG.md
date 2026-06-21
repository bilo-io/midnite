# Changelog

All notable, user-facing changes to midnite are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning is **lockstep**: at any moment every package shares one
`MAJOR.MINOR`, while `PATCH` advances independently per package (so a `cli`-only
fix can ship while `web` stays put). Release sections are curated from
conventional commits via the `/release-prep` → `/release-complete` flow — and are
kept separate from the phase tracker in [`todo/done.md`](todo/done.md), which logs
build progress rather than release notes.

## [Unreleased]

Heading toward the first tagged release (`0.1.0`). The curated highlights below
cover what has landed since the initial scaffold; the exact, grouped notes are
finalised when the release is cut.

### Added

- **Task board** — a kanban (`backlog → todo → wip → waiting → done → abandoned`)
  driven from a CLI and a browser, backed by a long-running Nest/Fastify gateway
  with a REST + WebSocket API that pushes live board updates.
- **Agent pool & scheduler** — a single-tick scheduler fills N slots by priority
  and age, spawning Claude Code sessions; retries on crash, run timeouts, and
  per-repo concurrency caps.
- **Browser-embedded terminals** — gateway-managed PTYs streamed to `xterm.js`
  with human-in-the-loop approvals and reconnect/reattach.
- **Smart intake** — each freeform item is classified (bug / feature / question /
  chore) and triaged to a starting column; bulk / paste add; URLs and GitHub
  issue/PR context are folded into the agent's seed prompt.
- **Repo registry** — DB-backed, CRUD-able repos that resolve a task's working
  directory, with per-repo concurrency caps and branch-prefix / PR-body
  conventions injected into the agent prompt.
- **Workflows** — a node-based builder with an expression engine, reshape /
  storage nodes, run history, live run streaming, and CLI commands; plus
  **Councils** (multi-agent deliberation) and **Brainstorms**.
- **Dashboards & office** — a visual "office" view of the agent fleet and a
  configurable widget dashboard (throughput, system health, LLM cost & usage,
  shipped PRs, activity, and market / weather / news / world-clock widgets).
- **LLM usage tracking** — per-call cost recording with optional soft budgets.
- **`@midnite/ui`** — a reusable, framework-agnostic component library and design
  tokens (with a Storybook catalog), consumed by the web app.
- **Public site** and a **desktop app** wrapping the web UI.

## [0.0.0] - 2026-06-18

### Added

- Initial moon/pnpm monorepo scaffold — `shared`, `gateway`, `cli`, `web`, `ui`,
  `site`, and `desktop` packages, the proto + moon toolchain, `moon ci`, and the
  one-way package-boundary graph (`shared` is the contract).

[Unreleased]: https://github.com/bilo-io/midnite/compare/v0.0.0...HEAD
[0.0.0]: https://github.com/bilo-io/midnite/releases/tag/v0.0.0
