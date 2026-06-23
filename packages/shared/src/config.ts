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
  // Max concurrent agents running on the same repo (keyed by `task.repo`).
  // 0 = unlimited. Guards against N agents racing on one working tree: the
  // scheduler skips a task whose repo is already at this cap and picks the next
  // eligible one instead. Repo-less tasks are never capped.
  maxPerRepo: z.number().int().nonnegative().default(0),
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

export const GatewayConfigSchema = z.object({
  port: z.number().int().positive().default(7777),
  /** Bind address. Loopback by default — the gateway spawns PTYs, so don't expose it to the network unless you mean to. */
  host: z.string().default('127.0.0.1'),
  /** Extra browser origins allowed to call the API / open the terminal WS. Loopback origins are always allowed. */
  allowedOrigins: z.array(z.string()).default([]),
  uploadsDir: z.string().default('./.midnite/uploads'),
  dbPath: z.string().default('./.midnite/midnite.db'),
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
});

export type MidniteConfig = z.infer<typeof MidniteConfigSchema>;
export type KnowledgeConfig = z.infer<typeof KnowledgeConfigSchema>;
export type NotificationsConfig = z.infer<typeof NotificationsConfigSchema>;
export type RepoConfig = z.infer<typeof RepoConfigSchema>;
export type WorkflowsConfig = z.infer<typeof WorkflowsConfigSchema>;
export type AgentsRuntimeConfig = z.infer<typeof AgentsRuntimeConfigSchema>;
export type CouncilsConfig = z.infer<typeof CouncilsConfigSchema>;
export type OAuthClientConfig = z.infer<typeof OAuthClientConfigSchema>;
export type { UsageConfig } from './usage.js';

export function parseConfig(raw: unknown): MidniteConfig {
  return MidniteConfigSchema.parse(raw);
}

// The runtime loader (reads midnite.json from disk) lives in the node-only
// `@midnite/shared/config-loader` entry, kept out of this barrel so bundlers
// never pull `node:fs` into the browser build.
