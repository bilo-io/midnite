# midnite

> Multitask Claude Code — a task orchestrator wrapped around a pool of Claude Code agents.

Drop in a freeform list, let midnite classify each item, queue them, and run them in parallel across N agent slots. Interact via CLI or browser kanban. Everything is mediated by a single long-running **gateway** daemon.

For a high-level tour of what midnite can do, see [`docs/FEATURES.md`](docs/FEATURES.md).

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

**Phase 0 — scaffold.** Empty project skeleton in place; nothing runs end-to-end yet. See [`todo/`](todo/) for the per-phase checklists and `done.md` log, [`CHANGELOG.md`](CHANGELOG.md) for the user-facing release history, and [`docs/RELEASING.md`](docs/RELEASING.md) for the versioning + release process.

- **Phase 0 — Monorepo scaffold:** ✅ files in place; verification on a fresh checkout still pending — see [phase-0-scaffold.md](todo/phase-0-scaffold.md).
- **Phase 1 — Board you drive by hand** (gateway + REST/WS + CLI): ⏳ [phase-1-board.md](todo/phase-1-board.md)
- **Phase 2 — Agents** (pool, scheduler, pty spawner, Claude Code hooks): ⏳ [phase-2-agents.md](todo/phase-2-agents.md)
- **Phase 3 — Browser** kanban + embedded terminals: ⏳ [phase-3-browser.md](todo/phase-3-browser.md)
- **Phase 4 — Inference** (plan/act split, KB injection): ⏳ [phase-4-inference.md](todo/phase-4-inference.md)
- **Phase 5 — Polish** (priorities, retries, per-repo caps): ⏳ [phase-5-polish.md](todo/phase-5-polish.md) · pluggable spawner + durable `tmux` moved to [phase-17-spawner-tmux.md](todo/phase-17-spawner-tmux.md)

## Quick start

