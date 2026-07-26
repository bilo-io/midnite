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

## [0.7.4] - 2026-07-26

_Patch release — `gateway`, `shared`, `site`, `web` → 0.7.4; `docs` → 0.7.1.
`admin`/`cli`/`desktop`/`shell`/`ui` are unaffected and stay put._

### Added

- **Antigravity as an agent CLI option**, replacing Gemini in the session-terminal
  picker and in Councils' one-shot provider, with Google's official brand mark in
  the picker. Antigravity has no documented headless/one-shot mode yet, so using
  it as a council provider is best-effort pending verification against the real
  CLI.
- **The brand gradient accent now animates by default** — the signature rainbow
  drifts out of the box instead of requiring a manual toggle in
  Settings → Appearance.
- **Richer link previews** for the marketing site (Open Graph banner + card) and
  a **one-line install command served directly from the site**.

### Fixed

- **Councils failed to load** ("Could not reach the gateway") for any council
  created before the Antigravity swap above — old rows had the retired provider
  value stored, which failed validation on read. Legacy values now coerce to
  their current equivalent.
- **Sharing the download page** (e.g. on WhatsApp) showed the landing page's
  title, description, and image instead of its own — it now carries its own
  share preview.
- **The site could fail to deploy on Vercel** when `@midnite/ui` hadn't been
  built first.

## [0.7.3] - 2026-07-24

A security fix — please update.

### Fixed

- **The gateway's REST API required no sign-in on downloaded builds.** A
  dependency-wiring bug meant the API auth check silently disabled itself
  whenever login was enabled but no static token was set — i.e. every
  distributed install. The login screen still gated the UI, but the underlying
  API (tasks, boards, everything) was reachable by any process on the machine
  that could reach the port. Now fixed and locked down: the API rejects any
  request without a valid session, and the gateway refuses to start if the auth
  layer ever fails to wire up (fail-closed rather than fail-open). A build-time
  guard prevents this class of bug from recurring.

## [0.7.2] - 2026-07-24

Sign in with GitHub on any machine — no setup required.

### Added

- **GitHub device-flow sign-in** — a freshly-installed midnite can now sign you
  in with GitHub out of the box, with **zero configuration on the machine**: the
  login screen shows a short code, you approve it at `github.com/login/device`,
  and you're in. No client secret is ever stored on the machine (this is the
  same secretless flow the `gh` CLI uses). Instances configured with the classic
  redirect sign-in keep it unchanged. The device flow also keeps working when
  the app's preferred port is taken — it needs no callback URL at all.

## [0.7.1] - 2026-07-24

An auth-hardening release for distribution: a downloaded app now requires a
sign-in out of the box, and access can be granted by email domain.

### Added

- **Login required out of the box (packaged desktop)** — a freshly-installed app
  provisions its own signing + encryption secrets on first launch, so it boots
  with authentication **on** and the dashboard is never reachable without signing
  in. This also fills in the setup wizard's "Secret key" step automatically.
- **Domain allowlist entries** — the access allowlist now accepts a domain
  pattern like `@example.com` (admits everyone at that domain) alongside
  individual email addresses, so a whole team can be allowed without listing each
  person.

### Changed

- **WebSocket connections require a valid token when auth is enabled** — the live
  board and terminal no longer accept anonymous connections behind the login
  gate. Local (auth-off) mode is unchanged.

### Fixed

- **No dashboard flash on launch** — a logged-out launch now shows the login
  screen directly instead of briefly flashing the dashboard before redirecting.
- **Marketing site canonical URL** — the site's Open Graph / canonical base now
  points at the live marketing domain so shared and social links resolve
  correctly.

## [0.7.0] - 2026-07-24

A macOS distribution release: installing (and updating) no longer walks users
into Gatekeeper's "unverified app" dead end.

### Added

- **Manual-install update mode (macOS, unsigned builds)** — the desktop app now
  detects an ad-hoc/unsigned build on boot and, instead of a download→restart
  update that Squirrel.Mac would refuse to install, the update banner offers the
  `curl … install.sh | sh` installer command (copy-to-clipboard). Developer
  ID-signed builds keep one-click updates; the probe is fail-soft.

### Changed

- **macOS installs lead with a `curl … install.sh | sh` one-liner** across the
  marketing site and docs — installing via `curl` sets no quarantine attribute,
  so the app opens cleanly on first launch (no Gatekeeper popup, and no reliance
  on the right-click → Open bypass that macOS 15 removed). The direct macOS
  `.dmg` download links were removed in favour of the command; Windows and Linux
  keep their direct downloads. The site's download version now tracks the
  release so the Windows/Linux links resolve.

## [0.6.0] - 2026-07-24

A task-graph + operator-polish release: the Tasks page gains a **dependency
graph view**, backups become **configurable at runtime**, translation coverage
lands its **full sweep (Phase 82)**, and the board/detail surfaces get a
consistent **cockpit** treatment.

