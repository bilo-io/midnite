import { z } from 'zod';

// Heartbeat cadence bounds, in hours: once an hour at the most frequent, roughly
// once a month at the least. The cadence is user data (stored per primary agent);
// the scheduler's tick interval is separate config.
export const HEARTBEAT_MIN_H = 1;
export const HEARTBEAT_DEFAULT_H = 4;
export const HEARTBEAT_MAX_H = 720; // ~30 days

export const HEARTBEAT_RUN_STATUSES = ['running', 'succeeded', 'failed', 'skipped'] as const;
export const HeartbeatRunStatusSchema = z.enum(HEARTBEAT_RUN_STATUSES);

export const HEARTBEAT_TRIGGER_SOURCES = ['schedule', 'manual'] as const;
export const HeartbeatTriggerSourceSchema = z.enum(HEARTBEAT_TRIGGER_SOURCES);

const HeartbeatIntervalSchema = z.number().int().min(HEARTBEAT_MIN_H).max(HEARTBEAT_MAX_H);

// The CLI binary midnite launches inside a session terminal. A global preference
// (not per-agent): which coding agent the user drives sessions with.
export const AGENT_CLIS = ['claude', 'gemini', 'codex', 'opencode', 'aider'] as const;
export const AgentCliSchema = z.enum(AGENT_CLIS);
export type AgentCli = z.infer<typeof AgentCliSchema>;
export const AGENT_CLI_DEFAULT: AgentCli = 'claude';

/**
 * One installable CLI utility the app knows how to set up and launch. This catalog
 * array is the **single source of truth** for the per-CLI metadata — the lookup maps
 * below (`AGENT_CLI_LABEL`, `AGENT_CLI_COMMAND`, `AGENT_CLI_INSTALL_COMMAND`, …) are
 * all derived from it, so a new CLI is added in exactly one place.
 */
export type AgentCliCatalogEntry = {
  /** Stable machine key — the `AgentCli` enum value, also used in URLs + config. */
  key: AgentCli;
  /** Human label for menus. */
  name: string;
  /** Homepage / install docs, linked from the agent settings UI. */
  homepageUrl: string;
  /** The shell command typed into a fresh session shell to launch the CLI. */
  command: string;
  /**
   * The preferred install command pasted into the install terminal — the user
   * reviews it and presses Enter to run. **Homebrew by default**; a vendor-specific
   * installer only where the vendor recommends one over brew:
   *  - `claude`  → Anthropic's native install script (auto-updates, no Node dep;
   *                the Homebrew cask lags releases and disables built-in updates).
   *  - `aider`   → `aider-install`, which isolates Aider in its own Python env
   *                (the Homebrew formula lags upstream and can miss its model deps).
   */
  setupCommand: string;
  /** The uninstall command, paired with `setupCommand` (same tool that installed it). */
  uninstallCommand: string;
};

export const AGENT_CLI_CATALOG: readonly AgentCliCatalogEntry[] = [
  {
    key: 'claude',
    name: 'Claude',
    homepageUrl: 'https://docs.anthropic.com/en/docs/claude-code/overview',
    command: 'claude',
    setupCommand: 'curl -fsSL https://claude.ai/install.sh | bash',
    uninstallCommand: 'rm -f ~/.local/bin/claude && rm -rf ~/.local/share/claude',
  },
  {
    key: 'gemini',
    name: 'Gemini',
    homepageUrl: 'https://github.com/google-gemini/gemini-cli',
    command: 'gemini',
    setupCommand: 'brew install gemini-cli',
    uninstallCommand: 'brew uninstall gemini-cli',
  },
  {
    key: 'codex',
    name: 'Codex',
    homepageUrl: 'https://github.com/openai/codex',
    command: 'codex',
    setupCommand: 'brew install --cask codex',
    uninstallCommand: 'brew uninstall --cask codex',
  },
  {
    key: 'opencode',
    name: 'OpenCode',
    homepageUrl: 'https://opencode.ai',
    command: 'opencode',
    setupCommand: 'brew install sst/tap/opencode',
    uninstallCommand: 'brew uninstall sst/tap/opencode',
  },
  {
    key: 'aider',
    name: 'Aider',
    homepageUrl: 'https://aider.chat',
    command: 'aider',
    setupCommand: 'python -m pip install aider-install && aider-install',
    uninstallCommand: 'python -m pip uninstall -y aider-chat aider-install',
  },
];

