import {
  index,
  integer,
  sqliteTable,
  text,
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
    prompt: text('prompt'),
    repo: text('repo'),
    agentId: text('agent_id'),
    sessionId: text('session_id'),
    projectId: text('project_id'),
    prUrl: text('pr_url'),
    archivedAt: text('archived_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    statusIdx: index('tasks_status_idx').on(t.status),
    projectIdx: index('tasks_project_idx').on(t.projectId),
    archivedIdx: index('tasks_archived_idx').on(t.archivedAt),
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
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

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
  },
  (t) => ({
    projectIdx: index('project_sources_project_idx').on(t.projectId),
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

export type TaskRow = typeof tasks.$inferSelect;
export type TaskInsert = typeof tasks.$inferInsert;
export type WorkflowRow = typeof workflows.$inferSelect;
export type WorkflowInsert = typeof workflows.$inferInsert;
export type WorkflowRunRow = typeof workflowRuns.$inferSelect;
export type WorkflowRunInsert = typeof workflowRuns.$inferInsert;
export type NodeRunRow = typeof nodeRuns.$inferSelect;
export type NodeRunInsert = typeof nodeRuns.$inferInsert;
export type TaskEventRow = typeof taskEvents.$inferSelect;
export type TaskEventInsert = typeof taskEvents.$inferInsert;
export type TaskAttachmentRow = typeof taskAttachments.$inferSelect;
export type TaskAttachmentInsert = typeof taskAttachments.$inferInsert;
export type TaskLinkRow = typeof taskLinks.$inferSelect;
export type TaskLinkInsert = typeof taskLinks.$inferInsert;
export type ProjectRow = typeof projects.$inferSelect;
export type ProjectInsert = typeof projects.$inferInsert;
export type ProjectSourceRow = typeof projectSources.$inferSelect;
export type ProjectSourceInsert = typeof projectSources.$inferInsert;
export type PrimaryAgentRow = typeof primaryAgent.$inferSelect;
export type PrimaryAgentInsert = typeof primaryAgent.$inferInsert;
export type SubagentRow = typeof subagents.$inferSelect;
export type SubagentInsert = typeof subagents.$inferInsert;
export type HeartbeatRunRow = typeof heartbeatRuns.$inferSelect;
export type HeartbeatRunInsert = typeof heartbeatRuns.$inferInsert;
