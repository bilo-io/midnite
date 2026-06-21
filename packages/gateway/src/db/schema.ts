import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

// NOTE: status/kind validity is enforced at the app layer via zod
// (see @midnite/shared StatusSchema / TaskKindSchema).

export const tasks = sqliteTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    kind: text('kind').notNull().default('unknown'),
    status: text('status').notNull().default('todo'),
    // Scheduling priority 0..3 (higher runs first); enforced at the app layer.
    priority: integer('priority').notNull().default(1),
    // Auto-retries consumed after unexpected agent-session exits (crashes).
    retryCount: integer('retry_count').notNull().default(0),
    prompt: text('prompt'),
    repo: text('repo'),
    agentId: text('agent_id'),
    sessionId: text('session_id'),
    projectId: text('project_id'),
    prUrl: text('pr_url'),
    // User labels as a JSON array of strings (null/absent = none). App-layer
    // validated; no join table — tags are a small free-form set per task.
    tags: text('tags'),
    archivedAt: text('archived_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    statusIdx: index('tasks_status_idx').on(t.status),
    projectIdx: index('tasks_project_idx').on(t.projectId),
    archivedIdx: index('tasks_archived_idx').on(t.archivedAt),
    // Backs the scheduler's "highest-priority, oldest-first" todo selection.
    statusPriorityIdx: index('tasks_status_priority_idx').on(t.status, t.priority),
  }),
);

export const taskEvents = sqliteTable(
  'task_events',
  {
    id: text('id').primaryKey(),
    taskId: text('task_id').notNull(),
    at: text('at').notNull(),
    kind: text('kind').notNull(),
    data: text('data'),
  },
  (t) => ({
    taskAtIdx: index('task_events_task_at_idx').on(t.taskId, t.at),
  }),
);

export const taskAttachments = sqliteTable(
  'task_attachments',
  {
    id: text('id').primaryKey(),
    taskId: text('task_id').notNull(),
    path: text('path').notNull(),
    mime: text('mime').notNull(),
    size: integer('size').notNull(),
    originalName: text('original_name'),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    taskIdx: index('task_attachments_task_idx').on(t.taskId),
  }),
);

export const taskLinks = sqliteTable(
  'task_links',
  {
    id: text('id').primaryKey(),
    taskId: text('task_id').notNull(),
    url: text('url').notNull(),
    kind: text('kind').notNull(),
    label: text('label'),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    taskIdx: index('task_links_task_idx').on(t.taskId),
  }),
);

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  tag: text('tag').notNull(),
  color: text('color').notNull(),
  // Folder (in `~`-form) that this project's Claude Code sessions spawn in.
  workDir: text('work_dir'),
  plan: text('plan'),
  planUpdatedAt: text('plan_updated_at'),
  // Soft-archive timestamp; null = active. Mirrors tasks.archivedAt.
  archivedAt: text('archived_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Repo registry: named checkouts the orchestrator runs agents against. The DB
// is the runtime source of truth; `config.repos` seeds it on first boot. A task
// references a repo by its unique `name` (no cross-domain FK). Paths stored in
// `~`-form. Deferred columns (branchPrefix/prTemplate/cap) land in a later
// forward migration when Phase 13 Themes D/E need them.
export const repos = sqliteTable(
  'repos',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    path: text('path').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    nameIdx: uniqueIndex('repos_name_idx').on(t.name),
  }),
);

export const projectSources = sqliteTable(
  'project_sources',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull(),
    url: text('url').notNull(),
    kind: text('kind').notNull(),
    title: text('title'),
    faviconUrl: text('favicon_url'),
    fetchedAt: text('fetched_at'),
    createdAt: text('created_at').notNull(),
    // Ascending display order within the project; drives the list/drag order.
    position: integer('position').notNull().default(0),
  },
  (t) => ({
    projectIdx: index('project_sources_project_idx').on(t.projectId),
  }),
);

// Memories: markdown knowledge entries injected into agent prompts. project_id
// null = global (applies to every project); otherwise scoped to that project.
export const memories = sqliteTable(
  'memories',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    content: text('content').notNull().default(''),
    projectId: text('project_id'),
    // Soft-archive timestamp; null = active. Mirrors tasks.archivedAt.
    archivedAt: text('archived_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    projectIdx: index('memories_project_idx').on(t.projectId),
  }),
);

