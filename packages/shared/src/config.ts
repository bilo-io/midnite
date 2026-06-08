import { z } from 'zod';

export const RepoConfigSchema = z.object({
  name: z.string(),
  path: z.string(),
});

export const AgentConfigSchema = z.object({
  pool: z.number().int().positive().default(4),
  provider: z.enum(['claude']).default('claude'),
  plan: z.string().default('opus4.8'),
  act: z.string().default('haiku4.5'),
});

export const TerminalConfigSchema = z.object({
  mode: z.enum(['pty', 'tmux', 'warp', 'iterm']).default('pty'),
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
});

export const KnowledgeConfigSchema = z.object({
  dir: z.string().default('./knowledge'),
});

export const GatewayConfigSchema = z.object({
  port: z.number().int().positive().default(7777),
  /** Bind address. Loopback by default — the gateway spawns PTYs, so don't expose it to the network unless you mean to. */
  host: z.string().default('127.0.0.1'),
  /** Extra browser origins allowed to call the API / open the terminal WS. Loopback origins are always allowed. */
  allowedOrigins: z.array(z.string()).default([]),
  uploadsDir: z.string().default('./.midnite/uploads'),
  dbPath: z.string().default('./.midnite/midnite.db'),
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
  // Name of the env var holding the symmetric key for the credential vault (future phase).
  encryptionKeyEnv: z.string().default('MIDNITE_WORKFLOWS_KEY'),
  oauth: z
    .object({
      slack: OAuthClientConfigSchema.optional(),
      google: OAuthClientConfigSchema.optional(),
    })
    .default({}),
});

export const MidniteConfigSchema = z.object({
  agent: AgentConfigSchema,
  terminal: TerminalConfigSchema,
  knowledge: KnowledgeConfigSchema,
  repos: z.array(RepoConfigSchema).default([]),
  gateway: GatewayConfigSchema,
  // Optional block (defaulted) so existing midnite.json files keep validating.
  workflows: WorkflowsConfigSchema.default({}),
});

export type MidniteConfig = z.infer<typeof MidniteConfigSchema>;
export type RepoConfig = z.infer<typeof RepoConfigSchema>;
export type WorkflowsConfig = z.infer<typeof WorkflowsConfigSchema>;
export type OAuthClientConfig = z.infer<typeof OAuthClientConfigSchema>;

export function parseConfig(raw: unknown): MidniteConfig {
  return MidniteConfigSchema.parse(raw);
}

export async function loadConfig(_path: string): Promise<MidniteConfig> {
  throw new Error('loadConfig() not implemented yet — see packages/gateway for the runtime loader');
}
