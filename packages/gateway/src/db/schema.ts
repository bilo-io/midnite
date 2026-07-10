import {
  index,
  integer,
  primaryKey,
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
    // Auto-fix attempts consumed re-spawning the agent to fix a failing gate.
    // Independent of retryCount — budget exhaustion is attributable per axis.
    fixAttempts: integer('fix_attempts').notNull().default(0),
    // Earliest time a backed-off retry may be re-picked (Phase 53 B). Null =
    // eligible now; the scheduler's ready-set skips a todo task until this elapses.
    nextRetryAt: text('next_retry_at'),
    // Why the task is parked in `waiting` (Phase 53 D). A failure reason (anything
    // but `needs-input`) marks it needs-attention; null when not waiting.
    waitReason: text('wait_reason'),
    prompt: text('prompt'),
    repo: text('repo'),
    agentId: text('agent_id'),
    sessionId: text('session_id'),
    projectId: text('project_id'),
    // Phase 58 D — project milestone this task is assigned to (at most one). Null
    // = unassigned (roadmap backlog). Plain intra-domain id ref, no cross-domain FK.
    milestoneId: text('milestone_id'),
    prUrl: text('pr_url'),
    // User labels as a JSON array of strings (null/absent = none). App-layer
    // validated; no join table — tags are a small free-form set per task.
    tags: text('tags'),
    // AI code review result (Phase 37 Theme D). JSON: { verdict, summary, runId, reviewedAt }.
    // Written by AiReviewService when a code-review workflow run completes on the task's PR.
    aiReview: text('ai_review'),
    archivedAt: text('archived_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    createdBy: text('created_by'),
    teamId: text('team_id'),
  },
  (t) => ({
    statusIdx: index('tasks_status_idx').on(t.status),
    projectIdx: index('tasks_project_idx').on(t.projectId),
    archivedIdx: index('tasks_archived_idx').on(t.archivedAt),
    // Backs the scheduler's "highest-priority, oldest-first" todo selection.
    statusPriorityIdx: index('tasks_status_priority_idx').on(t.status, t.priority),
    // Phase 58 D — roadmap groups tasks by milestone; index the lookup.
    milestoneIdx: index('tasks_milestone_idx').on(t.milestoneId),
    // Both teamScopeFilter OR-arms are already indexed (migration 0048); declared
    // here to reconcile the schema with the DB (Phase 57 D) — no new migration.
    createdByIdx: index('tasks_created_by_idx').on(t.createdBy),
    teamIdx: index('tasks_team_id_idx').on(t.teamId),
  }),
);

// Live GitHub PR status for a task (Phase 22 Theme C). One row per task with a
// resolvable PR URL, keyed by task id and kept fresh by the gateway's poller.
// No FK to `tasks` (cross-row integrity stays in the service); the row is cleared
// when its task is deleted.
export const prStatus = sqliteTable(
  'pr_status',
  {
    taskId: text('task_id').primaryKey(),
    url: text('url').notNull(),
    number: integer('number').notNull(),
    // PrState: open | draft | merged | closed (validated at the app layer).
    state: text('state').notNull(),
    // PrCheckState: passing | failing | pending | none.
    checks: text('checks').notNull().default('none'),
    // PrReviewDecision or null when no review requested/given.
    reviewDecision: text('review_decision'),
    fetchedAt: text('fetched_at').notNull(),
  },
  (t) => ({
    // The poller selects rows whose state isn't terminal (merged/closed).
    stateIdx: index('pr_status_state_idx').on(t.state),
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

// Blocker edges (Phase 27): `task_id` depends on `depends_on_task_id` (its
// blocker). A task is ready only when every blocker is `done`. Composite PK on
// the pair prevents a duplicate edge; the extra index on `depends_on_task_id`
// makes "who depends on me" cheap (the PK already covers "my blockers"). Plain
// intra-domain id reference — no cross-domain FK (CLAUDE.md).
export const taskDependencies = sqliteTable(
  'task_dependencies',
  {
    taskId: text('task_id').notNull(),
    dependsOnTaskId: text('depends_on_task_id').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.taskId, t.dependsOnTaskId] }),
    dependsOnIdx: index('task_dependencies_depends_on_idx').on(t.dependsOnTaskId),
  }),
);

// Quality-gate run history (Phase 30 B1): one row per `done`-gate run for a
// task. `results` is a JSON-serialised `CheckResult[]`. No new task status —
// "verifying"/"failing" is derived from the latest row + task events (B3).
// Plain intra-domain id reference — no cross-domain FK.
export const taskCheckRuns = sqliteTable(
  'task_check_runs',
  {
    id: text('id').primaryKey(),
    taskId: text('task_id').notNull(),
    /** 'gate' | 'manual' | 'auto-fix' — mirrors shared CheckTrigger. */
    trigger: text('trigger').notNull(),
    /** 0 = failed, 1 = passed. */
    passed: integer('passed').notNull(),
    startedAt: text('started_at').notNull(),
    finishedAt: text('finished_at').notNull(),
    /** JSON-serialised CheckResult[]. */
    results: text('results').notNull(),
  },
  (t) => ({
    taskIdx: index('task_check_runs_task_idx').on(t.taskId),
  }),
);

export type TaskCheckRunRow = typeof taskCheckRuns.$inferSelect;
export type TaskCheckRunInsert = typeof taskCheckRuns.$inferInsert;