// Reference links attached to a memory. Mirrors project_sources, scoped to a
// memory instead of a project.
export const memorySources = sqliteTable(
  'memory_sources',
  {
    id: text('id').primaryKey(),
    memoryId: text('memory_id').notNull(),
    url: text('url').notNull(),
    kind: text('kind').notNull(),
    title: text('title'),
    faviconUrl: text('favicon_url'),
    fetchedAt: text('fetched_at'),
    createdAt: text('created_at').notNull(),
    // Ascending display order within the memory; drives the list/drag order.
    position: integer('position').notNull().default(0),
  },
  (t) => ({
    memoryIdx: index('memory_sources_memory_idx').on(t.memoryId),
  }),
);

// --- Workflows (node-based automation builder) ---

export const workflows = sqliteTable(
  'workflows',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    enabled: integer('enabled').notNull().default(0),
    triggerType: text('trigger_type').notNull().default('manual'),
    // JSON: the Trigger discriminated union (cron/timezone, webhook method, etc.)
    trigger: text('trigger').notNull(),
    // JSON: { nodes: WorkflowNode[], edges: WorkflowEdge[] }
    graph: text('graph').notNull(),
    // SHA-256 hash of the webhook secret token (plaintext is shown to the user once).
    webhookSecretHash: text('webhook_secret_hash'),
    // ISO timestamp of the last schedule-triggered fire, for restart-durable cron firing.
    lastFiredAt: text('last_fired_at'),
    // Soft-archive timestamp; null = active. Mirrors tasks.archivedAt.
    archivedAt: text('archived_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    enabledIdx: index('workflows_enabled_idx').on(t.enabled),
    triggerTypeIdx: index('workflows_trigger_type_idx').on(t.triggerType),
  }),
);

export const workflowRuns = sqliteTable(
  'workflow_runs',
  {
    id: text('id').primaryKey(),
    workflowId: text('workflow_id').notNull(),
    status: text('status').notNull(),
    triggerSource: text('trigger_source').notNull(),
    input: text('input'), // JSON
    error: text('error'),
    startedAt: text('started_at').notNull(),
    finishedAt: text('finished_at'),
  },
  (t) => ({
    workflowIdx: index('workflow_runs_workflow_idx').on(t.workflowId, t.startedAt),
  }),
);

export const nodeRuns = sqliteTable(
  'node_runs',
  {
    id: text('id').primaryKey(),
    runId: text('run_id').notNull(),
    nodeId: text('node_id').notNull(),
    nodeType: text('node_type').notNull(),
    status: text('status').notNull(),
    input: text('input'), // JSON
    resolvedParams: text('resolved_params'), // JSON — params after {{expr}} resolution
    output: text('output'), // JSON
    error: text('error'),
    logs: text('logs'), // JSON array
    startedAt: text('started_at'),
    finishedAt: text('finished_at'),
  },
  (t) => ({
    runIdx: index('node_runs_run_idx').on(t.runId),
  }),
);

// Persisted key-value store for workflow runs (storage.set / storage.get nodes,
// Phase 12 Theme C). Scoped per workflow: one row per (workflow_id, key), value is
// JSON text. `scope` is reserved for a future global/project tier (Decision §4) —
// null = workflow-scoped; the unique index keys on (workflow_id, key) for now.
export const workflowStorage = sqliteTable(
  'workflow_storage',
  {
    id: text('id').primaryKey(),
    workflowId: text('workflow_id').notNull(),
    scope: text('scope'),
    key: text('key').notNull(),
    value: text('value').notNull(), // JSON
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    workflowKeyIdx: uniqueIndex('workflow_storage_workflow_key_idx').on(t.workflowId, t.key),
  }),
);

// --- Agents (single primary orchestrator + subagents + heartbeat audit) ---

