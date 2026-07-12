import { z } from 'zod';
import { ChecksConfigSchema } from './checks.js';
import { LLM_PROVIDER_DEFAULT, LlmProviderSchema } from './llm.js';
import { UsageConfigSchema } from './usage.js';

export const RepoConfigSchema = z.object({
  name: z.string(),
  path: z.string(),
  // Optional per-repo conventions seeded into the registry on first boot; the
  // DB is authoritative thereafter. Fed to the agent's seed prompt — see the
  // gateway's `appendRepoConventions`.
  branchPrefix: z.string().optional(),
  prTemplate: z.string().optional(),
});

export const AgentConfigSchema = z.object({
  pool: z.number().int().positive().default(4),
  // Default LLM provider for the gateway's own AI features. The DB (provider
  // settings, set via the UI) is the runtime source of truth; this is the
  // fallback. Legacy configs used 'claude' — normalised to 'anthropic'.
  provider: z
    .preprocess((v) => (v === 'claude' ? 'anthropic' : v), LlmProviderSchema)
    .default(LLM_PROVIDER_DEFAULT),
  plan: z.string().default('opus4.8'),
  act: z.string().default('haiku4.5'),
  // Feature flag — the agent pool scheduler is greenfield, so it ships off by
  // default. When off, sessions only spawn when a human attaches a terminal.
  poolEnabled: z.boolean().default(false),
  // How often the single pool tick loop wakes to assign ready `todo` tasks to
  // free slots. Mirrors the workflow/heartbeat scheduler cadence knobs.
  schedulerTickMs: z.number().int().positive().default(5000),
  // Whether a task in `waiting` (agent blocked on user input) keeps holding its
  // pool slot. On by default — the session's PTY is literally still alive and
  // blocked on stdin, so freeing the slot would orphan it.
  waitingHoldsSlot: z.boolean().default(true),
  // Hard ceiling per autonomous agent run; the session is cancelled on expiry
  // and the task requeued. Mirrors councils.runTimeoutMs.
  runTimeoutMs: z.number().int().positive().default(1800000),
  // How many times a task is auto-retried after an agent session exits
  // unexpectedly (crash) before it's abandoned. 0 = never retry crashes.
  maxRetries: z.number().int().nonnegative().default(3),
  // Exponential backoff between retryable failures (crash/timeout) — Phase 53 B.
  // The Nth retry waits a random 0..min(base * 2^N, max) ms ("full jitter") before
  // the scheduler re-picks it, so a crash-looping task can't hammer the pool.
  // `retryBackoffBaseMs = 0` disables backoff (retries are instant, as before Phase 53).
  retryBackoffBaseMs: z.number().int().nonnegative().default(10000),
  maxBackoffMs: z.number().int().positive().default(300000),
  // Max concurrent agents running on the same repo (keyed by `task.repo`).
  // 0 = unlimited. Guards against N agents racing on one working tree: the
  // scheduler skips a task whose repo is already at this cap and picks the next
  // eligible one instead. Repo-less tasks are never capped.
  maxPerRepo: z.number().int().nonnegative().default(0),
  // Max concurrent agent slots a single user may occupy at once.
  // 0 = unlimited (default). When set, the scheduler skips tasks whose owner
  // is already at this cap; the task retries on the next tick. Tasks without
  // a createdBy (legacy static-token path) are never capped.
  perUserMaxSlots: z.number().int().nonnegative().default(0),
  // Live pool watchdog (Phase 54 C): a fail-open pass on the scheduler tick that
  // reconciles the in-memory slots against reality — reclaiming orphaned slots
  // (task gone/terminal) and dead sessions (spawner reports not-alive), so a
  // leaked slot can't silently wedge the pool until a restart.
  watchdog: z
    .object({
      // On by default: the reclaim path only ever heals already-broken state
      // (orphaned/dead slots), so it's safe. Set false to disable entirely.
      enabled: z.boolean().default(true),
      // No-output heartbeat: if a `wip` agent session emits nothing for this many
      // ms it's treated as hung and reconciled (classified `inactivity`) before the
      // 30-min run timeout. 0 = OFF (default) — a healthy agent can legitimately be
      // silent for minutes, so this stricter probe is opt-in. pty backend only
      // (tmux has its own pane-dead poll).
      inactivityMs: z.number().int().nonnegative().default(0),
    })
    .default({}),
  // Max agent spawns permitted in any rolling 1-hour window (Phase 50 Theme B).
  // 0 = unlimited (default). Enforced globally: when the window is full the
  // scheduler blocks further spawns ("held: rate-limited") until the oldest
  // spawn ages out. In-memory sliding window — resets on restart (a throttle,
  // not a durable ledger).
  maxSpawnsPerHour: z.number().int().nonnegative().default(0),
  // Phase 53 D — when true (default), a non-retryable or retry-exhausted failure
  // escalates the task to a needs-attention `waiting` state (with a typed
  // `waitReason`) instead of silently `abandoned`; a human then requeues/re-plans/
  // abandons it. Set false to restore the pre-Phase-53 straight-to-abandoned path.
  escalateOnFailure: z.boolean().default(true),
  // Phase 53 D — escalating reminders for a task stuck in a needs-attention
  // `waiting` state. `afterHours = 0` disables nudges entirely (no reminders).
  waitingNudge: z
    .object({
      // Hours in `waiting` before the first reminder fires. 0 = nudges off.
      afterHours: z.number().nonnegative().default(0),
      // Hours between subsequent reminders once the first has fired.
      repeatHours: z.number().positive().default(24),
      // Max reminders per task before it stops nudging (still visible on the board).
      maxReminders: z.number().int().positive().default(3),
      // How often the nudge loop wakes to re-evaluate waiting durations.
      tickMs: z.number().int().positive().default(300000),
      // Phase 53 C — also proactively flag an aged `todo` (ready/blocked but never
      // started) that's been sitting this many hours since creation, so it's a
      // *push* not just a pull on the doctor/health view. 0 = off (default →
      // behaviour-preserving). Reuses repeatHours / maxReminders / tickMs.
      agedTodoHours: z.number().nonnegative().default(0),
    })
    .default({}),
  // Phase 54 D — when the scheduler's readiness gate finds a dependency down (DB
  // unreachable), it skips the tick and backs off exponentially instead of
  // hammering + log-spamming: the Nth consecutive unready tick waits
  // `min(baseMs * 2^(N-1), maxMs)` before probing again, recovering immediately on
  // the first success. Only engages when the DB is actually down — with a healthy
  // DB the gate never fires, so this is behaviour-preserving.
  readinessBackoff: z
    .object({
      baseMs: z.number().int().positive().default(1000),
      maxMs: z.number().int().positive().default(30000),
    })
    .default({}),
  // Phase 53 E — display thresholds for the "what's wedged?" doctor report
  // (`GET /tasks/doctor`, the web health view + `midnite tasks doctor`). Purely
  // presentational: what counts as a *stuck* `wip` (silent past N min), an *aged*
  // `todo` (waiting to start past N h), or a needs-attention task parked *too
  // long* in `waiting` (past N h). No enforcement — just what the operator sees.
  doctor: z
    .object({
      wipSilentMinutes: z.number().nonnegative().default(15),
      agedTodoHours: z.number().nonnegative().default(24),
      waitingTooLongHours: z.number().nonnegative().default(24),
      /** Rows in the recent-failures window the report summarises. */
      recentFailuresLimit: z.number().int().positive().max(500).default(100),
    })
    .default({}),
});