/**
 * Phase 53 Theme A — one row per task-run failure, so backoff/watchdogs/health
 * can reason about *why* a task failed instead of collapsing into `abandoned`.
 * `class` is a shared FailureClass; `retry_index` is the task's retryCount at the
 * moment of failure. Recorded additively — writing a row changes no task state.
 */
export const taskFailures = sqliteTable(
  'task_failures',
  {
    id: text('id').primaryKey(),
    taskId: text('task_id').notNull(),
    /** Shared FailureClass enum value. */
    class: text('class').notNull(),
    /** Short human-readable reason. */
    detail: text('detail').notNull(),
    /** Process exit code for a crash; null otherwise. */
    exitCode: integer('exit_code'),
    /** Best-effort trailing session output snippet; null when unavailable. */
    lastOutput: text('last_output'),
    /** The task's retryCount when this failure occurred. */
    retryIndex: integer('retry_index').notNull(),
    /** teamId of the failed task; null for personal tasks. */
    teamId: text('team_id'),
    at: text('at').notNull(),
  },
  (t) => ({
    taskIdx: index('task_failures_task_idx').on(t.taskId),
    classIdx: index('task_failures_class_idx').on(t.class),
  }),
);

export type TaskFailureRow = typeof taskFailures.$inferSelect;
export type TaskFailureInsert = typeof taskFailures.$inferInsert;

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
  createdBy: text('created_by'),
  teamId: text('team_id'),
  /** Phase 40: nullable back-link to the idea this project was promoted from. */
  ideaId: text('idea_id'),
  /** Phase 40 Theme G: phase-doc sync-back toggle (0=off, 1/null=on). */
  phaseDocSync: integer('phase_doc_sync'),
  /** Phase 40 Theme G: repo (registry id) whose phase docs receive sync-back ticks. */
  phaseDocSyncRepoId: text('phase_doc_sync_repo_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => ({
  // Phase 57 D — listProjects filters only on teamScopeFilter (`createdBy = ?
  // OR createdBy IS NULL OR teamId = ?`) and had no index → full table scan.
  // Index both OR arms so SQLite can search instead.
  createdByIdx: index('projects_created_by_idx').on(t.createdBy),
  teamIdx: index('projects_team_idx').on(t.teamId),
}));

// Roadmap milestones (Phase 58 D): a minimal, project-scoped plan structure. A
// task references a milestone by id (tasks.milestoneId); progress (done/total) is
// computed, never stored. Named "milestone", not "phase" (the todo/ overload).
// Plain intra-domain id reference to a project — no cross-domain FK.
export const roadmapMilestones = sqliteTable(
  'roadmap_milestones',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    // Ascending display order within the project; drives the roadmap lane order.
    position: integer('position').notNull().default(0),
    // Optional ISO target date (informational in v1; no date-scheduling).
    targetDate: text('target_date'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    createdBy: text('created_by'),
    teamId: text('team_id'),
  },
  (t) => ({
    projectIdx: index('roadmap_milestones_project_idx').on(t.projectId, t.position),
    createdByIdx: index('roadmap_milestones_created_by_idx').on(t.createdBy),
    teamIdx: index('roadmap_milestones_team_idx').on(t.teamId),
  }),
);

export type RoadmapMilestoneRow = typeof roadmapMilestones.$inferSelect;
export type RoadmapMilestoneInsert = typeof roadmapMilestones.$inferInsert;

// Repo registry: named checkouts the orchestrator runs agents against. The DB
// is the runtime source of truth; `config.repos` seeds it on first boot. A task
// references a repo by its unique `name` (no cross-domain FK). Paths stored in
// `~`-form. `branchPrefix`/`prTemplate` are optional per-repo conventions fed to
// the agent's seed prompt (Phase 13 Theme E); the `cap` column stays deferred.
export const repos = sqliteTable(
  'repos',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    path: text('path').notNull(),
    branchPrefix: text('branch_prefix'),
    prTemplate: text('pr_template'),
    // GitHub "owner/repo" slug (Phase 37 Theme C). Used to route incoming webhook
    // events and to display the "Connect GitHub webhook" instructions in the UI.
    ownerRepo: text('owner_repo'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    createdBy: text('created_by'),
    teamId: text('team_id'),
  },
  (t) => ({
    nameIdx: uniqueIndex('repos_name_idx').on(t.name),
    ownerRepoIdx: uniqueIndex('repos_owner_repo_idx').on(t.ownerRepo),
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
    // Null for a file source (Phase 65 B): an upload has no URL.
    url: text('url'),
    kind: text('kind').notNull(),
    title: text('title'),
    faviconUrl: text('favicon_url'),
    fetchedAt: text('fetched_at'),
    createdAt: text('created_at').notNull(),
    // Ascending display order within the memory; drives the list/drag order.
    position: integer('position').notNull().default(0),
    // --- Phase 65 B: source-content ingestion ---
    // Readable text extracted from the URL body / uploaded file. Server-side
    // grounding corpus for chat + Studio; not sent in the client shape.
    extractedText: text('extracted_text'),
    // Ingestion lifecycle: null = not ingested, else 'pending'|'ready'|'failed'.
    ingestState: text('ingest_state'),
    ingestError: text('ingest_error'),
    // Uploaded-file metadata (null for link sources).
    fileName: text('file_name'),
    mimeType: text('mime_type'),
    // Relative path of the stored upload under the media/upload store.
    storagePath: text('storage_path'),
    byteSize: integer('byte_size'),
  },
  (t) => ({
    memoryIdx: index('memory_sources_memory_idx').on(t.memoryId),
  }),
);

// Studio artifacts generated from a memory's corpus (Phase 65 D): brief / FAQ /
// study-guide / timeline (markdown) + infographic (SVG). Text/markup lives inline
// in `content` — kept out of `media` (which is file-centric). Generation is async:
// a row is inserted `pending`, then flips to `ready`/`failed`. One row per
// (memory, kind); regenerate reuses the row.
export const memoryArtifacts = sqliteTable(
  'memory_artifacts',
  {
    id: text('id').primaryKey(),
    memoryId: text('memory_id').notNull(),
    kind: text('kind').notNull(),
    format: text('format').notNull(),
    title: text('title').notNull(),
    content: text('content').notNull().default(''),
    status: text('status').notNull(),
    error: text('error'),
    // File-backed artifacts (Phase 65 E — audio/video): uploads-relative path +
    // mime + size of the rendered media. Null for inline text/svg kinds and for
    // degraded file kinds (script/outline only). `degraded` marks a `ready` row
    // that shipped without its media file (no TTS/ffmpeg provider).
    filePath: text('file_path'),
    mimeType: text('mime_type'),
    fileSize: integer('file_size'),
    degraded: integer('degraded').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    memoryIdx: index('memory_artifacts_memory_idx').on(t.memoryId),
  }),
);