// Singleton: exactly one row, id = 'primary'. Heartbeat scheduling bookkeeping
// (lastHeartbeatAt) lives here, analogous to workflows.lastFiredAt. Booleans are
// stored as integer 0/1, matching workflows.enabled.
export const primaryAgent = sqliteTable('primary_agent', {
  id: text('id').primaryKey(), // always 'primary'
  name: text('name').notNull(),
  // Global CLI preference (claude | gemini | codex) launched in session terminals;
  // stored on the singleton row though surfaced as a top-level AgentsConfig.cli field.
  agentCli: text('agent_cli').notNull().default('claude'),
  description: text('description').notNull().default(''), // markdown system prompt
  heartbeatEnabled: integer('heartbeat_enabled').notNull().default(0),
  heartbeatPrompt: text('heartbeat_prompt').notNull().default(''), // markdown
  heartbeatIntervalH: integer('heartbeat_interval_h').notNull().default(4), // 1..720
  // Fallback cwd (~-form) for session terminals when a task has no project dir.
  defaultWorkDir: text('default_work_dir'),
  lastHeartbeatAt: text('last_heartbeat_at'), // ISO; null until first run
  lastHeartbeatRunId: text('last_heartbeat_run_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const subagents = sqliteTable('subagents', {
  id: text('id').primaryKey(),
  name: text('name').notNull().default(''),
  role: text('role').notNull().default(''),
  description: text('description').notNull().default(''), // markdown
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const heartbeatRuns = sqliteTable(
  'heartbeat_runs',
  {
    id: text('id').primaryKey(),
    status: text('status').notNull(), // running | succeeded | failed | skipped
    triggerSource: text('trigger_source').notNull(), // schedule | manual
    model: text('model'),
    systemPrompt: text('system_prompt'), // snapshot of primary.description at run time
    prompt: text('prompt'), // snapshot of heartbeatPrompt at run time
    output: text('output'), // assistant text; null on failure/skip
    error: text('error'),
    startedAt: text('started_at').notNull(),
    finishedAt: text('finished_at'),
  },
  (t) => ({
    startedIdx: index('heartbeat_runs_started_idx').on(t.startedAt),
  }),
);

// --- LLM providers (API credentials + model config for the gateway's own AI) ---

// One row per provider (LlmProvider enum, validated at the app layer). The
// api_key is stored plaintext: the gateway must read it back to build clients,
// so it can't be hashed. It is NEVER returned raw over the API — the controller
// maps to a masked ProviderCredential (hasKey + last-4 hint).
export const llmProviders = sqliteTable('llm_providers', {
  provider: text('provider').primaryKey(),
  apiKey: text('api_key'),
  baseUrl: text('base_url'),
  planModel: text('plan_model'),
  actModel: text('act_model'),
  updatedAt: text('updated_at').notNull(),
});

// Singleton (id = 'settings'): which provider powers the gateway's AI features.
// Independent of the agent CLI preference (primary_agent.agent_cli).
export const llmSettings = sqliteTable('llm_settings', {
  id: text('id').primaryKey(),
  activeProvider: text('active_provider').notNull().default('anthropic'),
  updatedAt: text('updated_at').notNull(),
});

// One row per LLM call the gateway makes through LlmService. `feature` is a
// validated LlmFeature string (app layer), `estCostUsd` a best-effort estimate
// from the static price table. Append-only; aggregated by the usage summary.
export const llmUsage = sqliteTable(
  'llm_usage',
  {
    id: text('id').primaryKey(),
    at: text('at').notNull(), // ISO timestamp of the call
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    feature: text('feature').notNull().default('unknown'),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    estCostUsd: real('est_cost_usd').notNull().default(0),
    correlationId: text('correlation_id'), // optional run/task id for drill-down
  },
  (t) => ({
    atIdx: index('llm_usage_at_idx').on(t.at),
    featureIdx: index('llm_usage_feature_idx').on(t.feature),
  }),
);

// --- Councils (multi-agent panels → switchable-format synthesis) ---

export const councils = sqliteTable('councils', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  // AgentCli that distils the pooled responses into the synthesis.
  synthProvider: text('synth_provider').notNull().default('gemini'),
  // Synthesis format pre-selected for new runs (each run can override).
  defaultFormat: text('default_format').notNull().default('brainstorm'),
  // Reusable synthesis prompt used when a run's format is 'custom'.
  customPrompt: text('custom_prompt'),
  // Soft-archive timestamp; null = active. Mirrors tasks.archivedAt.
  archivedAt: text('archived_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const councilMembers = sqliteTable(
  'council_members',
  {
    id: text('id').primaryKey(),
    councilId: text('council_id').notNull(),
    name: text('name').notNull().default(''),
    provider: text('provider').notNull().default('claude'), // AgentCli
    role: text('role').notNull().default(''),
    // Ascending display/run order within the council; drives the tab order.
    position: integer('position').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    councilIdx: index('council_members_council_idx').on(t.councilId),
  }),
);

export const councilRuns = sqliteTable(
  'council_runs',
  {
    id: text('id').primaryKey(),
    councilId: text('council_id').notNull(),
    prompt: text('prompt').notNull(),
    // The synthesis format this run was (last) synthesized in.
    format: text('format').notNull().default('brainstorm'),
    status: text('status').notNull(), // running | synthesizing | completed | failed
    // Snapshot of the council's synthesizer at (last) synthesis (null on old rows).
    synthProvider: text('synth_provider'),
    synthesis: text('synthesis'), // markdown for the active `format` (also the latest entry below)
    // JSON CouncilSynthesisEntry[] — one completed synthesis per format, so
    // re-synthesizing in a new format accumulates rather than overwriting. Each
    // entry carries its own `anonymized` flag and (when anonymized) labelMap.
    syntheses: text('syntheses'),
    error: text('error'),
    startedAt: text('started_at').notNull(),
    finishedAt: text('finished_at'),
  },
  (t) => ({
    councilIdx: index('council_runs_council_idx').on(t.councilId, t.startedAt),
  }),
);

// Snapshot of each member at run start, so later edits to the council never
// rewrite history. `output` is the cleaned (ANSI-stripped) capture. Members are
// never labeled here — anonymization (labels A/B/C) is applied per-synthesis and
// recorded on the synthesis entry, so a run can be re-synthesized attributed or
// anonymized over the same captured responses.
export const councilRunMembers = sqliteTable(
  'council_run_members',
  {
    id: text('id').primaryKey(),
    runId: text('run_id').notNull(),
    memberId: text('member_id').notNull(),
    name: text('name').notNull(),
    provider: text('provider').notNull(),
    role: text('role').notNull(),
    status: text('status').notNull(), // running | succeeded | failed | timeout | skipped
    terminalId: text('terminal_id').notNull(),
    output: text('output'),
    exitCode: integer('exit_code'),
    error: text('error'),
    startedAt: text('started_at').notNull(),
    finishedAt: text('finished_at'),
  },
  (t) => ({
    runIdx: index('council_run_members_run_idx').on(t.runId),
  }),
);

export type TaskRow = typeof tasks.$inferSelect;
export type TaskInsert = typeof tasks.$inferInsert;
export type WorkflowRow = typeof workflows.$inferSelect;
export type WorkflowInsert = typeof workflows.$inferInsert;
export type WorkflowRunRow = typeof workflowRuns.$inferSelect;
export type WorkflowRunInsert = typeof workflowRuns.$inferInsert;
export type NodeRunRow = typeof nodeRuns.$inferSelect;
export type NodeRunInsert = typeof nodeRuns.$inferInsert;
export type WorkflowStorageRow = typeof workflowStorage.$inferSelect;
export type WorkflowStorageInsert = typeof workflowStorage.$inferInsert;
export type TaskEventRow = typeof taskEvents.$inferSelect;
export type TaskEventInsert = typeof taskEvents.$inferInsert;
export type TaskAttachmentRow = typeof taskAttachments.$inferSelect;
export type TaskAttachmentInsert = typeof taskAttachments.$inferInsert;
export type TaskLinkRow = typeof taskLinks.$inferSelect;
export type TaskLinkInsert = typeof taskLinks.$inferInsert;
export type ProjectRow = typeof projects.$inferSelect;
export type ProjectInsert = typeof projects.$inferInsert;
export type RepoRow = typeof repos.$inferSelect;
export type RepoInsert = typeof repos.$inferInsert;
export type ProjectSourceRow = typeof projectSources.$inferSelect;
export type ProjectSourceInsert = typeof projectSources.$inferInsert;
export type MemoryRow = typeof memories.$inferSelect;
export type MemoryInsert = typeof memories.$inferInsert;
export type MemorySourceRow = typeof memorySources.$inferSelect;
export type MemorySourceInsert = typeof memorySources.$inferInsert;
export type PrimaryAgentRow = typeof primaryAgent.$inferSelect;
export type PrimaryAgentInsert = typeof primaryAgent.$inferInsert;
export type SubagentRow = typeof subagents.$inferSelect;
export type SubagentInsert = typeof subagents.$inferInsert;
export type HeartbeatRunRow = typeof heartbeatRuns.$inferSelect;
export type HeartbeatRunInsert = typeof heartbeatRuns.$inferInsert;
export type LlmProviderRow = typeof llmProviders.$inferSelect;
export type LlmProviderInsert = typeof llmProviders.$inferInsert;
export type LlmSettingsRow = typeof llmSettings.$inferSelect;
export type LlmSettingsInsert = typeof llmSettings.$inferInsert;
export type CouncilRow = typeof councils.$inferSelect;
export type CouncilInsert = typeof councils.$inferInsert;
export type CouncilMemberRow = typeof councilMembers.$inferSelect;
export type CouncilMemberInsert = typeof councilMembers.$inferInsert;
export type CouncilRunRow = typeof councilRuns.$inferSelect;
export type CouncilRunInsert = typeof councilRuns.$inferInsert;
export type CouncilRunMemberRow = typeof councilRunMembers.$inferSelect;
export type CouncilRunMemberInsert = typeof councilRunMembers.$inferInsert;

// --- Notes (simple checklist panel on the dashboard) ---

export const notes = sqliteTable(
  'notes',
  {
    id: text('id').primaryKey(),
    content: text('content').notNull(),
    completed: integer('completed').notNull().default(0), // 0/1 boolean
    position: integer('position').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    completedIdx: index('notes_completed_idx').on(t.completed),
    positionIdx: index('notes_position_idx').on(t.position),
  }),
);

// --- Daily Routines (gamified habit tracker) ---

export const routines = sqliteTable('routines', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const routineGroups = sqliteTable(
  'routine_groups',
  {
    id: text('id').primaryKey(),
    routineId: text('routine_id').notNull(),
    name: text('name').notNull(),
    position: integer('position').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    routineIdx: index('routine_groups_routine_idx').on(t.routineId),
  }),
);

export const routineItems = sqliteTable(
  'routine_items',
  {
    id: text('id').primaryKey(),
    groupId: text('group_id').notNull(),
    title: text('title').notNull(),
    position: integer('position').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    groupIdx: index('routine_items_group_idx').on(t.groupId),
  }),
);

export const routineProgress = sqliteTable(
  'routine_progress',
  {
    id: text('id').primaryKey(),
    routineId: text('routine_id').notNull(),
    date: text('date').notNull(),
    snapshot: text('snapshot').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    routineDateIdx: index('routine_progress_routine_date_idx').on(t.routineId, t.date),
  }),
);