### Added

- **Task dependency graph view** — the Tasks page has a new **graph** view mode
  that lays out tasks and their blocker/blocked edges, with status-aware node and
  edge colouring (blocked / unblocked / done). The graph honours the toolbar's
  **status multi-select** and the **project filter set**, so it narrows exactly
  like the board and list do, pulling cross-project blockers in as foreign nodes.
- **Clickable dependency chips** — "Blocked by" / "Blocks" chips in the task
  modal are now interactive: clicking one opens that task (with browser-history
  back), and each chip adopts its linked task's status colour on hover.
- **Configurable scheduled backups** — Settings → Data gains a real config UI
  (enable switch, frequency preset, destination directory) wired to a new
  admin-gated `PATCH portability/backup/config` endpoint, replacing the old
  read-only "edit midnite.json" notice. The Data page is split into **Backup /
  Restore tabs** (both panels stay mounted, so a chosen restore file survives
  switching tabs). The default backup destination moved to `~/.midnite/data/backups`.
- **Full translation coverage (Phase 82)** — the i18n gate is flipped on with the
  catalog machinery in place, and the board, tasks, auth, and settings surfaces
  are swept end to end (en-GB + fr-FR).
- **Cockpit task/session detail** — task and session detail render as an
  accordion-based layout with a **"Mark done"** action, sticky cockpit headers
  across the remaining surfaces (projects, memory, ops, office), and reliable
  modal → full-page navigation. Adds an item **count pill**, a page-scrolling
  board with a **per-project view**, and **drag-reorder within a column**.
- **Task description folded into the session prompt** — a task's description is
  now included in the spawned session's prompt.
- **Brand icons in provider dropdowns** — the Integrations webhook/inbound-source
  selects and the workflow credential-type select move to styled selects with a
  real brand glyph per option (GitHub, Slack, Discord, Linear, Google, …), with
  matching icons in the corresponding table rows.
- **Wordmark font + capitalisation picker** restored in Settings → Appearance.
- **JSON error panels** now pretty-print leaked JSON error bodies, and
  notification-feed rows are expandable.

### Changed

- **Unified select styling** — the media page's one-off react-select skin is
  dropped in favour of the shared `@midnite/ui` select / `ProjectSelect`, and the
  CLI install catalog becomes a single source of truth in `shared`.

### Fixed