// Chat to the knowledge base (Phase 65 C). A single running thread per memory —
// user/assistant turns in order. Assistant turns carry `citations` (JSON array of
// the memory-source ids the answer drew on); `error` marks a graceful-failure turn.
export const memoryChatMessages = sqliteTable(
  'memory_chat_messages',
  {
    id: text('id').primaryKey(),
    memoryId: text('memory_id').notNull(),
    role: text('role').notNull(),
    content: text('content').notNull(),
    // JSON string[] of source ids; null for user turns / uncited answers.
    citations: text('citations'),
    // 1 when this assistant turn is a graceful-failure notice, else null.
    error: integer('error'),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    memoryIdx: index('memory_chat_messages_memory_idx').on(t.memoryId),
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
    // The template this workflow was installed from (Phase 36). Nullable — null
    // for workflows created directly, set on install for record-keeping only.
    installedFromTemplateId: text('installed_from_template_id'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    createdBy: text('created_by'),
    teamId: text('team_id'),
  },
  (t) => ({
    enabledIdx: index('workflows_enabled_idx').on(t.enabled),
    triggerTypeIdx: index('workflows_trigger_type_idx').on(t.triggerType),
    // Phase 57 D — teamScopeFilter is `createdBy = ? OR createdBy IS NULL OR
    // teamId = ?`; createdBy was indexed (0048) but teamId was not, so the OR
    // still scanned. `createdByIdx` reconciles the schema with 0048 (no new
    // migration); `teamIdx` is the missing arm this slice adds.
    createdByIdx: index('workflows_created_by_idx').on(t.createdBy),
    teamIdx: index('workflows_team_idx').on(t.teamId),
  }),
);

// ── Workflow template marketplace (Phase 36) ────────────────────────────────
// Stores reusable, shareable workflow definitions. System templates (built-in
// seeds) have author_id = NULL. Soft-deleted via deleted_at (never hard-deleted).
export const workflowTemplates = sqliteTable(
  'workflow_templates',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    // Category: one of monitoring|notifications|github|scheduling|ai|data.
    category: text('category').notNull(),
    // JSON array of tag strings.
    tags: text('tags').notNull().default('[]'),
    // JSON array of { key, type, description } credential slot definitions.
    credentialSlots: text('credential_slots').notNull().default('[]'),
    // JSON: { trigger: Trigger, nodes: WorkflowNode[], edges: WorkflowEdge[] }
    definition: text('definition').notNull(),
    // Optional thumbnail URL or data URI.
    thumbnail: text('thumbnail'),
    // Published system templates are visible to all users.
    published: integer('published').notNull().default(1),
    // null for system (built-in) templates; user ID for user-created templates.
    authorId: text('author_id'),
    deletedAt: text('deleted_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    slugIdx: uniqueIndex('workflow_templates_slug_idx').on(t.slug),
    categoryIdx: index('workflow_templates_category_idx').on(t.category, t.published),
    authorIdx: index('workflow_templates_author_idx').on(t.authorId),
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

// Secrets that integration/HTTP nodes reference by id. `data` holds the AES-256-GCM
// encrypted JSON payload ("v1:..."); the plaintext secret never leaves the gateway.
// Mirrors the llm_providers at-rest encryption contract (CryptoService, fail-closed).
export const workflowCredentials = sqliteTable('workflow_credentials', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // WorkflowCredentialType
  data: text('data').notNull(), // encrypted JSON blob, never returned to a client
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

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
// api_key must be read back to build clients (so it can't be hashed) — it is
// stored **encrypted at rest** via CryptoService (AES-256-GCM, `v1:` prefix),
// fail-closed when MIDNITE_SECRET_KEY is unset (the write is rejected, never
// persisted as plaintext); a boot pass re-encrypts any legacy plaintext rows.
// It is NEVER returned raw over the API — the controller maps to a masked
// ProviderCredential (hasKey + last-4 hint).
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
export type WorkflowCredentialRow = typeof workflowCredentials.$inferSelect;
export type WorkflowCredentialInsert = typeof workflowCredentials.$inferInsert;
export type TaskEventRow = typeof taskEvents.$inferSelect;
export type TaskEventInsert = typeof taskEvents.$inferInsert;
export type TaskAttachmentRow = typeof taskAttachments.$inferSelect;
export type TaskAttachmentInsert = typeof taskAttachments.$inferInsert;
export type TaskLinkRow = typeof taskLinks.$inferSelect;
export type TaskLinkInsert = typeof taskLinks.$inferInsert;
export type TaskDependencyRow = typeof taskDependencies.$inferSelect;
export type TaskDependencyInsert = typeof taskDependencies.$inferInsert;
export type PrStatusRow = typeof prStatus.$inferSelect;
export type PrStatusInsert = typeof prStatus.$inferInsert;
export type ProjectRow = typeof projects.$inferSelect;
export type ProjectInsert = typeof projects.$inferInsert;
export type RepoRow = typeof repos.$inferSelect;
export type RepoInsert = typeof repos.$inferInsert;
export type MemoryRow = typeof memories.$inferSelect;
export type MemoryInsert = typeof memories.$inferInsert;
export type MemorySourceRow = typeof memorySources.$inferSelect;
export type MemorySourceInsert = typeof memorySources.$inferInsert;
export type MemoryArtifactRow = typeof memoryArtifacts.$inferSelect;
export type MemoryArtifactInsert = typeof memoryArtifacts.$inferInsert;
export type MemoryChatMessageRow = typeof memoryChatMessages.$inferSelect;
export type MemoryChatMessageInsert = typeof memoryChatMessages.$inferInsert;
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

// --- Approval rules (Phase 23) ---

export const approvalRules = sqliteTable(
  'approval_rules',
  {
    id: text('id').primaryKey(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    /** 'allow' | 'deny' */
    effect: text('effect').notNull(),
    /** Tool name to match, or '*' for all tools. */
    toolName: text('tool_name').notNull(),
    /** JSON: { commandPrefix?: string[], pathGlob?: string[] } | null */
    match: text('match'),
    /** Always 'global' this phase; per-repo scoping is deferred. */
    scope: text('scope').notNull().default('global'),
    note: text('note'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    toolIdx: index('approval_rules_tool_idx').on(t.toolName),
    enabledIdx: index('approval_rules_enabled_idx').on(t.enabled),
  }),
);

export type ApprovalRuleRow = typeof approvalRules.$inferSelect;
export type ApprovalRuleInsert = typeof approvalRules.$inferInsert;

/** Single-row settings for the approvals policy engine (+ Phase 50 pause state). */
export const approvalSettings = sqliteTable('approval_settings', {
  /** Always 'singleton' — this table has exactly one row. */
  id: text('id').primaryKey().$default(() => 'singleton'),
  /** 'manual' | 'guarded' | 'autonomous' */
  mode: text('mode').notNull().default('manual'),
  updatedAt: text('updated_at').notNull(),
  // --- Phase 50 A: kill switch & global pause (DB-backed so it survives a restart) ---
  /** Global kill switch. 0 = running, 1 = paused everywhere. */
  pausedGlobal: integer('paused_global', { mode: 'boolean' }).notNull().default(false),
  /** JSON string[] of paused repo refs (task.repo). */
  pausedRepos: text('paused_repos').notNull().default('[]'),
  /** JSON string[] of paused team ids (task.teamId). */
  pausedTeams: text('paused_teams').notNull().default('[]'),
  /** Who last changed pause state, and when (ISO). */
  pausedBy: text('paused_by'),
  pausedAt: text('paused_at'),
});
export type ApprovalSettingsRow = typeof approvalSettings.$inferSelect;

/** Durable audit record for every approval decision (user or automatic). */
export const approvalLog = sqliteTable(
  'approval_log',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id').notNull(),
    taskId: text('task_id'),
    toolName: text('tool_name').notNull(),
    summary: text('summary'),
    /** See ApprovalLogResolutionSchema in @midnite/shared. */
    resolution: text('resolution').notNull(),
    ruleId: text('rule_id'),
    /** 'user' | 'policy' | 'timeout' | 'system' */
    decidedBy: text('decided_by').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    sessionIdx: index('approval_log_session_idx').on(t.sessionId),
    taskIdx: index('approval_log_task_idx').on(t.taskId),
    createdAtIdx: index('approval_log_created_at_idx').on(t.createdAt),
  }),
);
export type ApprovalLogRow = typeof approvalLog.$inferSelect;
export type ApprovalLogInsert = typeof approvalLog.$inferInsert;

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

// Persisted notification feed (Phase 21). The notifications service turns
// notify-worthy state transitions into rows here; the web center reads them
// (unread-first) and marks them read. `read_at` null = unread.
export const notifications = sqliteTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    kind: text('kind').notNull(),
    severity: text('severity').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    route: text('route').notNull(),
    readAt: text('read_at'),
    createdAt: text('created_at').notNull(),
    teamId: text('team_id'),
  },
  (t) => ({
    createdIdx: index('notifications_created_idx').on(t.createdAt),
    readIdx: index('notifications_read_idx').on(t.readAt),
    teamIdx: index('notification_team_idx').on(t.teamId, t.createdAt),
  }),
);

export type NotificationRow = typeof notifications.$inferSelect;
export type NotificationInsert = typeof notifications.$inferInsert;

// Runtime metrics (Phase 22 A1): one low-volume row per agent run — start/end
// timing, outcome, retry count, and the optional repo it ran against. In-memory
// gauges (queue depth, slot utilization) are not persisted; only per-run history
// lives here. `ended_at` and `duration_ms` are null while the run is live.
export const agentRunStats = sqliteTable(
  'agent_run_stats',
  {
    id: text('id').primaryKey(),
    taskId: text('task_id').notNull(),
    startedAt: text('started_at').notNull(),
    endedAt: text('ended_at'),
    durationMs: integer('duration_ms'),
    /** 'done' | 'abandoned' | 'failed' | 'cancelled' — null while live. */
    outcome: text('outcome'),
    retryCount: integer('retry_count').notNull().default(0),
    repo: text('repo'),
  },
  (t) => ({
    taskIdx: index('agent_run_stats_task_idx').on(t.taskId),
    startedIdx: index('agent_run_stats_started_idx').on(t.startedAt),
  }),
);

export type AgentRunStatsRow = typeof agentRunStats.$inferSelect;
export type AgentRunStatsInsert = typeof agentRunStats.$inferInsert;

/**
 * Phase 61 D — persisted samples of the live gauges (queue depth, slot usage,
 * tick latency) so fleet-trend history survives a gateway restart (the in-memory
 * GaugeStore is lost on boot by design). Written every `metrics.sampleIntervalMs`
 * by MetricsSamplerService; a raw metrics table (bounded by `metrics.rawRetentionDays`,
 * self-pruned by the sampler; Theme E generalizes rollups/retention).
 */
export const gaugeSamples = sqliteTable(
  'gauge_samples',
  {
    id: text('id').primaryKey(),
    at: text('at').notNull(),
    queueDepth: integer('queue_depth'),
    slotsUsed: integer('slots_used'),
    slotsTotal: integer('slots_total'),
    tickLatencyMs: integer('tick_latency_ms'),
  },
  (t) => ({
    atIdx: index('gauge_samples_at_idx').on(t.at),
  }),
);

export type GaugeSampleRow = typeof gaugeSamples.$inferSelect;
export type GaugeSampleInsert = typeof gaugeSamples.$inferInsert;

// Harvested real token usage per agent session (Phase 61 A). One row per session
// (pk = session id = task id), upserted from the Claude Code transcript at Stop.
// `est_cost_usd` is nullable — null means the model is unpriced (tokens still
// stored). Theme B adds cost-attribution reads over this table.
export const sessionUsage = sqliteTable('session_usage', {
  sessionId: text('session_id').primaryKey(),
  agentCli: text('agent_cli'),
  model: text('model'),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  cachedReadTokens: integer('cached_read_tokens').notNull().default(0),
  cachedWriteTokens: integer('cached_write_tokens').notNull().default(0),
  contextTokens: integer('context_tokens').notNull().default(0),
  estCostUsd: real('est_cost_usd'),
  updatedAt: text('updated_at').notNull(),
});

export type SessionUsageRow = typeof sessionUsage.$inferSelect;
export type SessionUsageInsert = typeof sessionUsage.$inferInsert;

/**
 * Phase 61 E — aggregated metrics rollups. One row per
 * (period, bucketStart, source, repo, provider, model), identified by a
 * deterministic `key` (the pk) so re-running the rollup upserts in place
 * (idempotent). Metric columns are nullable + populated per `source`
 * ('runs' | 'llm' | 'session' | 'gauge'). Kept forever; the raw tables they
 * summarise (llm_usage/session_usage/agent_run_stats/gauge_samples) are pruned
 * past `metrics.rawRetentionDays` once rolled up. Never summarises task_events.
 */
export const metricsRollup = sqliteTable(
  'metrics_rollup',
  {
    key: text('key').primaryKey(),
    period: text('period').notNull(), // 'hourly' | 'daily'
    bucketStart: text('bucket_start').notNull(), // ISO, UTC
    source: text('source').notNull(), // 'runs' | 'llm' | 'session' | 'gauge'
    repo: text('repo'),
    provider: text('provider'),
    model: text('model'),
    // source='runs'
    runCount: integer('run_count'),
    doneCount: integer('done_count'),
    abandonedCount: integer('abandoned_count'),
    failedCount: integer('failed_count'),
    cancelledCount: integer('cancelled_count'),
    totalDurationMs: integer('total_duration_ms'),
    retriedRuns: integer('retried_runs'),
    // source='llm' | 'session'
    calls: integer('calls'),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    estCostUsd: real('est_cost_usd'),
    // source='gauge'
    avgQueueDepth: real('avg_queue_depth'),
    avgSlotsUsed: real('avg_slots_used'),
    avgTickLatencyMs: real('avg_tick_latency_ms'),
    sampleCount: integer('sample_count'),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    periodBucketIdx: index('metrics_rollup_period_bucket_idx').on(t.period, t.bucketStart),
  }),
);