export type NoteRow = typeof notes.$inferSelect;
export type NoteInsert = typeof notes.$inferInsert;

// --- Media (images, videos, audio — browsable and AI-generatable per project) ---

export const media = sqliteTable(
  'media',
  {
    id:          text('id').primaryKey(),
    projectId:   text('project_id'),
    type:        text('type').notNull(),
    title:       text('title').notNull(),
    description: text('description'),
    filePath:    text('file_path').notNull().default(''),
    mimeType:    text('mime_type').notNull().default('application/octet-stream'),
    fileSize:    integer('file_size').notNull().default(0),
    width:       integer('width'),
    height:      integer('height'),
    duration:    real('duration'),
    prompt:      text('prompt'),
    tags:        text('tags').notNull().default('[]'),
    createdAt:   text('created_at').notNull(),
    updatedAt:   text('updated_at').notNull(),
  },
  (t) => ({
    typeIdx:    index('media_type_idx').on(t.type),
    projectIdx: index('media_project_idx').on(t.projectId),
    createdIdx: index('media_created_idx').on(t.createdAt),
  }),
);
export type MediaRow    = typeof media.$inferSelect;
export type MediaInsert = typeof media.$inferInsert;
export type RoutineRow = typeof routines.$inferSelect;
export type RoutineInsert = typeof routines.$inferInsert;
export type RoutineGroupRow = typeof routineGroups.$inferSelect;
export type RoutineGroupInsert = typeof routineGroups.$inferInsert;
export type RoutineItemRow = typeof routineItems.$inferSelect;
export type RoutineItemInsert = typeof routineItems.$inferInsert;
export type RoutineProgressRow = typeof routineProgress.$inferSelect;
export type RoutineProgressInsert = typeof routineProgress.$inferInsert;
export type LlmUsageRow = typeof llmUsage.$inferSelect;
export type LlmUsageInsert = typeof llmUsage.$inferInsert;

