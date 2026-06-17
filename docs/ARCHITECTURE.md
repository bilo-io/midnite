# midnite — Architecture

> How midnite actually works, end to end. Companion to [`INITIAL_PLAN.md`](./INITIAL_PLAN.md)
> (the design source of truth). Where this doc and the plan disagree, this doc
> describes what is **in the code today**; the plan describes intent.

---

## TL;DR

midnite is a **multitask orchestrator for Claude Code** (and other coding-agent
CLIs). It's a monorepo of four packages with a strict one-way dependency graph:

```
shared ◀── gateway        shared = the contract (zod schemas + types)
shared ◀── cli            gateway = the long-running daemon (Nest + Fastify + SQLite)
shared ◀── web            cli / web = pure HTTP/WS clients of the gateway
```

- **The gateway is the brain.** A single long-running Nest.js daemon (Fastify
  adapter, SQLite via Drizzle) that owns the task store, schedulers, the PTY
  pool, and the REST + WebSocket API. Everything else is a client.
- **Clients are thin.** The **web** kanban (Next.js App Router) and the **cli**
  (commander) only talk to the gateway over HTTP/WS. They never reach into
  gateway internals; the wire contract lives entirely in **shared**.

The four things you were unsure about, in one paragraph each:

- **Bi-directional terminal.** The browser runs **xterm.js**; the gateway runs a
  real **node-pty** process per session. They're bridged by a single Nest
  **WebSocket gateway at `/ws/terminal`**. Keystrokes go browser → WS → `pty.write()`;
  output goes `pty.onData` → WS → `term.write()`. All bytes are base64-encoded,
  every output frame carries a monotonic `seq`, and the gateway keeps a bounded
  **ring buffer** so a reconnecting tab replays scrollback. Attach is gated by a
  short-lived single-use token minted over REST.

- **Claude CLI vs Claude API.** midnite uses **both, for different jobs.** Anything
  *interactive or agentic* — your sessions, council debate turns — **spawns a CLI
  binary** (`claude`, `gemini`, …) inside a PTY. The only place it calls the
  **Anthropic SDK directly** is short, stateless utility calls: the **heartbeat**
  check-in and the agent **`ping`/health-check**. Rule of thumb: *work that needs a
  terminal, tools, or a working directory → CLI subprocess; tiny fire-and-forget
  text completions → API*.

- **Gemini & other models vs sessions.** A **session** is one agent CLI in one PTY
  doing one task. A **council** is a different thing: a standing panel of
  participants, each pinned to a `provider` (`claude` / `gemini` / `codex` /
  `opencode` / `aider`) and a fixed *perspective*. Submitting a topic spawns every
  participant as a **one-shot CLI run in parallel** (`claude -p "…"`, `gemini -p "…"`),
  then anonymizes their answers (shuffle → label A/B/C) and feeds them to a
  **verdict provider** (defaults to Gemini) for synthesis. Non-Claude models are
  **only ever reached as installed CLIs** — there's no Gemini/OpenAI API client in
  the codebase.

- **Knowing a session's state.** Sessions don't have their own stored state — a
  session's status is **derived from its task's status** (`wip → running`,
  `waiting → waiting`, `done → completed`, everything else `→ idle`). Task status
  changes via the REST API and, importantly, via **Claude Code hooks** that call
  back into the gateway. Today the **PreToolUse hook** is wired: it POSTs to
  `/hooks/sessions/:id/pre-tool-use` and *blocks* the agent until a human answers
  the approval prompt — that's the "requires input" signal. Clients currently learn
  about status changes by **polling `/sessions`**; live push (beyond terminal I/O)
  is scaffolded but not yet the transport for board state.

---

## 1. High-level overview

### Mental model

midnite turns a freeform pile of intentions into supervised agent work:

```
 add task ──▶ backlog ──▶ todo ──▶ wip ⇄ waiting ──▶ done (+ PR url)
                                    └──────────────▶ abandoned
```

A task is the unit of work. When a task is being worked, it has a **session** — a
live PTY in which a coding-agent CLI runs. You watch and steer that session live
through an embedded terminal in the browser. Alongside this, midnite has several
satellite features that share the same infrastructure (PTYs, the agent-CLI
abstraction, the typed wire contract): **councils** (multi-model debate),
**workflows** (node-based automation with cron/webhook triggers), **routines**,
**notes**, **media**, **memory/knowledge**, and a dashboard.

### The packages