export type MetricsRollupRow = typeof metricsRollup.$inferSelect;
export type MetricsRollupInsert = typeof metricsRollup.$inferInsert;


export type WorkflowTemplateRow = typeof workflowTemplates.$inferSelect;
export type WorkflowTemplateInsert = typeof workflowTemplates.$inferInsert;

// Phase 33: user identity + JWT auth.
export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    passwordHash: text('password_hash').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    emailIdx: uniqueIndex('users_email_idx').on(t.email),
  }),
);

export type UserRow = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;

export const refreshTokens = sqliteTable(
  'refresh_tokens',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: text('expires_at').notNull(),
    revokedAt: text('revoked_at'),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    userIdx: index('refresh_tokens_user_idx').on(t.userId),
    tokenIdx: uniqueIndex('refresh_tokens_token_idx').on(t.tokenHash),
  }),
);

export type RefreshTokenRow = typeof refreshTokens.$inferSelect;
export type RefreshTokenInsert = typeof refreshTokens.$inferInsert;

// Phase 43 Theme B: server-synced user preferences. One row per user (userId PK),
// holding the JSON-encoded `UserPreferences` blob from `shared`. Kept off the
// auth-critical `users` row; no FK (cross-domain FKs are avoided per CLAUDE.md).
export const userPreferences = sqliteTable('user_preferences', {
  userId: text('user_id').primaryKey(),
  /** JSON-encoded `UserPreferences` (the synced blob). */
  data: text('data').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type UserPreferencesRow = typeof userPreferences.$inferSelect;
export type UserPreferencesInsert = typeof userPreferences.$inferInsert;

// Phase 44 Theme A: outbound webhook integrations. Per-team endpoints; `secret`
// is the HMAC signing key, encrypted at rest (CryptoService); `eventFilter` is
// the JSON-encoded `WebhookEventFilter`. No cross-domain FK (per CLAUDE.md).
export const webhooks = sqliteTable(
  'webhooks',
  {
    id: text('id').primaryKey(),
    teamId: text('team_id'),
    createdBy: text('created_by'),
    url: text('url').notNull(),
    provider: text('provider').notNull(),
    eventFilter: text('event_filter').notNull(),
    secret: text('secret').notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    teamIdx: index('webhooks_team_idx').on(t.teamId),
  }),
);

export type WebhookRow = typeof webhooks.$inferSelect;
export type WebhookInsert = typeof webhooks.$inferInsert;

/**
 * Recorded outbound deliveries (Phase 44 Theme B). One row per (event, endpoint)
 * dispatch. `teamId` is denormalized from the endpoint so the deliveries log
 * (Theme D) can be team-scoped without a join. `payload` is the exact body sent,
 * persisted for a faithful redeliver.
 */
export const webhookDeliveries = sqliteTable(
  'webhook_deliveries',
  {
    id: text('id').primaryKey(),
    webhookId: text('webhook_id').notNull(),
    teamId: text('team_id'),
    event: text('event').notNull(),
    status: text('status').notNull(),
    responseCode: integer('response_code'),
    attempts: integer('attempts').notNull().default(0),
    error: text('error'),
    payload: text('payload').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    webhookIdx: index('webhook_deliveries_webhook_idx').on(t.webhookId),
    teamIdx: index('webhook_deliveries_team_idx').on(t.teamId),
  }),
);

