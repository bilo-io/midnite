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

_Nothing yet._

## [0.3.0] - 2026-07-20

A platform release: a standalone **operator console**, a shared **app-shell**
package that both apps mount, SSO **go-live** (private operator config + local
sign-in fully wired end-to-end), and the neuro-cloud starfield everywhere.

### Added

- **Operator console (`@midnite/admin`)** — a standalone Next.js console for
  operators: platform **Overview** (KPIs + usage/cost), **Usage & cost**,
  **Users & teams** (list all tenants + team CRUD / role management),
  **Projects**, view-only **Versions & releases** (changelog + channels/floor),
  **Audit log**, and **Quick links**. Gated behind an operator allowlist and the
  themed SSO login / idle lock, on the same rail chrome + appearance system as
  the main app.
- **Shared app shell (`@midnite/shell`)** — the wired frame both `web` and
  `admin` mount: `<AppFrame>` (injected nav config), `<LockScreen>` (idle
  re-lock + themed login on the starfield), the appearance/accent runtime, and
  shared providers. `web` was refactored onto it so there's one source of truth.
- **Operator config split** — all auth wiring (SSO client IDs, JWT, allowlist,
  operators) now lives in a private, gitignored `.midnite/operator.json`,
  deep-merged into the gateway config and **fail-closed** (a leaked
  `gateway.auth` in the public config fails boot with a keyed remedy).
- **Operator gate + platform admin APIs** — an `isOperator` claim +
  `@RequiresOperator` guard and operator-only `GET /admin/users|teams|overview`
  aggregates, without a new persisted global-role model.
- **SSO go-live DX** — a `midnite doctor` SSO-readiness section, health-endpoint
  redaction, a hosted **server** web build target for the cookie-backed auth
  routes, and the [`docs/SSO.md`](docs/SSO.md) go-live runbook.
- **Starfield everywhere** — the neuro-cloud starfield now backs `web`, `docs`,
  and `site` (honeycomb dropped), with constellation bursts on vortex release
  and spontaneous galaxy-wide firings.
- **Report an issue** — a report-issue hand-off to GitHub from both `web` and
  the desktop app.
- **Version chips** — a version pill on the login form and a nav-header chip,
  both linking to the changelog.
- **GitHub branding** — a shared GitHub logo on every GitHub button and the
  PR-review "Open on GitHub" / "Open PR" links.
- **Desktop one-command local build+install** (`install:local`), and public raw
  assets served from the midnite-app mirror.

### Fixed

- **Local SSO sign-in fully wired** — the auth/SSO dependency graph
  (`SsoController`, `SsoService`, `UsersService`, `TeamsService`, and
  `JwtService`'s refresh-token repository) now resolves under the dev runner, so
  GitHub/Google sign-in completes end-to-end instead of failing at the callback
  and one-time-code exchange. `gateway:dev` now auto-loads `.env`.
- **Desktop native-ABI fix** — `electron-rebuild` is scoped to the staged
  gateway tree so it no longer recompiles the workspace's shared `better-sqlite3`
  binary for Electron's ABI (which broke the gateway and node-based tests); the
  dev gateway now runs under plain Node.
- Web: banner no longer overlaps the header actions; corrected command-palette
  surface count; `@midnite/shell` build ordering + Tailwind content scan;
  auth-hero title unclipped + gradient-caret polish.
- Site: dropped the Intel macOS download (Apple Silicon only).
- CI: an empty `CSC_LINK` no longer breaks unsigned macOS builds; a release now
  publishes even if a single platform build flakes.

### Changed

- **`@midnite/ui`** absorbed the shared visuals (neuro-cloud background, rail
  chrome, theme toggle, passcode pad) as a strict leaf, so `web`, `docs`, and
  `admin` share one source of truth.
- The **gateway is no longer deployed on Vercel** — it's stateful and belongs on
  a persistent host, not a serverless build.

### Removed

- The honeycomb backdrop, superseded by the neuro-cloud starfield.

## [0.2.0] - 2026-07-19

A big login + identity release: a fully redesigned, branded sign-in experience
on a living neuro-cloud backdrop, Google/GitHub SSO end-to-end, and an
in-app update system.

### Added

- **Redesigned login** — a split-screen, branded sign-in: an animated
  **neuro-cloud** starfield backdrop (firing "thought paths", a cursor gravity
  well, and press-to-gather / release-to-scatter interaction), a typed-out hero
  wordmark + cycling marketing copy with an entry choreography, floating-label
  inputs, an email-reveal form in a frosted-glass panel, and a remembered
  "last used" sign-in method.
- **Google & GitHub SSO** — end-to-end single sign-on: gateway SSO config with a
  fail-closed boot check, identity persistence, the SSO auth flow
  (`SsoService`/`SsoController`), and first-class "Continue with Google / GitHub"
  buttons on the login + register pages.
- **Neuro-cloud everywhere** — the same starfield is now the backdrop on the
  **screensaver** and the **landing home**, not just login.
- **In-app updates** — an update banner with release notes, per-platform update
  handling, update **channels** + a force-update floor, a CLI out-of-date notice,
  a `version.json` freshness guard emitted on release, and Electron
  **auto-update + code-signing** for the desktop app.
- **Landing & header polish** — landing clock moved to top-centre with top-left
  weather; a top-right header-actions cluster + always-visible avatar; a
  restyled brand accent gradient; hover-expand control-bar buttons; search moved
  into the view control bars; collapsible settings categories; and
  status-coloured last-run badges.

### Fixed

- SSO callback made static-export compatible (unbreaks the web build).
- Login-screen polish: SSO buttons always visible, header logo, theme toggle, and
  an unauthenticated → `/login` redirect.
- Assistant "Docs" link points at the hosted docs; the Guide button plays rather
  than browsing away.

### Changed

- Docs site: hash-router link fixes, a theme dropdown, accordion navigation, and
  richer product prose.

## [0.1.0] - 2026-06-26

The first tagged release. The curated highlights below cover what has landed since
the initial scaffold.

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
- **Public downloads** — each tagged release builds the desktop installers on every
  OS and publishes them to the public companion repo
  ([`bilo-io/midnite-app`](https://github.com/bilo-io/midnite-app)), so per-platform
  builds (macOS arm64/x64 `.dmg`, Windows x64 `.exe`, Linux x64 `.AppImage`) download
  straight from the site while the source repo stays private.

## [0.0.0] - 2026-06-18

### Added

- Initial moon/pnpm monorepo scaffold — `shared`, `gateway`, `cli`, `web`, `ui`,
  `site`, and `desktop` packages, the proto + moon toolchain, `moon ci`, and the
  one-way package-boundary graph (`shared` is the contract).

[Unreleased]: https://github.com/bilo-io/midnite-app/releases
[0.3.0]: https://github.com/bilo-io/midnite-app/releases/tag/v0.3.0
[0.2.0]: https://github.com/bilo-io/midnite-app/releases/tag/v0.2.0
[0.1.0]: https://github.com/bilo-io/midnite-app/releases/tag/v0.1.0
[0.0.0]: https://github.com/bilo-io/midnite-app/releases/tag/v0.0.0