export const TerminalConfigSchema = z.object({
  // The process backend. `pty` (default) spawns each session in a node-pty the
  // gateway owns — it dies with the gateway. `tmux` runs each session in a
  // detached tmux session that outlives the gateway, so an in-flight agent run
  // survives a restart (the gateway reattaches on boot). `warp`/`iterm` were
  // dropped (Phase 17 §3): native windows bypass the browser stream, approval
  // routing, and the ring buffer, so they never composed with the model.
  mode: z.enum(['pty', 'tmux']).default('pty'),
  layout: z.enum(['split', 'tabs', 'windows']).default('split'),
  /** Command spawned for an on-demand session PTY. Defaults to an interactive login shell. */
  command: z.string().optional(),
  args: z.array(z.string()).default([]),
  /** Bytes of recent output retained per PTY for scrollback replay on (re)attach. */
  scrollbackBytes: z.number().int().positive().default(262144),
  /** Grace period after the last client detaches before the PTY is reaped. */
  idleDisposeMs: z.number().int().nonnegative().default(300000),
  /** Max concurrent live PTYs; further spawns are rejected until one frees up. */
  maxSessions: z.number().int().positive().default(16),
  /** Pass the gateway's secret-looking env vars (API keys, tokens) into the PTY. Off by default; enable for `command: "claude"`. */
  inheritSecrets: z.boolean().default(false),
  /**
   * Human-in-the-loop tool approvals for `command: "claude"` sessions. When enabled,
   * a PreToolUse hook routes Claude's tool-permission requests to the web UI.
   */
  approvals: z
    .object({
      // Off by default — only meaningful when the PTY command is `claude`.
      enabled: z.boolean().default(false),
      // How long the gateway holds a pending approval before auto-resolving.
      timeoutMs: z.number().int().positive().default(120000),
      // What to do when the approval times out with no answer (fail-safe = deny).
      onTimeout: z.enum(['deny', 'ask']).default('deny'),
      // What to do when no browser is watching the session (fall back to Claude's own TUI prompt).
      onNoSubscriber: z.enum(['deny', 'ask']).default('ask'),
    })
    .default({}),
  /** URL the in-PTY hook script calls back on. Defaults at runtime to the gateway's loopback address. */
  hookCallbackUrl: z.string().optional(),
});