export type WebhookDeliveryRow = typeof webhookDeliveries.$inferSelect;
export type WebhookDeliveryInsert = typeof webhookDeliveries.$inferInsert;

/**
 * Inbound integration sources (Phase 46). A team registers external systems
 * (GitHub / Linear / a generic signed sender) that may open tasks; the signed
 * receiver (Theme B) verifies against the per-source `secret` (encrypted at rest)
 * and maps the payload to a task via `createFromPrompt`, seeded by the optional
 * default repo/project. Mirrors the `webhooks` (outbound) table.
 */
export const inboundSources = sqliteTable(
  'inbound_sources',
  {
    id: text('id').primaryKey(),
    teamId: text('team_id'),
    createdBy: text('created_by'),
    provider: text('provider').notNull(),
    eventFilter: text('event_filter').notNull(),
    secret: text('secret').notNull(),
    defaultRepo: text('default_repo'),
    defaultProjectId: text('default_project_id'),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    teamIdx: index('inbound_sources_team_idx').on(t.teamId),
  }),
);

export type InboundSourceRow = typeof inboundSources.$inferSelect;
export type InboundSourceInsert = typeof inboundSources.$inferInsert;

/**
 * Recorded inbound deliveries (Phase 46 Theme B/D). One row per received event.
 * `result` is `created` / `skipped-duplicate` / `rejected` / `ignored` / `failed`;
 * `externalId` is the provider's delivery/item id for dedup; `taskId` backlinks the
 * created task. `teamId` is denormalized from the source so the log is team-scoped
 * without a join.
 */