| Package | Role | Stack / entry |
|---|---|---|
| `packages/shared` | **The contract.** All zod schemas, domain types, event shapes, config schema. Depends on nothing else in the repo. | TS, `src/index.ts` |
| `packages/gateway` | **The daemon.** Task store, schedulers, PTY pool, REST + WS API, DB. | Nest.js + Fastify adapter, SQLite + Drizzle, `src/main.ts` |
| `packages/cli` | **Terminal client.** `add`, `list`, `move`, `serve`. Thin — parse args, call API, render. | commander, `src/index.ts` |
| `packages/web` | **Browser kanban + everything-UI.** | Next.js App Router, React 19, TanStack Query, Zustand, @dnd-kit, xterm.js, `app/layout.tsx` |

**Golden rule (from CLAUDE.md):** if two packages must agree on a shape, that
shape lives in `shared`. `cli` and `web` are pure HTTP/WS clients — they never
import gateway internals.

### Request/response shape

Every REST/WS payload has a zod schema in `shared`. The gateway validates input
with a `ZodValidationPipe` at the controller boundary and returns
schema-conforming output. The web client (`packages/web/lib/api.ts`) imports those
same schemas and parses responses with them, so the contract is enforced on both
ends. (Note: the "typed API client" is realized as `web/lib/api.ts` building on
shared schemas — there isn't a separate published SDK module in `shared` yet.)

---

## 2. The gateway

### Layering (per feature)

```
controller (thin: decode/encode, no logic)
  → service   (all business logic, owns transactions)
    → repository (Drizzle queries only)
gateway (Nest WS) — the WebSocket counterpart of a controller
```

Each feature is a Nest module registered in `AppModule`: `tasks`, `projects`,
`sessions`, `terminal`, `agents`, `councils`, `workflows`, `routines`, `notes`,
`media`, `memory`, `knowledge`, plus health/fs/news/weather.

### REST API surface (by feature)

> Base URL defaults to `http://127.0.0.1:7777`.

**Health** — `GET /health`

**Tasks**
- `GET /tasks` (`?status=`, `?projectId=`), `GET /tasks/counts`, `GET /tasks/:id`
- `POST /tasks` (multipart: `prompt`, `repo`, `projectId`, `status`, image files)
- `PATCH /tasks/:id/status`, `PATCH /tasks/:id/project`
- `POST /tasks/:id/links`, `DELETE /tasks/:id/links/:linkId`, `DELETE /tasks/:id`

**Sessions**
- `GET /sessions` → `SessionSummary[]` (the board's status source — see §6)
- `GET /sessions/:projectSlug/:id/transcript`
- `POST /sessions/:id/terminal-token` → `{ token, wsUrl }` (mint WS attach token)
- `POST /sessions/:id/archive`, `POST /sessions/:id/unarchive`, `DELETE /sessions/:id`

**Terminal** (CLI lifecycle, not session attach)
- `POST /terminal/:action/:cli` — `action ∈ install|launch|uninstall`

**Approvals / hooks** (human-in-the-loop tool gating — see §6)
- `POST /hooks/sessions/:sessionId/pre-tool-use` (authenticated by per-session secret)

**Agents**
- `GET /agents`, `PUT /agents/cli`, `GET /agents/cli/:cli/status`, `POST /agents/ping`
- `PUT /agents/primary`, `POST/PATCH/DELETE /agents/subagents…`
- `GET /agents/heartbeat/runs`, `POST /agents/heartbeat/run`

**Councils**
- `GET/POST /councils`, `GET/PATCH/DELETE /councils/:id`
- `POST/PATCH/DELETE /councils/:id/participants…`
- `POST /councils/:id/runs`, `GET /councils/:id/runs`, `POST /councils/:id/runs/:runId/retry`

**Workflows**
- `GET/POST /workflows`, `GET/PATCH/DELETE /workflows/:id`
- `POST /workflows/:id/run`, `GET /workflows/:id/runs[/:runId]`, `POST /workflows/:id/webhook/rotate`
- `POST /webhooks/:workflowId/:token` (trigger ingestion)

**Projects, Memory, Notes, Routines, Media** — standard CRUD per feature.

### WebSocket surface

One live gateway today: **`/ws/terminal`** (`TERMINAL_WS_PATH`). Discriminated,
base64-encoded messages (see §3 for the full protocol).

**Workflow events** (`run.started`, `node.started`, `node.succeeded`,
`node.failed`, `run.finished`, `run.failed`) are *defined* in
`shared/src/events/workflow.ts` but are not yet the live transport — workflow run
state is currently read over REST.

### Data model (SQLite + Drizzle)

Schema is the single source of truth: `packages/gateway/src/db/schema.ts`.
Conventions: UUIDs minted in the service layer before insert; **no cross-domain
foreign keys** (enforced in app code); soft-archive via `archivedAt`; JSON columns
for complex payloads (`graph`, `trigger`, `labelMap`, …).

Key tables:

- **tasks** + **taskEvents** (append-only timeline) + **taskAttachments** + **taskLinks**
- **projects** + **projectSources** / **globalSources**
- **workflows** + **workflowRuns** + **nodeRuns**
- **primaryAgent** (singleton) + **subagents** + **heartbeatRuns**
- **councils** + **councilParticipants** + **councilRuns** + **councilRunParticipants**
- **memories** (+ sources), **notes**, **routines** (+ groups/items/progress), **media**

> Note: sessions have **no table** — a "session" is a projection over a task
> (§6). The task is the durable record.

### Schedulers

Both are **single, gateway-owned, never-parallel tick loops** (Nest
`OnModuleInit`/`OnModuleDestroy`), matching the design rule "never spawn parallel
schedulers":

- **WorkflowScheduler** (`workflows/scheduler/workflow-scheduler.service.ts`):
  tick (default 30s) → evaluate each enabled cron workflow with `croner` →
  enqueue a run if a slot elapsed since `lastFiredAt`.
- **HeartbeatScheduler** (`agents/heartbeat-scheduler.service.ts`): coarse tick →
  if the primary agent's `heartbeatIntervalH` has elapsed since `lastHeartbeatAt`,
  fire the heartbeat prompt (via the Anthropic **API**, §4).

### Config

Single file `midnite.json`, validated by the zod schema in
`packages/shared/src/config.ts`. Never read outside `shared`'s loader — every
consumer takes a `MidniteConfig`. Notable sections:

```jsonc
{
  "agent":    { "pool": 4, "provider": "claude", "plan": "opus4.7", "act": "haiku4.5" },
  "terminal": { "mode": "pty", "layout": "split" },   // scrollbackBytes, idleDisposeMs,
                                                       // maxSessions, inheritSecrets, approvals{...}
  "knowledge":{ "dir": "./knowledge" },
  "gateway":  { "port": 7777 },                        // host, allowedOrigins, dbPath, uploadsDir
  "workflows":{ "allowLoopbackHttp": true }            // dev only
}
```

`agent.plan` / `agent.act` are model **aliases** (`opus4.8`, `haiku4.5`, …)
resolved to real model IDs in the gateway (§4). `terminal.approvals` controls the
tool-approval flow (§6).

---

## 3. Deep dive: the bi-directional terminal

This is the centerpiece. It connects an xterm.js instance in the browser to a real
PTY on the gateway, in both directions, with reconnect-safe scrollback.

### The players

| Layer | File |
|---|---|
| xterm.js component | `packages/web/components/live-terminal.tsx` |
| session wrapper | `packages/web/components/session-terminal-impl.tsx` |
| WS lifecycle hook | `packages/web/hooks/use-terminal-socket.ts` |
| Nest WS gateway | `packages/gateway/src/terminal/terminal.gateway.ts` |
| PTY service (node-pty) | `packages/gateway/src/terminal/terminal.service.ts` |
| wire protocol | `packages/shared/src/events/terminal.ts` |

### The handshake

```
browser                                       gateway
   │  POST /sessions/:id/terminal-token          │   mint single-use token, 60s TTL
   │ ───────────────────────────────────────────▶
   │  { token, wsUrl: "/ws/terminal" }           │
   │ ◀───────────────────────────────────────────
   │                                             │
   │  WS connect  /ws/terminal                   │   validate Origin against
   │ ───────────────────────────────────────────▶   config.gateway.allowedOrigins
   │  { type:"attach", sessionId, token,         │   verifyToken(sessionId, token)
   │    cols, rows }                              │   → attach subscriber to PTY
   │ ───────────────────────────────────────────▶   (spawn one if none live)
   │  { type:"status", phase:"spawning"|"ready"  │
   │     |"reattached" }                          │
   │ ◀───────────────────────────────────────────
   │  { type:"output", seq, data(b64) } …         │   replays ring buffer on attach
   │ ◀───────────────────────────────────────────
```

Token minting is REST; the token is **single-use with a 60-second TTL**, so the
long-lived WS connection is authorized by a short-lived credential rather than a
session cookie. Origin is checked against `allowedOrigins` before the socket is
accepted.

### Output: PTY → gateway → browser

`terminal.service.ts` holds one `PtyHandle` per live session:

```ts
interface PtyHandle {
  proc: IPty;                       // the node-pty process
  subscribers: Set<TerminalSubscriber>;
  ring: OutputFrame[];              // bounded scrollback (config.terminal.scrollbackBytes)
  seq: number;                      // monotonic output sequence
  disposeTimer; pinned; settingsFile; …
}
```

`proc.onData(chunk)` → build an `OutputFrame { seq: ++handle.seq, data: base64(chunk) }`
→ push into `ring` (evicting oldest once over the byte cap) → broadcast
`{ type:"output", data, seq }` to every subscriber. Each WS connection is a
`TerminalSubscriber` whose `send()` does `ws.send(JSON.stringify(message))`.

### Input: browser → gateway → PTY

In `live-terminal.tsx`, `term.onData(d => send({type:"input", data: base64(d)}))`
captures every keystroke/paste. The gateway decodes and writes straight to the
process:

```ts
handle.proc.write(Buffer.from(msg.data, 'base64').toString('utf8'));
```

Resize is symmetric: xterm's `FitAddon` reports new geometry →
`{type:"resize", cols, rows}` → `handle.proc.resize(cols, rows)`.

### Reconnect & scrollback

Output frames are sequenced, and the client tracks `lastSeq`. On a dropped socket
the hook reconnects with exponential backoff (capped ~5s) and re-attaches; the
gateway **replays the ring buffer** so the tab catches up. Multiple tabs can
subscribe to the same session — they all receive the same broadcast.

### Lifecycle: spawn, bind, reap

- **Spawn on demand.** Attaching to a session with no live PTY spawns one. The
  working directory is resolved (`resolveCwd`) from the task's project workDir →
  configured repo path → gateway cwd, and the launch command is the agent CLI
  for the current global preference (e.g. `cd <cwd> && clear && claude`).
- **Env wiring.** The PTY inherits `process.env` (optionally scrubbing secrets
  unless `terminal.inheritSecrets`), and sets `TERM=xterm-256color` plus
  `MIDNITE_SESSION_ID`, `MIDNITE_HOOK_SECRET`, `MIDNITE_GATEWAY_URL` — the wiring
  the approval hook needs (§6).
- **Idle reaping.** When the last subscriber detaches, a timer
  (`terminal.idleDisposeMs`, default 5min) kills the PTY. **Managed runs**
  (councils) are `pinned` and never idle-reaped.
- **Ad-hoc terminals.** CLI install/launch (`POST /terminal/:action/:cli`) use a
  separate synthetic-ID path — same PTY plumbing, no approval/session wiring.

---

## 4. Deep dive: Claude CLI vs Anthropic API

midnite uses **both**, and the split is clean once you see the principle:

> **Interactive / agentic / needs-a-working-directory → spawn a CLI binary in a PTY.
> Tiny stateless text completion → call the Anthropic SDK directly.**

### CLI subprocess path (the common case)

Used for **sessions** and **council turns**. The CLI binary is chosen from a
global preference (`AgentCli`) and launched via node-pty:

| Use | How | Where |
|---|---|---|
| Interactive session | launch `claude` (or chosen CLI) in a PTY | `terminal/terminal.service.ts` |
| Council participant turn | one-shot `claude -p "<prompt>"`, `gemini -p "<prompt>"`, … | `councils/lib/oneshot-command.ts` + `council-runner.service.ts` (`spawnManagedRun`) |

`oneshotCommand(cli, prompt)` maps each provider to its non-interactive form
(`claude -p`, `gemini -p`, `codex exec`, etc.). Because node-pty doesn't go through
a shell, the prompt is passed as a single argv entry — no shell quoting hazards.

### Anthropic SDK path (the exception)

Only **short, stateless utility calls** hit the API directly, in
`agent/anthropic.service.ts`:

- **Health check / `ping`** — `POST /agents/ping`. When the active CLI is `claude`,
  it does a real `client.messages.create({ max_tokens: 16, … })` round-trip;
  for other CLIs it shells out to `<cli> --version` instead.
- **Heartbeat** — the primary agent's periodic check-in fires the heartbeat prompt
  through the SDK (`HEARTBEAT_MAX_TOKENS = 4096`), driven by HeartbeatScheduler.

**Models.** Aliases resolve in `anthropic.service.ts`:

```ts
'opus4.8'   → 'claude-opus-4-8'
'sonnet4.6' → 'claude-sonnet-4-6'
'haiku4.5'  → 'claude-haiku-4-5-20251001'
// legacy aliases (e.g. sonnet4.7) remap to a current id
```

`agent.plan` (default `opus4.8`) is the heavier "planning/classification" model;
`agent.act` (default `haiku4.5`) is the cheap "execution" model — the plan/act
split from INITIAL_PLAN.md.

**Credentials** (`agent/anthropic-credentials.ts`): `ANTHROPIC_API_KEY` first,
otherwise fall back to the macOS keychain (`security find-generic-password` against
the `Claude Code-credentials` entry) — so it can reuse an existing Claude Code
login (API key or OAuth token) without separate setup.

---

## 5. Deep dive: councils & multi-model (Gemini et al.)

### Session vs council — the key distinction

- A **session** = one agent CLI, one PTY, one task, interactive, long-lived.
- A **council** = a standing **panel** that debates a topic. Each participant is a
  *separate one-shot CLI run*, they run **in parallel**, and their outputs are
  **anonymized and synthesized** into a verdict.

Councils reuse the PTY infrastructure (`spawnManagedRun`, pinned so they aren't
reaped) but are otherwise their own subsystem.

### Data model

```
councils                 (id, name, verdictProvider="gemini" default, …)
  └─ councilParticipants (provider: AgentCli, perspective: text, position)
  └─ councilRuns         (topic, status: running|synthesizing|completed|failed,
                          verdict: markdown, labelMap: JSON {A→participantId})
       └─ councilRunParticipants  (snapshot per run: provider, perspective,
                                    status, terminalId, output, label "A"/"B"/…)
```

A **run snapshots** its participants, so editing the council later doesn't mutate
historical runs.

### How a run executes

1. **Fan out.** For each participant, spawn its provider's one-shot CLI in parallel
   (`spawnManagedRun` → `oneshotCommand(provider, prompt)`), capturing stdout into
   a buffer. Per-run timeout (default ~600s from `config.councils`); ~2 MB capture
   cap per participant.
2. **Settle independently.** No voting between participants; each just succeeds /
   fails / times out. The run needs **≥2 successes** or it fails.
3. **Anonymize.** Successful outputs are **shuffled** and relabeled **A / B / C…**;
   the `label → participantId` map is persisted *before* synthesis so the verdict
   step can't see who said what.
4. **Synthesize.** The council's **verdict provider** (default **Gemini**) is run
   as another one-shot CLI over the anonymized entries, producing a markdown
   verdict that weighs the options blind.

### How non-Claude models are reached

Through the **`AgentCli` abstraction only** (`shared/src/agents.ts`):

```
AGENT_CLIS = ['claude', 'gemini', 'codex', 'opencode', 'aider']
AGENT_CLI_COMMAND        = { claude:'claude', gemini:'gemini', … }
AGENT_CLI_INSTALL_COMMAND= { gemini:'npm install -g @google/gemini-cli', … }
```

There is **no Gemini/OpenAI API client in the repo**. Every non-Claude model is
invoked purely as an installed CLI binary (and the gateway can install/launch them
via `POST /terminal/:action/:cli`). This is why councils can mix providers freely —
they're all just `<cli> -p "<prompt>"` subprocesses.

### How it all relates

```
Task ──▶ Session (one agent CLI in a PTY)            ← your main loop

Primary agent (singleton) ──▶ heartbeat (Anthropic API, scheduled)
                          └─▶ subagents (metadata/roster only)

Council (standing panel) ──▶ Run ──▶ N participant one-shot CLIs (parallel, any provider)
                                  └─▶ anonymize ──▶ verdict provider (CLI, default Gemini)
```

---

## 6. Deep dive: knowing a session's state

This is the subtlest part, because **a session has no stored state of its own**.

### State is derived, not stored

`SESSION_STATUSES = ['running', 'waiting', 'completed', 'idle']`, but a session's
status is computed on the fly from its **task** status
(`sessions.service.ts`, `STATUS_MAP`):

```
task.backlog  → idle        task.wip       → running
task.todo     → idle        task.waiting   → waiting
task.done     → completed   task.abandoned → idle
```

So to know "is this session running / idle / waiting?", you read the task. The
task is the durable truth; the session summary is a projection (`GET /sessions`
maps every task through `toSummary`, including a `lastActivity` for sorting).

### What moves a task between states

1. **Explicit API calls.** `PATCH /tasks/:id/status` updates the row and appends a
   `status.changed` record to **taskEvents** (the append-only timeline). Moving to
   `abandoned` also archives the session.
2. **Claude Code hooks calling back into the gateway.** This is the important
   mechanism, and the design intent (INITIAL_PLAN.md) is that hooks — not
   screen-scraping — drive transitions:
   - `Notification` hook → `waiting` ("agent needs input")
   - `Stop` hook → `done` (with PR URL)

### The hook that's wired today: PreToolUse / approvals

The fully-implemented hook is **tool approval** — and it's also the concrete
"**requires input**" signal:

```
inside the PTY: Claude Code PreToolUse hook (pre-tool-use-hook.cjs)
   │ reads tool-call JSON on stdin
   │ POST /hooks/sessions/:sessionId/pre-tool-use
   │   header x-midnite-hook-secret: <per-session secret>   (never the body → never logged)
   ▼
gateway approval.controller → approval.service.requestDecision()
   │ if tool already allow-listed for session → allow immediately
   │ else broadcast {type:"approval-request", requestId, toolName, summary, options}
   │       to the session's terminal WS subscribers
   │ ⏸ BLOCKS (returns a pending Promise) until one of:
   │     • viewer answers over WS  {type:"approval-response", decision}
   │     • timeout (config.terminal.approvals.timeoutMs, default 120s → onTimeout)
   │     • no subscriber watching   → config.terminal.approvals.onNoSubscriber
   ▼
returns { decision: 'allow' | 'deny' | 'ask' } to the hook → hook prints it → agent proceeds/stops
```

Key points:

- The hook is registered by writing an **ephemeral Claude `--settings` file** when
  the PTY spawns, and authenticated by a **per-session secret** minted server-side
  (`MIDNITE_HOOK_SECRET` in the PTY env). The body is never trusted alone.
- `requestDecision` genuinely **blocks the HTTP request** until resolved — that's
  how the agent is paused while waiting for you. `decision: 'allow-session'` adds
  the tool to the session's allowlist so it won't ask again that session.
- On resolution the gateway broadcasts `{type:"approval-resolved", …}` so every
  watching tab clears its overlay.
- Approvals are off unless `config.terminal.approvals.enabled` is true.

### How clients learn about state changes

- **Terminal-level state** (spawning / ready / reattached / exited, and
  approval-request/resolved) is **pushed live** over `/ws/terminal`.
- **Board / session-level state** (running vs idle vs waiting vs done) is currently
  obtained by **polling** `GET /sessions` (and `GET /tasks`) — the web app uses
  TanStack Query polling. The append-only **taskEvents** timeline is the audit log
  of every transition. A push channel for board state exists in shape
  (`shared/src/events/*`) but is not yet the live transport.

**Practical answer to "how do I detect a state change?":**
- *Right now:* poll `GET /sessions` / `GET /tasks/counts`, and/or read the
  `taskEvents` timeline; subscribe to `/ws/terminal` for live "needs input"
  (approval-request) and "ended" (status exited) signals.
- *By design (and the direction of travel):* Claude Code's `Notification` and
  `Stop` hooks should flip tasks to `waiting`/`done` automatically via the same
  `/hooks/...` callback pattern the approval hook already uses.

---

## 7. File-path quick reference

**Terminal**
- `packages/web/components/live-terminal.tsx`, `hooks/use-terminal-socket.ts`
- `packages/gateway/src/terminal/terminal.gateway.ts`, `terminal.service.ts`
- `packages/shared/src/events/terminal.ts`

**Approvals / hooks (state)**
- `packages/gateway/src/terminal/approval.controller.ts`, `approval.service.ts`
- `packages/gateway/src/terminal/hooks/pre-tool-use-hook.cjs`
- `packages/gateway/src/sessions/sessions.service.ts` (STATUS_MAP), `sessions.controller.ts`
- `packages/shared/src/session.ts`, `packages/shared/src/task.ts`

**CLI vs API**
- `packages/gateway/src/agent/anthropic.service.ts`, `anthropic-credentials.ts`
- `packages/gateway/src/agents/heartbeat-scheduler.service.ts`
- `packages/gateway/src/councils/lib/oneshot-command.ts`

**Councils / multi-model**
- `packages/shared/src/council.ts`, `packages/shared/src/agents.ts`
- `packages/gateway/src/councils/councils.service.ts`, `council-runner.service.ts`

**Core**
- `packages/gateway/src/db/schema.ts` (data model)
- `packages/shared/src/config.ts` + `midnite.json` (config)
- `packages/web/lib/api.ts` (client)
- `docs/INITIAL_PLAN.md` (design source of truth)