/** The catalog keyed by `AgentCli` for O(1) lookup. */
export const AGENT_CLI_BY_KEY: Record<AgentCli, AgentCliCatalogEntry> = Object.fromEntries(
  AGENT_CLI_CATALOG.map((entry) => [entry.key, entry]),
) as Record<AgentCli, AgentCliCatalogEntry>;

/** Build a `Record<AgentCli, string>` from one field of the catalog. */
const catalogField = (field: keyof Omit<AgentCliCatalogEntry, 'key'>): Record<AgentCli, string> =>
  Object.fromEntries(AGENT_CLI_CATALOG.map((entry) => [entry.key, entry[field]])) as Record<
    AgentCli,
    string
  >;

/** Human label for each CLI, for menus. Derived from {@link AGENT_CLI_CATALOG}. */
export const AGENT_CLI_LABEL: Record<AgentCli, string> = catalogField('name');

/** Homepage / install docs for each CLI. Derived from {@link AGENT_CLI_CATALOG}. */
export const AGENT_CLI_HOMEPAGE_URL: Record<AgentCli, string> = catalogField('homepageUrl');

/** The shell command that launches each CLI. Derived from {@link AGENT_CLI_CATALOG}. */
export const AGENT_CLI_COMMAND: Record<AgentCli, string> = catalogField('command');

/** The preferred install command per CLI. Derived from {@link AGENT_CLI_CATALOG}. */
export const AGENT_CLI_INSTALL_COMMAND: Record<AgentCli, string> = catalogField('setupCommand');

/** The uninstall command per CLI. Derived from {@link AGENT_CLI_CATALOG}. */
export const AGENT_CLI_UNINSTALL_COMMAND: Record<AgentCli, string> =
  catalogField('uninstallCommand');

/** Installed-state of a CLI, as detected by probing for its binary on PATH. */
export const AgentCliStatusSchema = z.object({
  cli: AgentCliSchema,
  installed: z.boolean(),
  version: z.string().optional(),
});
export type AgentCliStatus = z.infer<typeof AgentCliStatusSchema>;

/** What a standalone CLI terminal does — install/uninstall the CLI, or launch a
 *  live agent session by running the CLI itself. */
export const CLI_TERMINAL_ACTIONS = ['install', 'uninstall', 'launch'] as const;
export const CliTerminalActionSchema = z.enum(CLI_TERMINAL_ACTIONS);
export type CliTerminalAction = z.infer<typeof CliTerminalActionSchema>;

/** The single orchestrator. Its description is the system prompt; the heartbeat
 *  prompt runs on `heartbeatIntervalH` when `heartbeatEnabled`. */
export const PrimaryAgentSchema = z.object({
  name: z.string(),
  description: z.string(),
  heartbeatEnabled: z.boolean(),
  heartbeatPrompt: z.string(),
  heartbeatIntervalH: HeartbeatIntervalSchema,
  /**
   * Fallback working directory (`~`-form) for session terminals when a task has
   * no project directory of its own. Absent → the gateway's own cwd is used.
   */
  defaultWorkDir: z.string().optional(),
  /** ISO timestamp of the last heartbeat fire; absent until the first run. */
  lastHeartbeatAt: z.string().optional(),
  updatedAt: z.string(),
});

/** A delegated worker the orchestrator can call on. */
export const SubAgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  description: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const AgentsConfigSchema = z.object({
  /** Global CLI preference launched in session terminals. */
  cli: AgentCliSchema.default(AGENT_CLI_DEFAULT),
  primary: PrimaryAgentSchema,
  subAgents: z.array(SubAgentSchema),
});

export const HeartbeatRunSchema = z.object({
  id: z.string(),
  status: HeartbeatRunStatusSchema,
  triggerSource: HeartbeatTriggerSourceSchema,
  model: z.string().optional(),
  systemPrompt: z.string().optional(),
  prompt: z.string().optional(),
  output: z.string().optional(),
  error: z.string().optional(),
  startedAt: z.string(),
  finishedAt: z.string().optional(),
});