// Optional remote-access auth (Phase 7 A5). Off by default — midnite is local-only
// out of the box. When a bearer token is configured (or the gateway binds a
// non-loopback host), a Nest guard requires `Authorization: Bearer <token>` on the
// REST API; basic per-IP rate limiting is available too.
export const GatewayAuthConfigSchema = z.object({
  // Name of the env var holding the bearer token — never inline the secret into
  // committed config (mirrors `encryptionKeyEnv` / OAuth `clientSecretEnv`). When
  // that env var is set (non-empty), every REST route requires the token except
  // liveness (`/health`) and the self-authenticating hook callbacks (`/hooks/*`,
  // which carry their own per-session secret). Unset ⇒ no auth (local-only default).
  tokenEnv: z.string().default('MIDNITE_AUTH_TOKEN'),
  // Fail-closed when the gateway binds a non-loopback host with no token resolved:
  // refuse to boot rather than silently exposing an unauthenticated API to the
  // network. Set false to bind non-loopback intentionally without a token.
  requireOnNonLoopback: z.boolean().default(true),
  // Basic per-IP fixed-window rate limit. `max: 0` disables it (the default — a
  // local single-user gateway needs no throttling). When > 0, requests beyond
  // `max` per `windowMs` from one IP get a 429. `/health` is never throttled.
  rateLimit: z
    .object({
      windowMs: z.number().int().positive().default(60000),
      max: z.number().int().nonnegative().default(0),
    })
    .default({}),
  // JWT-based auth (Phase 33). When `secretEnv` resolves to a non-empty value the
  // bearer path accepts both static tokens (legacy) and HS256 JWTs. Off by default.
  jwt: z
    .object({
      secretEnv: z.string().default('MIDNITE_JWT_SECRET'),
      accessTtlSeconds: z.number().int().positive().default(900),
      refreshTtlDays: z.number().int().positive().default(7),
    })
    .default({}),
});