- **No raw API JSON on RSC navigation** — a missing Next RSC flight file
  (`‹route›/index.txt?_rsc=`) is now answered with a plain 404 so the client
  router falls back to a clean navigation instead of surfacing raw API JSON
  (e.g. the Councils page). (#541)
- **WS sockets stop looping on token expiry** — the access token is refreshed
  proactively, so live-status sockets no longer cycle reconnecting on a 15-minute
  expiry. (#536)
- **Agent-slot lifecycle** — a slot is reaped when its running task is moved to
  done/abandoned or deleted (#531), a waiting task resumes when its tool-approval
  is answered (#534), and `MetricsModule` is wired into `PoolModule` so
  run-lifecycle metrics actually record.
- **Ad-hoc "New session" terminals** open in the configured working directory. (#537)
- **Electron builds no longer clobber the gateway's native-module ABI.** (#529)
- **Gradient-accent buttons keep white text** — primary button text stays white
  under a gradient accent in both themes (`shell` + `web`).
- **Dropdown popovers portal to the body** to avoid stacking-context clipping.
- **No nav hard-reloads** on API-colliding pages, plus a settings pane-only
  reveal. (#528)
- **JSON error panel** fills the available width instead of shrinking to content.

## [0.5.0] - 2026-07-22

A localization + desktop-chrome release: midnite now **speaks multiple
languages** end to end, and the desktop app wears a **custom frameless title
bar** that the web UI's sticky headers align to.

### Added

- **Internationalization (Phase 79)** — the app is now fully translatable. A
  next-intl runtime + typed message contract backs a **language switcher** (in
  the sidenav footer and Settings), **locale-aware formatting** across the
  finances views and dashboard widgets, and translated priority surfaces
  (navigation, settings, board, auth, and shared common strings).
- **Translation-coverage tooling (Phase 82)** — a catalog gate plus a
  no-hardcoded-string lint rule keep new UI strings translatable, so coverage
  can't silently regress.
- **Custom frameless title bar (Phase 81)** — the desktop app draws its own
  title bar (aligned traffic lights, an in-rail language drop-up, and the auth
  theme toggle), and the web UI's collapsed page headers, sticky list toolbars,
  and standardized detail-page headers tuck cleanly beneath it.
- **Operator login branding** — the operator console's login screen now carries
  the Cassandra brand font and logo.

### Fixed

- **Sticky-bar parity across shell/desktop/web** — title-bar offsets, single
  scroll regions, and a scrollable nav rail now line up; the workflow editor's
  header collapses and tucks like every other page, and the 48px desktop scroll
  was killed at its root.
- **Desktop PATH resolution** — the app resolves the login-shell PATH (probing
  the shell interactively) before spawning the gateway, so rc-file PATH entries
  are honoured.
- **Work-item modal** — the action row is unified and defaults to the Session
  tab when a session is live.
- **Site download links** point at the correct v0.4.0 release assets.
- **CI coverage** — the coverage job runs via vitest directly so it works in CI.

## [0.4.2] - 2026-07-21

A documentation-hosting patch: the docs site now serves exclusively from its
hosted deployment, and every in-app documentation link points there.

### Changed

- **Documentation moved fully onto the hosted docs site** — the version tag, the
  release-notes "Full changelog" link, and the assistant's **Docs** deep-link now
  resolve to the hosted documentation rather than the retired GitHub Pages build.
  GitHub Pages is no longer part of the docs pipeline.

## [0.4.1] - 2026-07-21

A UI-consistency patch: a unified frosted-glass surface for every panel, and
detail headers (sessions + workflows) brought onto the same shared pattern.

### Changed

- **Frosted-glass panels everywhere** — dashboard widgets, list / grid / table
  views, cards, and detail panels now share one semi-opaque, blurred surface
  (matching the page header), so the background no longer bleeds through and card
  content is easier to read.
- **Task actions are icon buttons that reveal their label on hover** — the
  task/session modal's controls moved onto the tab row beside "Open page", and the
  same actions are now available near the top of the session page.
- **Workflow editor header now matches the other detail pages** — the shared page
  header carries an editable title + description, its Run / Save / History /
  template / Enabled controls sit on the right as hover-expand icon buttons, and
  the trigger is a chip on that row.
- **Session status moved into the Session info panel** as a tinted pill, instead
  of being duplicated beside the header's action buttons.
- **Workflows list** — the Templates entry is now a hover-expand button beside the
  search bar.
- **Ops → Digest** — the digest list is aligned with the tabs, and its export
  control is a download icon.
- **Settings** — the Account section was folded into Workspace and the user menu.

### Fixed

- Full-screen top-right controls no longer overlap the floating page header.

## [0.4.0] - 2026-07-20

A desktop-first release: midnite now installs as a **standalone desktop app**
with SSO that completes inside the window, plus assistant/notification polish
across the web UI.

### Added

- **Standalone desktop app (Phase 77)** — installs against a shared `~/.midnite`,
  authenticates direct-to-gateway, and bundles the `midnite` CLI onto your PATH.
  It runs **single-origin on a stable port** so the UI, API, and the GitHub SSO
  callback all share one origin and sign-in completes inside the app.
- **Assistant panel reveal transition** — the assistant panel grows in / shrinks
  out instead of snapping.
- **Notifications & approvals consolidation** — approvals now live in the bell
  panel, the theme toggle moved to the header, and popovers animate open/closed.
- **Login landing polish** — a brand-gradient glow and a title cursor gated on
  the brand landing.

### Fixed

- **Desktop pages rendered as raw JSON** — in single-origin mode the gateway now
  serves the web page for browser navigations to routes that collide with the
  unprefixed API (`/projects`, `/tasks`, `/sessions`, …), while client `fetch`
  calls still receive JSON and the SSO redirect flow is preserved.
- **Packaged desktop preload** — the preload script is now bundled so it loads in
  the sandboxed (packaged) app.
- **Static export build** — Phaser is namespace-imported so the Next `output:
  export` build no longer fails.
- **Login wordmark glow** — hugs the glyph strokes rather than the surrounding
  block.

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
[0.7.3]: https://github.com/bilo-io/midnite-app/releases/tag/v0.7.3
[0.7.2]: https://github.com/bilo-io/midnite-app/releases/tag/v0.7.2
[0.7.1]: https://github.com/bilo-io/midnite-app/releases/tag/v0.7.1
[0.7.0]: https://github.com/bilo-io/midnite-app/releases/tag/v0.7.0
[0.6.0]: https://github.com/bilo-io/midnite-app/releases/tag/v0.6.0
[0.5.0]: https://github.com/bilo-io/midnite-app/releases/tag/v0.5.0
[0.4.2]: https://github.com/bilo-io/midnite-app/releases/tag/v0.4.2
[0.4.1]: https://github.com/bilo-io/midnite-app/releases/tag/v0.4.1
[0.4.0]: https://github.com/bilo-io/midnite-app/releases/tag/v0.4.0
[0.3.0]: https://github.com/bilo-io/midnite-app/releases/tag/v0.3.0
[0.2.0]: https://github.com/bilo-io/midnite-app/releases/tag/v0.2.0
[0.1.0]: https://github.com/bilo-io/midnite-app/releases/tag/v0.1.0
[0.0.0]: https://github.com/bilo-io/midnite-app/releases/tag/v0.0.0