export const inboundDeliveries = sqliteTable(
  'inbound_deliveries',
  {
    id: text('id').primaryKey(),
    sourceId: text('source_id').notNull(),
    teamId: text('team_id'),
    provider: text('provider').notNull(),
    event: text('event'),
    externalId: text('external_id'),
    result: text('result').notNull(),
    taskId: text('task_id'),
    error: text('error'),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    sourceIdx: index('inbound_deliveries_source_idx').on(t.sourceId),
    teamIdx: index('inbound_deliveries_team_idx').on(t.teamId),
  }),
);

export type InboundDeliveryRow = typeof inboundDeliveries.$inferSelect;
export type InboundDeliveryInsert = typeof inboundDeliveries.$inferInsert;

// Phase 33 Theme B: Teams & membership.
export const teams = sqliteTable(
  'teams',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    createdBy: text('created_by').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    slugIdx: uniqueIndex('teams_slug_idx').on(t.slug),
    createdByIdx: index('teams_created_by_idx').on(t.createdBy),
  }),
);

export type TeamRow = typeof teams.$inferSelect;
export type TeamInsert = typeof teams.$inferInsert;

// Roles: owner > admin > member > viewer
export const teamMemberships = sqliteTable(
  'team_memberships',
  {
    teamId: text('team_id').notNull(),
    userId: text('user_id').notNull(),
    role: text('role').notNull().default('member'),
    joinedAt: text('joined_at').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.teamId, t.userId] }),
    userIdx: index('team_memberships_user_idx').on(t.userId),
  }),
);