export const GatewayConfigSchema = z.object({
  port: z.number().int().positive().default(7777),
  /** Bind address. Loopback by default — the gateway spawns PTYs, so don't expose it to the network unless you mean to. */
  host: z.string().default('127.0.0.1'),
  /** Optional remote-access auth: bearer token + per-IP rate limiting (off by default). */
  auth: GatewayAuthConfigSchema.default({}),
  /** Extra browser origins allowed to call the API / open the terminal WS. Loopback origins are always allowed. */
  allowedOrigins: z.array(z.string()).default([]),
  uploadsDir: z.string().default('./.midnite/uploads'),
  dbPath: z.string().default('./.midnite/midnite.db'),
  /**
   * Boot preflight strictness (Phase 54 A). Off by default (behaviour-preserving:
   * soft gaps only warn and the gateway still boots). When true, any `warn` from
   * the boot preflight is escalated to a hard failure — the process logs the
   * report and exits non-zero rather than starting in a degraded state. Turn on
   * for production so a misconfigured deploy fails loudly instead of half-working.
   */
  strictBoot: z.boolean().default(false),
  /**
   * Graceful-shutdown drain window (Phase 54 E). On SIGTERM/SIGINT the scheduler
   * pauses (no new spawns) and the gateway waits up to this many ms for in-flight
   * agents to reach a terminal/`waiting` state before requeueing (`pty`) or leaving
   * them to detach + reattach (`tmux`), then WAL-checkpoints + closes the DB. `0`
   * drains immediately (no wait).
   */
  shutdownGraceMs: z.number().int().nonnegative().default(10000),
  /**
   * Path to the web app's static export (`packages/web/out`, from `next build`
   * with `output: 'export'`). When set and the directory has an `index.html`,
   * the gateway serves the UI at `/` so a single process serves both the API and
   * the browser app in prod. Unset (the default) means the UI runs as a separate
   * `next` server — the dev setup. Override at runtime with `MIDNITE_WEB_DIR`.
   */
  webDir: z.string().optional(),
});

// OAuth client config for an integration provider. Secrets are referenced by env-var
// name (clientSecretEnv), never inlined into committed config.
export const OAuthClientConfigSchema = z.object({
  clientId: z.string(),
  clientSecretEnv: z.string(),
  scopes: z.array(z.string()).default([]),
});

// Phase 56 A — realtime WebSocket reliability. The gateway keeps a bounded event
// ring per scoped channel (tasks/ideas per team, workflows per run) so a briefly
// disconnected client can resume without silently missing events (Theme B). This
// is the boot default; admins can retune it live (Settings → runtime-only).
export const WsConfigSchema = z.object({
  // Events retained per scoped channel. Larger = longer resume window, more memory.
  ringSize: z.number().int().positive().default(512),
  // Phase 56 C — per-client backpressure: if a socket's outbound buffer exceeds
  // this, it's dropped-to-resync (closed with 4014) rather than blocking the
  // broadcast or buffering unboundedly.
  maxBufferedBytes: z.number().int().positive().default(1_048_576),
  // Heartbeat: ping every `heartbeatMs`; a socket that misses `maxMissedPongs`
  // consecutive pongs is considered dead and terminated (frees the slot).
  heartbeatMs: z.number().int().positive().default(30_000),
  maxMissedPongs: z.number().int().positive().default(2),
});

// Phase 64 — office multiplayer presence. The presence channel fans out live
// teammate positions on a fixed server tick; nothing is persisted (ephemeral by
// design). Optional (defaulted) so existing midnite.json files keep validating.
export const PresenceConfigSchema = z.object({
  // Server fan-out cadence: one coalesced peer-updated frame per team per tick.
  // ~10Hz feels live without stressing backpressure at realistic peer counts.
  tickMs: z.number().int().positive().default(100),
  // A peer with no frame (move/hello/emote/keepalive) for this long is treated as
  // departed — well under the 30s WS heartbeat, so avatars clear promptly. The
  // client keepalives while idle so a stationary teammate isn't reaped.
  staleMs: z.number().int().positive().default(15_000),
  // Proximity chat (Theme G) — ephemeral bubbles, never persisted. A per-peer
  // token bucket rate-limits sends server-side: `chatBurst` tokens, refilling one
  // every `chatRefillMs`, so a peer may burst a few messages then must slow to
  // ~1 per refill interval. Over-limit messages are dropped (no error).
  chatBurst: z.number().int().positive().default(5),
  chatRefillMs: z.number().int().positive().default(1_000),
});

