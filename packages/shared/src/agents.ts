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
export const AGENT_CLIS = ['claude', 'gemini', 'codex', 'aider', 'opencode'] as const;
export const AgentCliSchema = z.enum(AGENT_CLIS);
export type AgentCli = z.infer<typeof AgentCliSchema>;
export const AGENT_CLI_DEFAULT: AgentCli = 'claude';

/** Human label for each CLI, for menus. */
export const AGENT_CLI_LABEL: Record<AgentCli, string> = {
  claude: 'Claude',
  gemini: 'Gemini',
  codex: 'Codex',
  aider: 'Aider',
  opencode: 'OpenCode',
};

/** The shell command typed into a fresh session shell to launch each CLI. */
export const AGENT_CLI_COMMAND: Record<AgentCli, string> = {
  claude: 'claude',
  gemini: 'gemini',
  codex: 'codex',
  aider: 'aider',
  opencode: 'opencode',
};

/**
 * The install command pasted into the install terminal — npm global where the CLI
 * ships on npm, else the vendor's recommended installer (pip for Aider). The user
 * reviews it and presses Enter to run.
 */
export const AGENT_CLI_INSTALL_COMMAND: Record<AgentCli, string> = {
  claude: 'npm install -g @anthropic-ai/claude-code',
  gemini: 'npm install -g @google/gemini-cli',
  codex: 'npm install -g @openai/codex',
  aider: 'python -m pip install aider-install && aider-install',
  opencode: 'npm install -g opencode-ai',
};

/**
 * The uninstall command, paired with the install method above. The uninstall
 * terminal first runs `which <cli>` to surface where the binary lives, then this.
 * The user reviews it and presses Enter.
 */
export const AGENT_CLI_UNINSTALL_COMMAND: Record<AgentCli, string> = {
  claude: 'npm uninstall -g @anthropic-ai/claude-code',
  gemini: 'npm uninstall -g @google/gemini-cli',
  codex: 'npm uninstall -g @openai/codex',
  aider: 'python -m pip uninstall -y aider-chat aider-install',
  opencode: 'npm uninstall -g opencode-ai',
};

/** Installed-state of a CLI, as detected by probing for its binary on PATH. */
export const AgentCliStatusSchema = z.object({
  cli: AgentCliSchema,
  installed: z.boolean(),
  version: z.string().optional(),
});
export type AgentCliStatus = z.infer<typeof AgentCliStatusSchema>;

/** Which command a standalone CLI terminal pastes — install or uninstall. */
export const CLI_TERMINAL_ACTIONS = ['install', 'uninstall'] as const;
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
export type InstallTerminalResponse = z.infer<typeof InstallTerminalResponseSchema>;
export type AgentsConfigResponse = z.infer<typeof AgentsConfigResponseSchema>;
export type PrimaryAgentResponse = z.infer<typeof PrimaryAgentResponseSchema>;
export type SubAgentResponse = z.infer<typeof SubAgentResponseSchema>;
export type HeartbeatRunsResponse = z.infer<typeof HeartbeatRunsResponseSchema>;
export type HeartbeatRunResponse = z.infer<typeof HeartbeatRunResponseSchema>;