export type TeamMembershipRow = typeof teamMemberships.$inferSelect;
export type TeamMembershipInsert = typeof teamMemberships.$inferInsert;

export const teamInvites = sqliteTable(
  'team_invites',
  {
    id: text('id').primaryKey(),
    teamId: text('team_id').notNull(),
    invitedBy: text('invited_by').notNull(),
    // null = open-link invite (any authenticated user can accept)
    email: text('email'),
    token: text('token').notNull().unique(),
    role: text('role').notNull().default('member'),
    expiresAt: text('expires_at').notNull(),
    acceptedAt: text('accepted_at'),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    tokenIdx: uniqueIndex('team_invites_token_idx').on(t.token),
    teamIdx: index('team_invites_team_idx').on(t.teamId),
  }),
);

export type TeamInviteRow = typeof teamInvites.$inferSelect;
export type TeamInviteInsert = typeof teamInvites.$inferInsert;

// ── Audit log (Phase 33 D3) ─────────────────────────────────────────────────
// Append-only structured history of significant actions. userId is nullable
// for system-initiated events (bootstrap, scheduled jobs). payload is a JSON
// blob for action-specific detail (e.g. status transitions).
export const auditLog = sqliteTable(
  'audit_log',
  {
    id: text('id').primaryKey(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    userId: text('user_id'),
    action: text('action').notNull(),
    payload: text('payload'),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    entityIdx: index('audit_entity_idx').on(t.entityType, t.entityId),
    userTimeIdx: index('audit_user_time_idx').on(t.userId, t.createdAt),
    actionIdx: index('audit_action_idx').on(t.action),
  }),
);

export type AuditLogRow = typeof auditLog.$inferSelect;
export type AuditLogInsert = typeof auditLog.$inferInsert;

// ── Service tokens (Phase 38 Theme B) ──────────────────────────────────────
// Machine-readable API keys for CI/CD pipelines and scripted integrations.
// token_hash is SHA-256(raw_token); the raw token is returned once at creation
// and never stored. prefix (first 8 chars) identifies the token in list views.
export const serviceTokens = sqliteTable(
  'service_tokens',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    tokenHash: text('token_hash').notNull(),
    prefix: text('prefix').notNull(),
    teamId: text('team_id'),
    createdBy: text('created_by'),
    lastUsedAt: text('last_used_at'),
    expiresAt: text('expires_at'),
    revokedAt: text('revoked_at'),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    hashIdx: uniqueIndex('service_tokens_hash_idx').on(t.tokenHash),
    teamIdx: index('service_tokens_team_idx').on(t.teamId),
  }),
);

export type ServiceTokenRow = typeof serviceTokens.$inferSelect;
export type ServiceTokenInsert = typeof serviceTokens.$inferInsert;

// Phase 40 Theme A: idea entity + AI chat messages.
export const ideas = sqliteTable(
  'ideas',
  {
    id: text('id').primaryKey(),
    teamId: text('team_id'),
    createdBy: text('created_by'),
    title: text('title').notNull(),
    body: text('body').notNull().default(''),
    status: text('status').notNull().default('draft'),
    projectId: text('project_id'),
    // JSON-serialised string[]. SQLite has no array type.
    tags: text('tags').notNull().default('[]'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    teamIdx: index('ideas_team_idx').on(t.teamId),
    statusIdx: index('ideas_status_idx').on(t.status),
  }),
);

export type IdeaRow = typeof ideas.$inferSelect;
export type IdeaInsert = typeof ideas.$inferInsert;

export const ideaMessages = sqliteTable(
  'idea_messages',
  {
    id: text('id').primaryKey(),
    ideaId: text('idea_id').notNull(),
    role: text('role').notNull(),
    content: text('content').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    ideaIdx: index('idea_messages_idea_idx').on(t.ideaId, t.createdAt),
  }),
);

export type IdeaMessageRow = typeof ideaMessages.$inferSelect;
export type IdeaMessageInsert = typeof ideaMessages.$inferInsert;

// --- Schema version stamp (Phase 49 A) ---

/** Single-row record of the applied migration index, written on every boot from
 *  the drizzle journal's highest entry. Data portability (export/import) reads it
 *  to stamp archives and gauge cross-instance schema compatibility. */