export const WorkflowsConfigSchema = z.object({
  // Feature flag — workflows is greenfield, so it ships off by default.
  enabled: z.boolean().default(false),
  // Default timezone applied to schedule (cron) triggers that don't specify one.
  defaultTimezone: z.string().default('UTC'),
  // How often the single scheduler tick loop wakes to evaluate cron triggers.
  schedulerTickMs: z.number().int().positive().default(30000),
  // Base URL the gateway is reachable at, used to build copyable webhook URLs.
  webhookBaseUrl: z.string().default('http://localhost:7777'),
  // Allow http.request nodes to call loopback hosts (localhost / 127.0.0.1 / ::1).
  // Off by default — the SSRF guard blocks loopback to stop the gateway being
  // pointed at itself or other local services. Turn on for local dev where a
  // workflow legitimately needs to reach the gateway (e.g. its own /health).
  // Non-loopback private ranges (RFC1918, link-local, *.local) stay blocked.
  allowLoopbackHttp: z.boolean().default(false),
  // Name of the env var holding the symmetric key for the credential vault (future phase).
  encryptionKeyEnv: z.string().default('MIDNITE_WORKFLOWS_KEY'),
  oauth: z
    .object({
      slack: OAuthClientConfigSchema.optional(),
      google: OAuthClientConfigSchema.optional(),
    })
    .default({}),
});

// Runtime knobs for the agents/heartbeat feature. The per-agent heartbeat cadence
// is user data (stored in the DB); this is just the scheduler's tick loop and the
// feature flag. Named *Runtime* to avoid clashing with the shared AgentsConfig
// (the primary agent + subagents the user edits).
export const AgentsRuntimeConfigSchema = z.object({
  // Feature flag — the heartbeat scheduler is greenfield, so it ships off by default.
  heartbeatEnabled: z.boolean().default(false),
  // How often the single heartbeat tick loop wakes to check whether a run is due.
  // Coarse relative to the minimum 1h cadence (≤1 tick of slop is acceptable).
  schedulerTickMs: z.number().int().positive().default(60000),
});

// Runtime knobs for council debates (multi-agent runs + anonymized synthesis).
export const CouncilsConfigSchema = z.object({
  // Hard ceiling per participant one-shot run; the PTY is killed on expiry and
  // the participant is marked timed-out (partial output retained).
  runTimeoutMs: z.number().int().positive().default(600000),
});

// "Knowledge files" — a watched folder of Markdown the plan model can pull
// relevant files from into an agent's execution prompt. Distinct from the
// link-based "Sources" KB (URLs + titles); this injects file *content*.
export const KnowledgeConfigSchema = z.object({
  // Feature flag — off by default (no folder is configured out of the box).
  enabled: z.boolean().default(false),
  // Directory of Markdown files to watch. Optional; the feature is inert when
  // unset even if enabled. `~` and relative paths are resolved by the gateway.
  dir: z.string().optional(),
  // Total byte cap on knowledge-file content injected into one execution prompt,
  // so a large folder can't blow the model's context window.
  maxBytes: z.number().int().positive().default(16384),
});

// Notifications & alerting (Phase 21). The gateway watches state transitions,
// applies this notify-policy, and dispatches to the enabled channels. `events`
// toggles which transitions notify; `channels` which sinks fire (web is the
// always-on in-app feed; browser is an opt-in OS notification; webhook is an
// optional SSRF-guarded POST target — both dispatched in a later theme).
export const NotificationsConfigSchema = z.object({
  enabled: z.boolean().default(true),
  events: z
    .object({
      taskWaiting: z.boolean().default(true),
      taskDone: z.boolean().default(true),
      taskAbandoned: z.boolean().default(true),
    })
    .default({}),
  channels: z
    .object({
      web: z.boolean().default(true),
      browser: z.boolean().default(false),
      webhook: z.string().optional(),
    })
    .default({}),
});