Requires [proto](https://moonrepo.dev/proto) to manage the toolchain versions pinned in [`.prototools`](.prototools) (Node 22.12.0, pnpm 9.15.0).

```sh
proto use                       # install pinned node + pnpm
pnpm install                    # link workspace packages
pnpm moon run :build            # build all packages (respects depends-on graph)

# Run the pieces (each in its own terminal):
pnpm moon run gateway:dev       # Nest gateway on http://localhost:7777
pnpm moon run web:dev           # Next.js kanban on http://localhost:3000
pnpm moon run cli:build && node packages/cli/dist/index.js --help
```

**After pulling `main`**, re-sync the toolchain + deps and rebuild in one line:

```sh
proto use && pnpm install && pnpm moon run :build
```

There is **no separate migration step** — the gateway applies Drizzle migrations automatically on boot ([`db.module.ts`](packages/gateway/src/db/db.module.ts)), so a fresh or newly-migrated schema is created the first time you run `pnpm moon run gateway:dev`.

Sanity check the gateway:

```sh
curl http://localhost:7777/health   # → {"ok":true}
```

## Stack

- **Toolchain:** [proto](https://moonrepo.dev/proto) (pins node/pnpm) + [moon](https://moonrepo.dev) (task graph, caching, affected-only builds) + pnpm workspaces.
- **Gateway** ([`packages/gateway`](packages/gateway)): **Nest.js** with the **Fastify** adapter, SQLite via **better-sqlite3 + Drizzle**, WebSockets via `@nestjs/platform-ws`.
- **CLI** ([`packages/cli`](packages/cli)): **commander**.
- **Web** ([`packages/web`](packages/web)): **Next.js** App Router (React 19). `@dnd-kit` for the kanban + `xterm.js` for embedded agent terminals (Phase 3). Responsive and **installable as a PWA** (Phase 24) — "Add to home screen" from Settings → Appearance launches a standalone window with a cached shell for a fast start. It's an installable *shell*, not an offline app: the board/session data is still live from the gateway. Reaching it from a phone uses your own network path (LAN / Tailscale / tunnel) — the gateway stays **loopback-only**, so exposing it beyond `127.0.0.1` is the separate, deferred Phase 7 A5 work.
- **Shared** ([`packages/shared`](packages/shared)): **zod** config schema + cross-package types (the only place those live).
- **Process spawning** (Phase 2): `node-pty` for managed sessions, behind a pluggable `Spawner` (Phase 17) — a durable `tmux` backend whose sessions survive a gateway restart is opt-in via `terminal.mode`.

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
  "agent":     { "pool": 4, "provider": "anthropic", "plan": "opus4.7", "act": "sonnet4.7" },
  "terminal":  { "mode": "pty", "layout": "split", "args": [], "scrollbackBytes": 262144, "idleDisposeMs": 300000, "maxSessions": 16, "inheritSecrets": false, "approvals": { "enabled": false, "timeoutMs": 120000, "onTimeout": "deny", "onNoSubscriber": "ask" } },
  "repos":     [],
  "gateway":   { "port": 7777, "host": "127.0.0.1", "allowedOrigins": [], "auth": { "tokenEnv": "MIDNITE_AUTH_TOKEN", "requireOnNonLoopback": true, "rateLimit": { "windowMs": 60000, "max": 0 } } },
  "knowledge": { "enabled": false, "maxBytes": 16384 },
  "workflows": { "enabled": false, "defaultTimezone": "UTC", "schedulerTickMs": 30000, "webhookBaseUrl": "http://localhost:7777" },
  "prStatus":  { "enabled": true, "pollIntervalMs": 60000, "pollConcurrency": 4 }
}
```

`agent.maxRetries` (default `3`) bounds automatic retries: when an agent session
exits unexpectedly (crash) while a task is still `wip`/`waiting`, the task is
re-queued up to this many times before it's abandoned. Each task also carries a
`priority` (0 Low · 1 Normal · 2 High · 3 Urgent, default Normal) — the scheduler
assigns higher-priority `todo` tasks first, oldest-first within a priority.

`agent.maxPerRepo` (default `0` = unlimited) caps how many agents may run on the
same repo (by `task.repo`) at once: the scheduler skips a `todo` task whose repo
is already at the cap and picks the next eligible one, so two agents don't race
on one working tree. Tasks without a repo are never capped.

`gateway.webDir` (unset by default) points the gateway at the web app's static
export so a **single process serves both the API and the browser UI** in prod.
Build the UI with `moon run web:build` (Next `output: 'export'` → `packages/web/out`),
then set `webDir` to that path (or pass `MIDNITE_WEB_DIR`); the gateway mounts it
at `/` and the app talks to the same origin's API — no separate `next` server, no
CORS. Unset, the UI runs as its own dev server (`moon run web:dev` on `:3000`).
The export is fully static (every route is a real `index.html`, all data fetched
client-side), so the API routes keep priority over the file mount.

`config.checks` (Phase 30 — gate the `done` transition on quality checks) is
**off by default**. When `checks.enabled` is `true`, a task's `gates` (a list of
`{ name, command, cwd?, timeoutMs? }`) run in its repo cwd before completion;
`checks.byRepo['<repo-name>']` **replaces** the global `gates` for that repo
(not merged). Each check runs via the shell, bounded by `perCheckTimeoutMs`
(per-check timeout → kill → fail) with output tail-truncated to `outputCapBytes`.
`checks.autoFix` (also off by default) re-spawns the agent to fix failures, up to
`maxAttempts`. The runner + contract land in this phase's Theme A; gating the
completion seam, persistence, and the surfaces follow. The command runner never
infers a command — you opt in per install/repo.

`config.memory.studio` (Phase 65 — Memory Studio media artifacts) controls the
**audio** and **video** overviews the workspace generates from a memory's corpus.
Both are **additive provider seams that degrade gracefully** — a fresh install
still produces text + infographic artifacts and *offers* audio/video with honest
"no provider" messaging rather than failing:

```json
{
  "memory": {
    "studio": {
      "tts":   { "provider": "auto", "model": "gpt-4o-mini-tts", "voiceA": "alloy", "voiceB": "nova" },
      "video": { "mode": "auto" }
    }
  }
}
```

- **`tts.provider`** — `auto` (default) synthesises the two-host audio overview
  when an OpenAI credential is resolvable (the stored `openai` provider key or
  `OPENAI_API_KEY`), reusing the LLM layer's credential; `openai` forces it; `off`
  never synthesises. With no key the artifact ships the **transcript only**.
  `voiceA`/`voiceB` are the two host voices; `model` is the OpenAI TTS model.
- **`video.mode`** — `auto` (default) composes a narrated slideshow into an MP4
  with `ffmpeg` when a usable binary + system font are found; `off` never composes.
  Set **`video.ffmpegPath`** to point at a specific binary (otherwise `ffmpeg` on
  `PATH` is used). With no ffmpeg the artifact ships the **slide outline + audio**.

Nothing here is required: the whole block defaults on, degrades silently, and
never blocks the text/infographic artifacts.

`config.prStatus` (Phase 22 — live GitHub PR status) is **on by default**. A
single gateway-owned poller wakes every `pollIntervalMs` (default `60000`) and
refreshes the state/CI/review of tasks whose PR isn't yet merged or closed,
`pollConcurrency` (default `4`) at a time; settled PRs stop being polled.
Resolution is **gh-first** (uses your `gh` auth, so private-repo PRs resolve)
with an anonymous `api.github.com` REST fallback for public repos, and is
**fail-open** — a missing `gh`, an unauthenticated private repo, or a network
error leaves the last-known status untouched and never breaks the board. The
resolved status rides on a task's `prStatus`; `POST /tasks/:id/pr/refresh` forces
an on-demand refresh. Set `prStatus.enabled` to `false` to turn polling off.

A task reaches `wip` (with a Claude Code session spawned and linked to it) in one
of two ways:

- **Autonomously** — set `agent.poolEnabled: true` (default `false`) and the
  gateway runs a tick loop every `agent.schedulerTickMs` (default `5000`) that
  fills free slots with the next ready `todo` task. With it off, nothing
  auto-starts.
- **Manually** — `POST /tasks/:id/start` claims a slot and spawns a session on
  demand (the web board's **Start** button and dragging a card into *In
  progress* both hit this). This works whether or not the autonomous scheduler
  is enabled — the slot pool exists independent of `poolEnabled` — and returns
  `409` when every slot is busy. Note that merely `PATCH`-ing a task's status to
  `wip` only moves the column; it does **not** spawn a session.

When a task is started, any links in its prompt are folded into the agent's seed
prompt as a **"Linked context"** block: GitHub issue/PR URLs resolve via `gh`
(your auth, so private repos work) with an anonymous `api.github.com` fallback,
and other URLs are fetched through the SSRF guard (private/loopback ranges
blocked) and reduced to readable text. It's best-effort and fail-open — a fetch
that errors is skipped, never blocking the run — and capped to a byte budget so a
huge thread can't blow the model's context.

**Knowledge files** are a second, distinct knowledge base (don't confuse them
with the link-based *Sources* above). Point `knowledge.dir` at a folder of
Markdown and set `knowledge.enabled: true`: the gateway watches it (live — edits
are picked up without a restart) and keeps a manifest of each file's headings.
When a task starts, the plan model is shown that manifest and picks the files
relevant to the task; their **content** is injected into the seed prompt as a
**"Knowledge files"** block, capped to `knowledge.maxBytes` (default `16384`).
Like linked context it's best-effort and fail-open. Use it for standing project
conventions, runbooks, and domain notes the agent should always have on hand.

The session web window streams a live PTY over WebSocket (`/ws/terminal`). The
PTY is spawned on demand when a window opens for an active session and is shared
across reconnects. `terminal` fields control it:

- `mode` — the process backend: `"pty"` (default) runs each session in a
  node-pty the gateway owns, so it dies with the gateway; `"tmux"` runs each
  session in a detached `tmux` session (`midnite-<id>`) that **outlives** the
  gateway, so an in-flight agent run **survives a restart** — on boot the
  gateway rediscovers live sessions and reattaches instead of requeuing. `tmux`
  fails closed if the binary is missing (it never silently falls back to `pty`).
  (`warp`/`iterm` were dropped — native windows bypass the browser stream.)
- `command` (optional) — what each session PTY runs. Defaults to an interactive
  login shell (`$SHELL`, else `/bin/bash`) in the session's repo cwd. Set it to
  `"claude"` to drive a live Claude Code session instead.
- `args` — argv for `command` (ignored for the default shell, which uses `-i`).
- `scrollbackBytes` — bytes of recent output retained per PTY, replayed on (re)attach.
- `idleDisposeMs` — grace period after the last viewer disconnects before the PTY is reaped.
- `maxSessions` — max concurrent PTYs; further spawns are rejected until one frees up.
- `inheritSecrets` — by default the PTY's env is **scrubbed** of secret-looking
  vars (`*TOKEN*`, `*SECRET*`, `*API_KEY*`, …) so an interactive shell doesn't
  inherit the gateway's credentials. Set `true` when `command` is `"claude"` (it
  needs `ANTHROPIC_API_KEY`).
- `approvals` — human-in-the-loop tool gating for `command: "claude"` sessions
  (off by default). When `enabled`, the gateway injects a Claude Code `PreToolUse`
  hook (via a per-session `--settings` file) that routes each tool-permission
  request to the web session window, where you answer **Accept / Accept for this
  session / Deny** — the agent blocks until you (or a fail-safe) decide. `timeoutMs`
  bounds the wait; `onTimeout` (default `deny`) and `onNoSubscriber` (default `ask`
  — fall back to Claude's own prompt when no browser is watching) choose the
  fail-safe. The hook authenticates to the gateway with a per-session secret, so
  the request body alone is never trusted. (`hookCallbackUrl` optionally overrides
  the loopback URL the in-PTY hook calls back on.)

The session window also has a **message composer** (type and press Enter to send
to the PTY) alongside the raw terminal, so a Claude Code session is drivable like
a remote control.

Until the agent pool/scheduler lands, the window is an **on-demand PTY** running
`command` in the session's repo — an interactive shell (or `claude`), not a replay
of an agent's run. The status bar shows what's actually running.

Because the terminal can spawn arbitrary processes, the gateway is **locked to
loopback by default**:

- `gateway.host` — bind address, `127.0.0.1` by default. Only change it (e.g.
  `0.0.0.0`) if you intend to expose the gateway, and pair it with auth.
- `gateway.allowedOrigins` — browser origins permitted to call the API and open
  the terminal WS. Loopback origins (any port) are always allowed; add others
  here. Non-loopback origins are rejected (CORS + a WS `Origin` check) to block
  drive-by pages from driving a terminal.
- `gateway.auth` — **optional remote-access auth (off by default)**. midnite is
  local-only out of the box; this is for the rare case you bind it off-loopback.
  - `auth.tokenEnv` (default `MIDNITE_AUTH_TOKEN`) names the env var holding a
    bearer token — the secret is never inlined into committed config. When that
    var is set, every REST route (and the `/uploads/*` attachment files) requires
    `Authorization: Bearer <token>` except `/health` (liveness) and `/hooks/*`
    (they carry their own per-session secret). The gateway-served web bundle
    (`gateway.webDir`) stays public — it's the client shell; the data it loads
    goes through the guarded API.
  - `auth.requireOnNonLoopback` (default `true`) is **fail-closed**: binding a
    non-loopback `host` with no token resolved refuses to boot. Set `false` to
    bind unauthenticated on purpose.
  - `auth.rateLimit` (`{ windowMs: 60000, max: 0 }`) is a basic per-IP
    fixed-window limit; `max: 0` disables it (the default). `/health` is never
    throttled. *(WS streams aren't yet token-guarded — the terminal WS uses
    one-time tokens; the board/workflow WS is a follow-on.)*

Every consumer (gateway, CLI) takes a parsed `MidniteConfig` — never `JSON.parse` the file yourself.

The optional `workflows` block configures the [workflow builder](todo/phase-6-workflows-mvp.md). It ships **off** (`enabled: false`); set `enabled: true` to start the cron scheduler. `webhookBaseUrl` is the public URL used to build copyable webhook trigger URLs. Secrets are referenced by env-var name (e.g. `encryptionKeyEnv`, OAuth `clientSecretEnv`), never inlined.

### AI providers & authentication

The gateway's own AI features (task triage, project plan drafting, the heartbeat,
the workflow AI node) run through a provider-agnostic `LlmService` that dispatches
to the **active provider**. Four are supported:

| Provider | What it covers |
| --- | --- |
| `anthropic` | Claude API (default) |
| `openai` | OpenAI / Azure-style chat completions |
| `google` | Google Gemini |
| `openai-compatible` | Any OpenAI-compatible endpoint via a configurable base URL — Ollama, OpenRouter, LM Studio, vLLM, … |

Pick the active provider and add your own API key per provider on the **Agents**
page: each agent card has a **CLI** tab (install/update the CLI that runs task
sessions) and an **API** tab (key, optional base URL, and per-role `plan`/`act`
model overrides). Keys are stored on the gateway (SQLite) and **write-only over
the API** — reads return only `hasKey` + the last 4 characters. The active CLI
(which binary runs sessions) and the active API provider (which powers AI
features) are independent settings.

Credential resolution per provider, when no key is stored via the UI:

- **Anthropic** — `ANTHROPIC_API_KEY`, else (macOS only) the OAuth token the
  `claude` CLI manages in the Keychain (`security -s "Claude Code-credentials"`).
  Run `claude` once to log in. Keychain calls consume your **Claude subscription
  quota**; macOS shows a one-time "Allow access" prompt; if you see a 401, re-run
  `claude` to refresh. Linux/Windows: set `ANTHROPIC_API_KEY`.
- **OpenAI** — `OPENAI_API_KEY`. **Google** — `GEMINI_API_KEY` / `GOOGLE_API_KEY`.
- **openai-compatible** — usually keyless; set the base URL (env `OPENAI_BASE_URL`
  as a fallback).

Keys entered in the UI are stored in SQLite, **encrypted at rest** (AES-256-GCM).
The symmetric key comes from **`MIDNITE_SECRET_KEY`** — 32 bytes encoded as hex
(64 chars) or base64. Generate one with:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Encryption is **fail-closed**: with no `MIDNITE_SECRET_KEY` set, the gateway
**cannot decrypt** stored keys (those providers read as having no key and are
disabled) and **refuses to save** a new key (the UI shows a clear error). There
is no silent plaintext fallback. Legacy plaintext rows (written before this
landed) are read as-is and **re-encrypted in place** on the next write or once at
startup when a key is present. Either way the API only ever returns `hasKey` +
the last 4 characters. The gateway logs a one-time warning at startup when the
key is unset.

The workflow **AI node** runs through the active provider by default, or you can
pin it to a specific provider in the node's config.

If the active provider has no usable credential, AI features degrade gracefully
(the classifier falls back to a placeholder title, the heartbeat records a skipped
run, etc.) and the gateway logs a warning at startup.

Implementation: [`packages/gateway/src/agent/llm/`](packages/gateway/src/agent/llm) (the `LlmService` + per-provider adapters) and [`packages/gateway/src/agent/anthropic-credentials.ts`](packages/gateway/src/agent/anthropic-credentials.ts) for the Anthropic env/Keychain fallback.

### LLM usage & cost tracking

Every call the gateway makes through `LlmService` (task triage, planner,
projects, agent heartbeats, the workflow AI node, …) records a `llm_usage` row —
provider, model, feature, token counts, and a **best-effort** estimated cost from
a static price table. `GET /usage/summary?from=&to=&groupBy=day|provider|feature`
returns totals + grouped buckets; the dashboard's **LLM cost & usage** widget
renders it.

Cost controls are **track + soft-warn only** — usage is recorded and warnings
surface near a budget, but calls are **never blocked**. Optional soft budgets in
`midnite.json`:

```jsonc
{
  "usage": {
    "dailyBudgetUsd": 5,       // optional; omit to disable the daily warning
    "monthlyBudgetUsd": 100,   // optional; omit to disable the monthly warning
    "warnAtRatio": 0.8         // warn once spend hits 80% of a budget (default)
  }
}
```

Costs are estimates only (the price table omits caching/batch/tier discounts).

Separately, **agent-session** cost — the token counts harvested from each Claude
Code session's transcript, attributed by task/repo/project/session — is served by
`GET /usage/attribution` and surfaced by **`midnite usage --by <group>`**, while the
fleet ops summary (live gauges, throughput, run durations, outcomes) is
`GET /metrics/ops` / **`midnite ops [--watch]`**. The full model — measured vs.
estimated vs. unpriced, where session tokens come from, rollup grain, and retention
knobs — is documented in **[`docs/METRICS.md`](docs/METRICS.md)**.

### Retrospectives

Every task that reaches `done`/`abandoned` gets a **retrospective**: a factual,
deterministic skeleton (timeline, attempts, failure story, durations, review, PR)
assembled with **zero LLM calls**, plus an optional one-paragraph **AI narrative**
layered on by the retro workflow. The cost model is honest and cheap — skeleton
free, narrative one small plan-model call (bounded by `retro.narrativeMaxTokens`
and the P50 spend caps), **fail-soft to the skeleton** when AI is off / capped /
unavailable. Read one with **`midnite retro <taskId>`** (`--json`, or `--export
[file]` for markdown); the config knobs (`retro.autoSkeleton`,
`retro.narrativeMaxTokens`) and the full model live in
**[`docs/RETROS.md`](docs/RETROS.md)**.

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

### Visual regression baselines

Playwright's `toHaveScreenshot` baselines live in `packages/web/e2e/__screenshots__/` and are OS-pinned. **Regenerate them on Linux** (so they match the CI `ubuntu-latest` runner) via Docker:

```sh
cd packages/web
docker run --rm --ipc=host --platform linux/amd64 \
  -v "$(pwd)":/work -w /work/packages/web \
  mcr.microsoft.com/playwright:v1.61.0-jammy \
  bash -c "npm i -g pnpm@10 && pnpm install --frozen-lockfile && \
    pnpm exec playwright test --project=screenshots --update-snapshots"
```

Commit the updated PNGs in the same PR as the UI change. Run `moon run web:screenshots` locally to verify against the committed baselines.

## Where to go next

- **Designing a change?** Read [`docs/INITIAL_PLAN.md`](docs/INITIAL_PLAN.md) first.
- **Picking up work?** Open the relevant `todo/phase-N-*.md` and grab an unchecked box. When you finish, move it into [`todo/done.md`](todo/done.md) (most-recent first).
- **Coding conventions?** [`CLAUDE.md`](CLAUDE.md) is the agent brief — it also documents the layering rules, package boundaries, and the golden rule (`shared` is the contract).