// --- Requests ---

// All fields optional: PUT /agents/primary is a partial patch on the singleton.
export const UpdatePrimaryAgentRequestSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(50000).optional(),
  heartbeatEnabled: z.boolean().optional(),
  heartbeatPrompt: z.string().max(50000).optional(),
  heartbeatIntervalH: HeartbeatIntervalSchema.optional(),
  /** Fallback session cwd (`~`-form); '' clears it back to the gateway cwd. */
  defaultWorkDir: z.string().trim().max(1024).optional(),
});

// Set the global CLI preference. PUT /agents/cli.
export const UpdateAgentCliRequestSchema = z.object({ cli: AgentCliSchema });

// All fields optional so a blank subagent can be created and filled in later;
// the service coalesces missing fields to empty strings.
export const CreateSubAgentRequestSchema = z.object({
  name: z.string().trim().max(120).optional(),
  role: z.string().trim().max(200).optional(),
  description: z.string().max(50000).optional(),
});

export const UpdateSubAgentRequestSchema = z.object({
  name: z.string().trim().max(120).optional(),
  role: z.string().trim().max(200).optional(),
  description: z.string().max(50000).optional(),
});

// --- Response envelopes (mirror ProjectResponse) ---

export const AgentsConfigResponseSchema = z.object({ config: AgentsConfigSchema });
export const AgentCliResponseSchema = z.object({ cli: AgentCliSchema });
export const AgentCliStatusResponseSchema = z.object({ status: AgentCliStatusSchema });
// All CLI statuses in one shot, so the settings page can render every agent row
// from a single fetch instead of probing each CLI separately.
export const AgentCliStatusListResponseSchema = z.object({
  statuses: z.array(AgentCliStatusSchema),
});
// The ad-hoc terminal id minted for an install session; the client attaches to it
// with the existing terminal token + WS flow.
export const InstallTerminalResponseSchema = z.object({ terminalId: z.string() });
export const PrimaryAgentResponseSchema = z.object({ primary: PrimaryAgentSchema });
export const SubAgentResponseSchema = z.object({ subAgent: SubAgentSchema });
export const HeartbeatRunsResponseSchema = z.object({ runs: z.array(HeartbeatRunSchema) });
export const HeartbeatRunResponseSchema = z.object({ run: HeartbeatRunSchema });

export type PrimaryAgent = z.infer<typeof PrimaryAgentSchema>;
export type SubAgent = z.infer<typeof SubAgentSchema>;
export type AgentsConfig = z.infer<typeof AgentsConfigSchema>;
export type HeartbeatRun = z.infer<typeof HeartbeatRunSchema>;
export type HeartbeatRunStatus = z.infer<typeof HeartbeatRunStatusSchema>;
export type HeartbeatTriggerSource = z.infer<typeof HeartbeatTriggerSourceSchema>;
export type UpdatePrimaryAgentRequest = z.infer<typeof UpdatePrimaryAgentRequestSchema>;
export type UpdateAgentCliRequest = z.infer<typeof UpdateAgentCliRequestSchema>;
export type AgentCliResponse = z.infer<typeof AgentCliResponseSchema>;
export type CreateSubAgentRequest = z.infer<typeof CreateSubAgentRequestSchema>;
export type UpdateSubAgentRequest = z.infer<typeof UpdateSubAgentRequestSchema>;
export type AgentCliStatusResponse = z.infer<typeof AgentCliStatusResponseSchema>;
export type AgentCliStatusListResponse = z.infer<typeof AgentCliStatusListResponseSchema>;
export type InstallTerminalResponse = z.infer<typeof InstallTerminalResponseSchema>;
export type AgentsConfigResponse = z.infer<typeof AgentsConfigResponseSchema>;
export type PrimaryAgentResponse = z.infer<typeof PrimaryAgentResponseSchema>;
export type SubAgentResponse = z.infer<typeof SubAgentResponseSchema>;
export type HeartbeatRunsResponse = z.infer<typeof HeartbeatRunsResponseSchema>;
export type HeartbeatRunResponse = z.infer<typeof HeartbeatRunResponseSchema>;