// PR-status polling (Phase 22 Theme C). A single gateway-owned loop refreshes
// the GitHub state/CI/review of tasks whose PR isn't yet merged/closed — gh-first
// with an anonymous REST fallback for public repos, fail-open on any error.
export const PrStatusConfigSchema = z.object({
  // Poll open PRs for live state. Fail-open: a missing `gh` / private repo when
  // unauthenticated / network error leaves the last-known status untouched.
  enabled: z.boolean().default(true),
  // How often the single poller wakes to refresh unmerged PRs.
  pollIntervalMs: z.number().int().positive().default(60000),
  // Max PRs fetched concurrently per poll cycle (bounded for gh/REST rate limits).
  pollConcurrency: z.number().int().positive().default(4),
});

// Scheduled auto-backup (Phase 49 F). A single gateway-owned loop writes a
// timestamped full-store archive to `destinationDir` every `intervalHours`, then
// prunes to `retention`. OFF by default (behaviour-preserving); fail-open — a
// failed run logs + notifies, never crashes the tick. Secrets are excluded (the
// export is secret-free until the secrets slice), so no passphrase field yet.
export const BackupConfigSchema = z.object({
  enabled: z.boolean().default(false),
  // Hours between auto-backups (measured from the newest existing archive).
  intervalHours: z.number().positive().default(24),
  // Where archives are written. `~` and relative paths are resolved by the gateway.
  destinationDir: z.string().default('./.midnite/backups'),
  // How many archives to keep; older ones are pruned after each run. Must be ≥1.
  retention: z.number().int().positive().default(7),
  // How often the loop wakes to check whether a backup is due (coarse vs the
  // interval — a little slop is fine). Default 1h.
  tickMs: z.number().int().positive().default(3600000),
});

// Autonomy guardrails — the safety domain's config half (Phase 50). Pause/kill
// + spend/rate caps live in the DB (survive a restart); this is the policy that
// belongs in config: the always-on blast-radius floor + the spawn-env scrub.
export const BlastRadiusConfigSchema = z.object({
  // The built-in destructive-action deny floor (Phase 50 C). ENABLED by default:
  // it only bites in `guarded`/`autonomous` mode (an unattended agent) — `manual`
  // still escalates every tool to a human. A match is a hard `auto-deny` that
  // overrides the mode (mode can relax escalation, never a hard-denied action).
  enabled: z.boolean().default(true),
  // Branches an agent may not push to directly (matched in a `git push` command).
  protectedBranches: z.array(z.string()).default(['main', 'master']),
  // Globs for secret/credential files an agent may not read or write (matched
  // against file-tool paths + file references inside a Bash command).
  protectedPathGlobs: z
    .array(z.string())
    .default(['**/.env', '**/.env.*', '**/*.pem', '**/id_rsa*', '**/*.key', '**/credentials*']),
});

export const GuardrailsConfigSchema = z.object({
  blastRadius: BlastRadiusConfigSchema.default({}),
  // Strip the gateway's OWN secrets (MIDNITE_SECRET_KEY / auth token / JWT secret /
  // workflows key) from a spawned agent's env so a compromised agent can't read
  // them. OFF by default — preserves today's full-env spawn (Phase 50 C, opt-in).
  // The agent keeps its own provider auth (ANTHROPIC_API_KEY etc) and the MIDNITE_*
  // hook wiring, both re-injected after the scrub.
  scrubSpawnEnv: z.boolean().default(false),
});