export const schemaMeta = sqliteTable('schema_meta', {
  /** Always 'singleton' — this table has exactly one row. */
  id: text('id').primaryKey().$default(() => 'singleton'),
  /** The journal's highest applied migration idx at last boot. */
  schemaVersion: integer('schema_version').notNull(),
  updatedAt: text('updated_at').notNull(),
});
export type SchemaMetaRow = typeof schemaMeta.$inferSelect;

/**
 * Runtime lifecycle marker (Phase 54 E). One row: was the *previous* stop graceful?
 * Boot stamps `clean=false` + `startedAt`; the graceful-shutdown drain flips
 * `clean=true` + `shutdownAt`. So on the next boot a still-`false` value means the
 * last process died without draining (crash / hard kill). Surfaced by Theme F.
 */
export const runtimeMeta = sqliteTable('runtime_meta', {
  id: text('id').primaryKey().$default(() => 'singleton'),
  /** Whether the last shutdown drained cleanly (0/1). */
  clean: integer('clean', { mode: 'boolean' }).notNull(),
  /** ISO time this process started (stamped on boot). */
  startedAt: text('started_at').notNull(),
  /** ISO time of the last graceful drain; null until one happens. */
  shutdownAt: text('shutdown_at'),
});
export type RuntimeMetaRow = typeof runtimeMeta.$inferSelect;

// --- PR review comment drafts (Phase 52 D) ---

/** Persisted inline review comments for a task's PR. A `draft` survives a reload
 *  and is editable; on review submit the batch posts to GitHub and flips to
 *  `submitted`. Per-author; plain intra-domain task id (no cross-domain FK). */
export const prReviewComments = sqliteTable(
  'pr_review_comments',
  {
    id: text('id').primaryKey(),
    taskId: text('task_id').notNull(),
    path: text('path').notNull(),
    line: integer('line').notNull(),
    /** 'LEFT' (old file) | 'RIGHT' (new file). */
    side: text('side').notNull(),
    body: text('body').notNull(),
    /** Author id (JWT user, or 'local' for the static-token/single-user path). */
    author: text('author').notNull(),
    /** 'draft' | 'submitted'. */
    state: text('state').notNull().default('draft'),
    /** GitHub review-comment id once submitted; null while draft. */
    githubCommentId: text('github_comment_id'),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    taskAuthorIdx: index('pr_review_comments_task_author_idx').on(t.taskId, t.author, t.state),
  }),
);
export type PrReviewCommentRow = typeof prReviewComments.$inferSelect;
export type PrReviewCommentInsert = typeof prReviewComments.$inferInsert;

// Chat-to-board command log (Phase 59 F): one row per *executed* NL command,
// holding the revert plan so it can be undone. The row `id` doubles as the undo
// token returned in ChatCommandResult. Plain intra-domain id references (no
// cross-domain FK). Read-only queries + un-confirmed (gated) commands are never
// logged here — only writes that actually happened.
export const chatCommands = sqliteTable(
  'chat_commands',
  {
    id: text('id').primaryKey(),
    /** Requesting user (JWT id, or null for the static-token/single-user path). */
    userId: text('user_id'),
    teamId: text('team_id'),
    /** The raw NL command text. */
    text: text('text').notNull(),
    /** The parsed intent's discriminant (createTask/bulkCreate/…). */
    intentType: text('intent_type').notNull(),
    /** How the intent was resolved (deterministic/local/provider) — for the audit trail. */
    inferencePath: text('inference_path').notNull(),
    /** JSON array of the task ids this command created or changed. */
    affectedIds: text('affected_ids').notNull(),
    /** JSON array of inverse ops (delete / restore-field) the undo path replays. */
    revertPlan: text('revert_plan').notNull(),
    createdAt: text('created_at').notNull(),
    /** Set when the command has been undone; null = still reversible. */
    undoneAt: text('undone_at'),
  },
  (t) => ({
    userIdx: index('chat_commands_user_idx').on(t.userId),
  }),
);
export type ChatCommandRow = typeof chatCommands.$inferSelect;
export type ChatCommandInsert = typeof chatCommands.$inferInsert;

// Task retrospectives (Phase 62 A): one row per task, upserted on its terminal
// transition. The full deterministic TaskRetro skeleton serializes to `retro`
// (JSON); a few columns stay queryable for lists/filters (Themes F/G). Product
// data — never pruned by P61 retention. Plain intra-domain task id (no FK).
export const taskRetros = sqliteTable(
  'task_retros',
  {
    id: text('id').primaryKey(),
    /** One retro per task — the upsert key. */
    taskId: text('task_id').notNull().unique(),
    /** Terminal outcome the retro was built for: 'done' | 'abandoned'. */
    outcome: text('outcome').notNull(),
    /** 1 once an LLM narrative has been attached (Theme C/H); 0 for the skeleton. */
    hasNarrative: integer('has_narrative').notNull().default(0),
    /** The full serialized TaskRetro (JSON). */
    retro: text('retro').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    outcomeIdx: index('task_retros_outcome_idx').on(t.outcome),
  }),
);
export type TaskRetroRow = typeof taskRetros.$inferSelect;
export type TaskRetroInsert = typeof taskRetros.$inferInsert;