// Read-through cache for the market (stock/crypto) proxy. One row per request key
// (e.g. `quote:crypto:bitcoin`); the service serves the stored payload until it is
// older than 30 min, then refetches upstream and upserts — saving API credits and
// surviving gateway restarts. `payload` is the endpoint's JSON response as text.
export const marketCache = sqliteTable(
  'market_cache',
  {
    key: text('key').primaryKey(),
    payload: text('payload').notNull(),
    fetchedAt: text('fetched_at').notNull(),
  },
  (t) => ({ fetchedIdx: index('market_cache_fetched_idx').on(t.fetchedAt) }),
);

export type MarketCacheRow = typeof marketCache.$inferSelect;
export type MarketCacheInsert = typeof marketCache.$inferInsert;

// Per-session hook secret (the token that authenticates a Claude session's
// in-PTY PreToolUse/Stop/Notification callbacks). Only the *hash* is stored —
// the plaintext lives in the running process's env. Persisted (not just held in
// memory) so a durable `tmux` session reattached after a gateway restart can
// still have its hooks authenticate (Phase 17 §C2). One row per session id
// (task id for agent runs); deleted when the session ends.
export const hookSecrets = sqliteTable('hook_secrets', {
  sessionId: text('session_id').primaryKey(),
  secretHash: text('secret_hash').notNull(),
  createdAt: text('created_at').notNull(),
});

export type HookSecretRow = typeof hookSecrets.$inferSelect;
export type HookSecretInsert = typeof hookSecrets.$inferInsert;