// Phase 59 — chat-to-board (natural-language command bar). The deterministic
// grammar always runs for free; this only tunes the *fuzzy* (LLM) fallback's
// routing (Theme D). Optional (defaulted) so existing midnite.json files keep
// validating.
// Metrics history + retention (Phase 61). The gauge sampler (Theme D) persists a
// `gauge_samples` row every `sampleIntervalMs` so fleet trends survive a restart;
// `rawRetentionDays` bounds the raw metrics tables (the sampler self-prunes older
// gauge samples now — Theme E generalizes pruning/rollups). `0` disables either.
export const MetricsConfigSchema = z.object({
  // How often the gauge sampler persists a row (ms). Default 60s. `0` disables
  // sampling entirely (no timer, no rows) — behaviour-preserving opt-out.
  sampleIntervalMs: z.number().int().nonnegative().default(60000),
  // Days of raw metrics rows to keep; the sampler prunes gauge samples older than
  // this on each run. Default 30. `0` disables pruning (keep forever).
  rawRetentionDays: z.number().int().nonnegative().default(30),
  // How often the rollup job aggregates closed buckets + prunes rolled-up raw
  // rows (ms). Default 1h. `0` disables the rollup loop entirely (no aggregation,
  // no retention pruning) — behaviour-preserving opt-out.
  rollupIntervalMs: z.number().int().nonnegative().default(3600000),
});

export const ChatConfigSchema = z.object({
  // When a command can't be parsed deterministically, prefer a configured local
  // `openai-compatible` provider (Ollama/LM Studio/vLLM → zero API cost) over the
  // active paid provider. On by default so free-form chat never surprises with a
  // bill when a local model is available; the active provider is still the
  // fallback when no local one is configured.
  preferLocal: z.boolean().default(true),
});

// Memory Studio media generation (Phase 65 E). Audio (LLM script → TTS) and video
// (narrated slideshow → ffmpeg compose) are additive provider seams that DEGRADE
// gracefully: with no TTS credential the audio artifact ships the script only; with
// no usable ffmpeg the video ships the slide outline only. Everything is `auto` by
// default — a fresh install with no extra setup still generates text + infographic
// and *offers* audio/video with honest capability messaging (Decision §1).
export const MemoryStudioConfigSchema = z.object({
  tts: z
    .object({
      // `auto` synthesises when an OpenAI credential is resolvable (else degrades to
      // script-only); `openai` forces the OpenAI seam; `off` never synthesises.
      provider: z.enum(['auto', 'openai', 'off']).default('auto'),
      // OpenAI TTS model + the two host voices (alternated across the two-host script).
      model: z.string().default('gpt-4o-mini-tts'),
      voiceA: z.string().default('alloy'),
      voiceB: z.string().default('nova'),
    })
    .default({}),
  video: z
    .object({
      // `auto` composes with ffmpeg when a usable binary is found (else degrades to
      // slides-only); `off` never composes.
      mode: z.enum(['auto', 'off']).default('auto'),
      // Explicit ffmpeg path; when unset the gateway looks up `ffmpeg` on PATH.
      ffmpegPath: z.string().optional(),
    })
    .default({}),
});
export type MemoryStudioConfig = z.infer<typeof MemoryStudioConfigSchema>;

export const MemoryConfigSchema = z.object({
  studio: MemoryStudioConfigSchema.default({}),
});
export type MemoryConfig = z.infer<typeof MemoryConfigSchema>;

// Task retrospectives (Phase 62). The deterministic skeleton is built on every
// terminal transition and costs nothing; the LLM narrative is layered on by the
// retro workflow (one small plan-model call, bounded here and by the P50 spend
// caps, fail-soft to the skeleton). Everything defaults on so a fresh install
// still gets factual retros with zero extra setup.
export const RetroConfigSchema = z.object({
  // When true (default) the gateway auto-builds a deterministic retro skeleton on
  // each task's `done`/`abandoned` transition. Set false to disable auto-building
  // (retros can still be produced by an explicit workflow run).
  autoSkeleton: z.boolean().default(true),
  // Token cap for the retro narrative's single plan-model call (the workflow's
  // `generate-retro` node). Bounds one summary; the P50 budget caps still apply.
  narrativeMaxTokens: z.number().int().positive().default(700),
});
export type RetroConfig = z.infer<typeof RetroConfigSchema>;

export const MidniteConfigSchema = z.object({
  agent: AgentConfigSchema,
  terminal: TerminalConfigSchema,
  repos: z.array(RepoConfigSchema).default([]),
  gateway: GatewayConfigSchema,
  // Optional (defaulted) so existing midnite.json files keep validating.
  knowledge: KnowledgeConfigSchema.default({}),
  notifications: NotificationsConfigSchema.default({}),
  // Optional block (defaulted) so existing midnite.json files keep validating.
  workflows: WorkflowsConfigSchema.default({}),
  agents: AgentsRuntimeConfigSchema.default({}),
  councils: CouncilsConfigSchema.default({}),
  // LLM usage/cost tracking + optional soft budgets (track + soft-warn only).
  usage: UsageConfigSchema.default({}),
  // Quality-gate checks run before a task's `done` transition (Phase 30).
  // Optional (defaulted) so existing midnite.json files keep validating.
  checks: ChecksConfigSchema.default({}),
  // Live PR-status polling (Phase 22 Theme C). Optional (defaulted) so existing
  // midnite.json files keep validating.
  prStatus: PrStatusConfigSchema.default({}),
  // Autonomy guardrails: blast-radius deny floor + spawn-env scrub (Phase 50).
  // Optional (defaulted) so existing midnite.json files keep validating.
  guardrails: GuardrailsConfigSchema.default({}),
  // Scheduled auto-backup (Phase 49 F). Off by default. Optional (defaulted) so
  // existing midnite.json files keep validating.
  backup: BackupConfigSchema.default({}),
  // Realtime WS reliability (Phase 56). Optional (defaulted) so existing
  // midnite.json files keep validating.
  ws: WsConfigSchema.default({}),
  // Chat-to-board command bar (Phase 59). Optional (defaulted) so existing
  // midnite.json files keep validating.
  chat: ChatConfigSchema.default({}),
  // Metrics history + retention (Phase 61). Optional (defaulted) so existing
  // midnite.json files keep validating.
  metrics: MetricsConfigSchema.default({}),
  // Office multiplayer presence (Phase 64). Ephemeral, in-memory only. Optional
  // (defaulted) so existing midnite.json files keep validating.
  presence: PresenceConfigSchema.default({}),
  // Memory Studio media generation (Phase 65 E). Optional (defaulted) so existing
  // midnite.json files keep validating; degrades gracefully with no TTS/ffmpeg.
  memory: MemoryConfigSchema.default({}),
  // Task retrospectives (Phase 62). Optional (defaulted) so existing midnite.json
  // files keep validating; auto-skeleton on by default.
  retro: RetroConfigSchema.default({}),
});

export type MidniteConfig = z.infer<typeof MidniteConfigSchema>;
export type GuardrailsConfig = z.infer<typeof GuardrailsConfigSchema>;
export type BackupConfig = z.infer<typeof BackupConfigSchema>;
export type MetricsConfig = z.infer<typeof MetricsConfigSchema>;
export type BlastRadiusConfig = z.infer<typeof BlastRadiusConfigSchema>;
export type KnowledgeConfig = z.infer<typeof KnowledgeConfigSchema>;
export type NotificationsConfig = z.infer<typeof NotificationsConfigSchema>;
export type RepoConfig = z.infer<typeof RepoConfigSchema>;
export type GatewayConfig = z.infer<typeof GatewayConfigSchema>;
export type GatewayAuthConfig = z.infer<typeof GatewayAuthConfigSchema>;
export type WorkflowsConfig = z.infer<typeof WorkflowsConfigSchema>;
export type AgentsRuntimeConfig = z.infer<typeof AgentsRuntimeConfigSchema>;
export type CouncilsConfig = z.infer<typeof CouncilsConfigSchema>;
export type OAuthClientConfig = z.infer<typeof OAuthClientConfigSchema>;
export type PrStatusConfig = z.infer<typeof PrStatusConfigSchema>;
export type { UsageConfig } from './usage.js';

export function parseConfig(raw: unknown): MidniteConfig {
  return MidniteConfigSchema.parse(raw);
}

// The runtime loader (reads midnite.json from disk) lives in the node-only
// `@midnite/shared/config-loader` entry, kept out of this barrel so bundlers
// never pull `node:fs` into the browser build.
