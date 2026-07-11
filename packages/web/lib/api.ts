import {
  NotesResponseSchema,
  NoteResponseSchema,
  NewsResponseSchema,
  WeatherResponseSchema,
  LinkMetadataResponseSchema,
  AssetSearchResponseSchema,
  SearchResponseSchema,
  type SearchResponse,
  type SearchType,
  MarketQuoteSchema,
  MarketHistoryResponseSchema,
  type AssetKind,
  type AssetSearchResult,
  type MarketQuote,
  type MarketHistoryResponse,
  type MarketTimeframe,
  MediaListResponseSchema,
  MediaResponseSchema,
  type HackerNewsStory,
  type WeatherResponse,
  type LinkMetadataResponse,
  type Media,
  type MediaType,
  type CreateMediaBody,
  type UpdateMediaBody,
  RoutinesResponseSchema,
  RoutineResponseSchema,
  RoutineProgressResponseSchema,
  RoutineProgressListResponseSchema,
  type Note,
  type CreateNoteRequest,
  type UpdateNoteRequest,
  type Routine,
  type RoutineProgress,
  type CreateRoutineRequest,
  type UpdateRoutineRequest,
  type CreateGroupRequest,
  type UpdateGroupRequest,
  type CreateItemRequest,
  type UpdateItemRequest,
  type RecordProgressRequest,
  UsageSummaryResponseSchema,
  type UsageSummaryResponse,
  type UsageGroupBy,
  UsageAttributionResponseSchema,
  type UsageAttributionResponse,
  type UsageAttributionQuery,
  NotificationListResponseSchema,
  type NotificationListResponse,
  type NotificationListQuery,
  type MarkReadRequest,
  AgentPoolSnapshotSchema,
  type AgentPoolSnapshot,
  OpsSummarySchema,
  type OpsSummary,
  type OpsQuery,
  CycleTimeResponseSchema,
  type CycleTimeResponse,
  type CycleTimeQuery,
  GaugeHistoryResponseSchema,
  type GaugeHistoryResponse,
  type GaugeHistoryQuery,
  SystemStatsSchema,
  type SystemStats,
  WorkflowTemplateResponseSchema,
  WorkflowTemplatesResponseSchema,
  TemplateSlotsResponseSchema,
  InstallTemplateRequestSchema,
  CreateFromWorkflowRequestSchema,
  type WorkflowTemplate,
  type WorkflowTemplateSummary,
  type InstallTemplateRequest,
  type TemplateSlotsResponse,
  type CreateFromWorkflowRequest,
  IdeaResponseSchema,
  IdeasResponseSchema,
  IdeaMessagesResponseSchema,
  IdeaChatResponseSchema,
  PromoteIdeaResponseSchema,
  type Idea,
  type IdeaMessage,
  type IdeaResponse,
  type IdeasResponse,
  type IdeaMessagesResponse,
  type IdeaChatResponse,
  type CreateIdeaRequest,
  type UpdateIdeaRequest,
  type IdeaChatRequest,
  type IdeaQuery,
  type PromoteIdeaRequest,
  type PromoteIdeaResponse,
  ReadinessSchema,
  PreflightReportSchema,
  type Readiness,
  type PreflightReport,
  PresenceSummarySchema,
  type PresenceSummary,
} from '@midnite/shared';
import {
  AgentCliResponseSchema,
  CouncilMemberResponseSchema,
  CouncilResponseSchema,
  CouncilRunResponseSchema,
  CouncilRunsResponseSchema,
  CouncilSchema,
  AgentCliStatusResponseSchema,
  AgentCliStatusListResponseSchema,
  AgentPingResponseSchema,
  AgentsConfigResponseSchema,
  ProvidersResponseSchema,
  ProviderResponseSchema,
  InstallTerminalResponseSchema,
  EnvironmentResponseSchema,
  type EnvironmentResponse,
  SetupStatusSchema,
  type SetupStatus,
  type EnvToolAction,
  type EnvToolId,
  BrowseDirResponseSchema,
  BulkCreateTaskResponseSchema,
  CheckRunListResponseSchema,
  CreatePlanTasksResponseSchema,
  CreateTaskResponseSchema,
  CreateFromBreakdownResponseSchema,
  BreakdownPreviewResponseSchema,
  type Breakdown,
  type BreakdownPreviewResponse,
  DraftPlanResponseSchema,
  TriggerCheckResponseSchema,
  EnhanceDescriptionResponseSchema,
  HeartbeatRunResponseSchema,
  HeartbeatRunsResponseSchema,
  MemoriesResponseSchema,
  MemoryResponseSchema,
  MemoryArtifactResponseSchema,
  MemoryArtifactsResponseSchema,
  MemoryChatHistoryResponseSchema,
  PostMemoryChatResponseSchema,
  PrimaryAgentResponseSchema,
  ProjectResponseSchema,
  PhaseDocResponseSchema,
  PhaseDocsResponseSchema,
  ProjectSchema,
  RepoResponseSchema,
  RepoSchema,
  RunResponseSchema,
  SessionSummarySchema,
  SessionDetailSchema,
  SessionTranscriptSchema,
  SubAgentResponseSchema,
  PrDiffSchema,
  PrReviewDraftSchema,
  PrReviewDraftsResponseSchema,
  GuardrailsResponseSchema,
  WsSettingsResponseSchema,
  WsMetricsResponseSchema,
  type WsRingSize,
  type WsMetrics,
  TaskCountsSchema,
  TaskFailuresResponseSchema,
  TaskGraphResponseSchema,
  type TaskGraph,
  ChatQueryResponseSchema,
  type ChatQueryAnswer,
  MilestoneSchema,
  MilestoneResponseSchema,
  RoadmapResponseSchema,
  type Milestone,
  type RoadmapView,
  type CreateMilestoneRequest,
  type UpdateMilestoneRequest,
  TaskSchema,
  TasksPageSchema,
  TaskActivityResponseSchema,
  type TaskActivityEntry,
  type TaskSummary,
  type TaskListQuery,
  TasksDoctorReportSchema,
  TerminalTokenResponseSchema,
  WebhookInfoResponseSchema,
  WorkflowResponseSchema,
  WorkflowRunSchema,
  WorkflowSummarySchema,
  type AgentCli,
  type AgentCliStatus,
  type AgentsConfig,
  type BrowseDirResponse,
  type BulkCreateTaskRequest,
  type BulkCreateTaskResponse,
  type CheckRunListResponse,
  type TriggerCheckResponse,
  type CliTerminalAction,
  type Council,
  type CouncilFormat,
  type CouncilMember,
  type CouncilRun,
  type CreateCouncilMemberRequest,
  type CreateCouncilRequest,
  type UpdateCouncilMemberRequest,
  type UpdateCouncilRequest,
  type CreateProjectRequest,
  type CreateSubAgentRequest,
  type CreateTaskResponse,
  type CreateWorkflowRequest,
  type DraftPlanResponse,
  type CreateMemoryRequest,
  type HeartbeatRun,
  type LlmProvider,
  type Memory,
  type MemoryArtifact,
  type MemoryArtifactKind,
  type MemoryChatMessage,
  type PostMemoryChatResponse,
  type PrDiff,
  type PrReviewSubmission,
  type PrReviewDraft,
  type CreatePrReviewDraft,
  type PrMergeMethod,
  type GuardrailSettings,
  type GuardrailCaps,
  type PauseScope,
  type PrimaryAgent,
  type ProvidersResponse,
  type ProviderResponse,
  type UpdateProviderCredentialRequest,
  type Project,
  type PhaseDoc,
  type CreatePhaseDocRequest,
  type UpdatePhaseDocRequest,
  type Repo,
  type CreateRepoRequest,
  type UpdateRepoRequest,
  type SessionSummary,
  type SessionDetail,
  type SessionTranscript,
  type AgentPingResponse,
  type FailureClass,
  type ResolveTaskAction,
  type Status,
  type SubAgent,
  type Task,
  type TaskCounts,
  type TaskFailure,
  type TasksDoctorReport,
  type TerminalTokenResponse,
  type UpdatePrimaryAgentRequest,
  type UpdateMemoryRequest,
  type UpdateProjectRequest,
  type UpdateSubAgentRequest,
  type UpdateWorkflowRequest,
  type WebhookInfoResponse,
  type Workflow,
  type WorkflowRun,
  type WorkflowSummary,
  WorkflowCredentialsResponseSchema,
  WorkflowCredentialResponseSchema,
  type WorkflowCredential,
  type CreateWorkflowCredentialRequest,
  TeamWithMembersSchema,
  TeamInviteSchema,
  type Team,
  type TeamWithMembers,
  type TeamInvite,
  type TeamRole,
  type CreateTeamRequest,
  type UpdateTeamRequest,
  type CreateInviteRequest,
  UserSchema,
  type User,
  type UpdateUserRequest,
  type UpdatePasswordRequest,
  ApprovalSettingsSchema,
  ApprovalRulesResponseSchema,
  ApprovalRuleResponseSchema,
  PendingApprovalsResponseSchema,
  ApprovalLogResponseSchema,
  type ApprovalSettings,
  type ApprovalRule,
  type CreateApprovalRule,
  type UpdateApprovalRule,
  type OAuthProvider,
  CreateServiceTokenResponseSchema,
  ListServiceTokensResponseSchema,
  type CreateServiceTokenRequest,
  type CreateServiceTokenResponse,
  type ListServiceTokensResponse,
  type PendingApprovalsResponse,
  type ApprovalLogResponse,
  type ModeResponse,
  type AutonomyMode,
  PreferencesResponseSchema,
  type PreferencesResponse,
  type UserPreferences,
  ListWebhooksResponseSchema,
  ListWebhookDeliveriesResponseSchema,
  WebhookResponseSchema,
  WebhookSecretResponseSchema,
  WebhookDeliveryResponseSchema,
  type ListWebhooksResponse,
  type ListWebhookDeliveriesResponse,
  type WebhookCreateRequest,
  type WebhookResponse,
  type WebhookSecretResponse,
  type WebhookDeliveryResponse,
  type WebhookUpdateRequest,
  ListInboundSourcesResponseSchema,
  ListInboundDeliveriesResponseSchema,
  InboundSourceResponseSchema,
  InboundSecretResponseSchema,
  type ListInboundSourcesResponse,
  type ListInboundDeliveriesResponse,
  type InboundSourceResponse,
  type InboundSecretResponse,
  type InboundSourceCreateRequest,
  type InboundSourceUpdateRequest,
  BackupSummarySchema,
  type BackupSummary,
  BackupStatusSchema,
  type BackupStatus,
  ImportPreviewSchema,
  type ImportPreview,
  ImportResultSchema,
  type ImportResult,
  ChatCommandResponseSchema,
  type ChatCommandResponse,
  ChatPreviewResponseSchema,
  type ChatPreviewResponse,
  ChatUndoResponseSchema,
  type ChatUndoResponse,
} from '@midnite/shared';
import { z } from 'zod';

const JSON_HEADERS = { 'content-type': 'application/json' } as const;

let _accessToken: string | null = null;

/** Set the JWT access token used for all authenticated gateway requests. */
export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

/** Get the current access token (for use in direct fetch calls). */
export function getAccessToken(): string | null {
  return _accessToken;
}

export function gatewayUrl(): string {
  if (typeof window === 'undefined') {
    return process.env['NEXT_PUBLIC_GATEWAY_URL'] ?? 'http://localhost:7777';
  }
  return (
    (window as unknown as { __NEXT_PUBLIC_GATEWAY_URL?: string })
      .__NEXT_PUBLIC_GATEWAY_URL ??
    process.env['NEXT_PUBLIC_GATEWAY_URL'] ??
    'http://localhost:7777'
  );
}

/** Gateway origin as a WebSocket URL (scheme swapped from {@link gatewayUrl}). */
export function gatewayWsUrl(): string {
  return gatewayUrl().replace(/^http/, 'ws');
}

/**
 * A failed gateway request. Carries the HTTP `status` so callers can branch on it
 * (e.g. a 409 phase-doc conflict → "reload and retry"); `message` is the
 * human-readable gateway error, unchanged from the previous plain-`Error` throw.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// The schema is typed structurally by its `parse` return so T is inferred from the
// zod OUTPUT type (where `.default()` fields are required), not the input type.
async function fetchJson<T>(
  path: string,
  init?: RequestInit,
  schema?: { parse: (value: unknown) => T },
): Promise<T> {
  const mergedHeaders: Record<string, string> = {};
  if (_accessToken) mergedHeaders['authorization'] = `Bearer ${_accessToken}`;
  const extraHeaders = init?.headers as Record<string, string> | undefined;
  if (extraHeaders) Object.assign(mergedHeaders, extraHeaders);
  const res = await fetch(`${gatewayUrl()}${path}`, {
    cache: 'no-store',
    ...init,
    headers: mergedHeaders,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(errorMessage(res, text), res.status);
  }
  const body = (await res.json()) as unknown;
  return schema ? schema.parse(body) : (body as T);
}

/**
 * Turn a failed response into a readable message. The gateway (Nest) sends errors
 * as `{ statusCode, message, error }`, so surface `message` — a string, or an array
 * of strings for validation errors — rather than dumping the raw JSON blob at the
 * user. Falls back to the status line for empty/non-JSON bodies.
 */
function errorMessage(res: Response, text: string): string {
  if (text) {
    try {
      const parsed = JSON.parse(text) as { message?: unknown };
      if (typeof parsed.message === 'string' && parsed.message) return parsed.message;
      if (Array.isArray(parsed.message) && parsed.message.length > 0) {
        return parsed.message.join(', ');
      }
    } catch {
      // Not JSON — fall through to the raw text below.
    }
    return text;
  }
  return `${res.status} ${res.statusText}`;
}

export async function pingAgent(): Promise<AgentPingResponse> {
  return fetchJson('/agents/ping', { method: 'POST' }, AgentPingResponseSchema);
}

/** Liveness probe for the gateway (`GET /health` → `{ ok: true }`). */
export async function getHealth(signal?: AbortSignal): Promise<{ ok: boolean }> {
  return fetchJson('/health', { signal }, z.object({ ok: z.boolean() }));
}

/**
 * Fetch a health report that returns **503 with a valid body** when unhealthy
 * (readiness / preflight, Phase 54). A 200 or 503 both carry the report and are
 * parsed; anything else (500, network) throws like a normal request.
 */
async function fetchHealthReport<T>(
  path: string,
  schema: { parse: (v: unknown) => T },
  signal?: AbortSignal,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (_accessToken) headers['authorization'] = `Bearer ${_accessToken}`;
  const res = await fetch(`${gatewayUrl()}${path}`, { cache: 'no-store', signal, headers });
  if (!res.ok && res.status !== 503) {
    const text = await res.text().catch(() => '');
    throw new ApiError(errorMessage(res, text), res.status);
  }
  return schema.parse((await res.json()) as unknown);
}

/** Readiness (`GET /health/ready`, Phase 54 B) — live DB/pool/scheduler/spawner checks. */
export async function getReadiness(signal?: AbortSignal): Promise<Readiness> {
  return fetchHealthReport('/health/ready', ReadinessSchema, signal);
}

/** Boot preflight, re-run live (`GET /health/preflight`, Phase 54 F) — the full check set. */
export async function getPreflight(signal?: AbortSignal): Promise<PreflightReport> {
  return fetchHealthReport('/health/preflight', PreflightReportSchema, signal);
}

export async function getTaskCounts(): Promise<TaskCounts> {
  return fetchJson('/tasks/counts', undefined, TaskCountsSchema);
}

/**
 * Board/list task fetch (Phase 57 C) — `GET /tasks` now returns lean
 * `TaskSummary` **pages**. This unwraps to the item array (the board loads all
 * columns); use {@link listTaskSummaries} when you need the `total` or a page.
 * For the full task (events/prompt/all attachments), use {@link getTask}.
 */
export async function getTasks(): Promise<TaskSummary[]> {
  return (await fetchJson('/tasks', undefined, TasksPageSchema)).items;
}

/** Recent cross-task activity feed (Phase 57 C) — served from a single indexed
 *  query, replacing the dashboard hydrating every task's events. */
export async function getTaskActivity(limit?: number): Promise<TaskActivityEntry[]> {
  const suffix = limit ? `?limit=${limit}` : '';
  return fetchJson(`/tasks/activity${suffix}`, undefined, TaskActivityResponseSchema);
}

/** A page of task summaries + the full filtered `total` (Phase 57 C). */
export async function listTaskSummaries(query?: TaskListQuery): Promise<{ items: TaskSummary[]; total: number }> {
  const qs = new URLSearchParams();
  if (query?.status) qs.set('status', query.status);
  if (query?.projectId) qs.set('projectId', query.projectId);
  if (query?.page) qs.set('page', String(query.page));
  if (query?.limit) qs.set('limit', String(query.limit));
  const suffix = qs.toString() ? `?${qs}` : '';
  return fetchJson(`/tasks${suffix}`, undefined, TasksPageSchema);
}

/** Phase 58 A — the dependency graph (optionally scoped to one project, and — Phase
 *  58 F — one milestone within it). Bounded; check `graph.truncated` /
 *  `graph.totalCount` before assuming it's complete. */
export async function getTaskGraph(
  projectId?: string,
  milestoneId?: string,
  signal?: AbortSignal,
): Promise<TaskGraph> {
  const params = new URLSearchParams();
  if (projectId) params.set('projectId', projectId);
  if (milestoneId) params.set('milestoneId', milestoneId);
  const qs = params.toString();
  const res = await fetchJson(`/tasks/graph${qs ? `?${qs}` : ''}`, { signal }, TaskGraphResponseSchema);
  return res.graph;
}

// ── Chat to board (Phase 59) ────────────────────────────────────────────────────

/**
 * Phase 59 C — ask the board a read-only question. Returns a prose answer + the
 * matching task refs (for deep-links) + the inference path used (cost line).
 * Never mutates.
 */
export async function chatQuery(text: string, signal?: AbortSignal): Promise<ChatQueryAnswer> {
  const res = await fetchJson(
    '/chat/query',
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ text }), signal },
    ChatQueryResponseSchema,
  );
  return res.answer;
}

/** Parse a natural-language command and describe what it would do (no write). */
export async function previewChatCommand(text: string, signal?: AbortSignal): Promise<ChatPreviewResponse> {
  return fetchJson(
    '/chat/preview',
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ text }), signal },
    ChatPreviewResponseSchema,
  );
}

/**
 * Parse and execute a natural-language board command. A mutating command only
 * writes when `confirm` is true; otherwise the result comes back
 * `confirmation: 'confirm'` and nothing changed (Phase 59 F seatbelt).
 */
export async function runChatCommand(
  text: string,
  confirm = false,
  signal?: AbortSignal,
): Promise<ChatCommandResponse> {
  return fetchJson(
    '/chat/command',
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ text, confirm }), signal },
    ChatCommandResponseSchema,
  );
}

/** Undo a previously executed chat command by its undo token (Phase 59 F). */
export async function undoChatCommand(undoToken: string, signal?: AbortSignal): Promise<ChatUndoResponse> {
  return fetchJson(
    '/chat/undo',
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ undoToken }), signal },
    ChatUndoResponseSchema,
  );
}

// ── Roadmap milestones (Phase 58 D) ─────────────────────────────────────────

/** A project's milestones, ordered by position. */
export async function listMilestones(projectId: string): Promise<Milestone[]> {
  return fetchJson(`/projects/${encodeURIComponent(projectId)}/milestones`, undefined, z.array(MilestoneSchema));
}

/** The project roadmap — milestones (with computed progress + tasks) + backlog. */
export async function getRoadmap(projectId: string, signal?: AbortSignal): Promise<RoadmapView> {
  const res = await fetchJson(
    `/projects/${encodeURIComponent(projectId)}/roadmap`,
    { signal },
    RoadmapResponseSchema,
  );
  return res.roadmap;
}

export async function createMilestone(projectId: string, body: CreateMilestoneRequest): Promise<Milestone> {
  const res = await fetchJson(
    `/projects/${encodeURIComponent(projectId)}/milestones`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) },
    MilestoneResponseSchema,
  );
  return res.milestone;
}

export async function updateMilestone(id: string, body: UpdateMilestoneRequest): Promise<Milestone> {
  const res = await fetchJson(
    `/milestones/${encodeURIComponent(id)}`,
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(body) },
    MilestoneResponseSchema,
  );
  return res.milestone;
}

export async function deleteMilestone(id: string): Promise<void> {
  await fetchJson(`/milestones/${encodeURIComponent(id)}`, { method: 'DELETE' }, z.object({ ok: z.literal(true) }));
}

/** Reorder a project's milestones — pass every current milestone id exactly once. */
export async function reorderMilestones(projectId: string, milestoneIds: string[]): Promise<Milestone[]> {
  return fetchJson(
    `/projects/${encodeURIComponent(projectId)}/milestones/reorder`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ milestoneIds }) },
    z.array(MilestoneSchema),
  );
}

/** Assign (or unassign, with null) a task to a milestone. */
export async function assignTaskMilestone(taskId: string, milestoneId: string | null): Promise<Task> {
  return fetchJson(
    `/tasks/${encodeURIComponent(taskId)}/milestone`,
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify({ milestoneId }) },
    TaskSchema,
  );
}

// ── Outbound webhooks (Phase 44) ────────────────────────────────────────────────

/** List the team's webhook endpoints (secrets never included). */
export async function listWebhooks(): Promise<ListWebhooksResponse> {
  return fetchJson('/webhooks', undefined, ListWebhooksResponseSchema);
}

/** Create an endpoint — the response carries the signing secret exactly once. */
export async function createWebhook(body: WebhookCreateRequest): Promise<WebhookSecretResponse> {
  return fetchJson(
    '/webhooks',
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) },
    WebhookSecretResponseSchema,
  );
}

/** Update an endpoint (url / provider / event filter / enabled). */
export async function updateWebhook(
  id: string,
  body: WebhookUpdateRequest,
): Promise<WebhookResponse> {
  return fetchJson(
    `/webhooks/${encodeURIComponent(id)}`,
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(body) },
    WebhookResponseSchema,
  );
}

/** Delete an endpoint. */
export async function deleteWebhook(id: string): Promise<void> {
  await fetchJson(`/webhooks/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** Rotate the signing secret — the new secret is returned exactly once. */
export async function rotateWebhookSecret(id: string): Promise<WebhookSecretResponse> {
  return fetchJson(
    `/webhooks/${encodeURIComponent(id)}/rotate`,
    { method: 'POST', headers: JSON_HEADERS },
    WebhookSecretResponseSchema,
  );
}

/** Recent delivery attempts for one endpoint (Phase 44 Theme D). Any team member. */
export async function listWebhookDeliveries(id: string): Promise<ListWebhookDeliveriesResponse> {
  return fetchJson(
    `/webhooks/${encodeURIComponent(id)}/deliveries`,
    undefined,
    ListWebhookDeliveriesResponseSchema,
  );
}

/** Fire a synthetic `task.updated` at the endpoint to confirm wiring (team-admin). */
export async function sendWebhookTest(id: string): Promise<WebhookDeliveryResponse> {
  return fetchJson(
    `/webhooks/${encodeURIComponent(id)}/test`,
    { method: 'POST', headers: JSON_HEADERS },
    WebhookDeliveryResponseSchema,
  );
}

/** Re-fire a recorded delivery's stored payload (faithful replay; team-admin). */
export async function redeliverWebhook(
  id: string,
  deliveryId: string,
): Promise<WebhookDeliveryResponse> {
  return fetchJson(
    `/webhooks/${encodeURIComponent(id)}/deliveries/${encodeURIComponent(deliveryId)}/redeliver`,
    { method: 'POST', headers: JSON_HEADERS },
    WebhookDeliveryResponseSchema,
  );
}

// --- Inbound integrations (Phase 46) ---

/** List the team's inbound sources (secrets never included). */
export async function listInboundSources(): Promise<ListInboundSourcesResponse> {
  return fetchJson('/integrations/inbound', undefined, ListInboundSourcesResponseSchema);
}

/** Create an inbound source — the response carries the signing secret exactly once. */
export async function createInboundSource(
  body: InboundSourceCreateRequest,
): Promise<InboundSecretResponse> {
  return fetchJson(
    '/integrations/inbound',
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) },
    InboundSecretResponseSchema,
  );
}

/** Update an inbound source (provider / event filter / default routing / enabled). */
export async function updateInboundSource(
  id: string,
  body: InboundSourceUpdateRequest,
): Promise<InboundSourceResponse> {
  return fetchJson(
    `/integrations/inbound/${encodeURIComponent(id)}`,
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(body) },
    InboundSourceResponseSchema,
  );
}

/** Delete an inbound source. */
export async function deleteInboundSource(id: string): Promise<void> {
  await fetchJson(`/integrations/inbound/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** Recent received events for one source (Theme D deliveries log). */
export async function listInboundDeliveries(id: string): Promise<ListInboundDeliveriesResponse> {
  return fetchJson(
    `/integrations/inbound/${encodeURIComponent(id)}/deliveries`,
    undefined,
    ListInboundDeliveriesResponseSchema,
  );
}

/** Rotate the signing secret — the new secret is returned exactly once. */
export async function rotateInboundSecret(id: string): Promise<InboundSecretResponse> {
  return fetchJson(
    `/integrations/inbound/${encodeURIComponent(id)}/rotate`,
    { method: 'POST', headers: JSON_HEADERS },
    InboundSecretResponseSchema,
  );
}

/** Current user's synced preferences (Phase 43). Authed-only — 401 when signed out. */
export async function getPreferences(signal?: AbortSignal): Promise<PreferencesResponse> {
  return fetchJson('/users/me/preferences', { signal }, PreferencesResponseSchema);
}

/** Replace the current user's preferences (full-object PUT). */
export async function putPreferences(prefs: UserPreferences): Promise<PreferencesResponse> {
  return fetchJson(
    '/users/me/preferences',
    { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(prefs) },
    PreferencesResponseSchema,
  );
}

/** Single task by id (`GET /tasks/:id`); throws on a 404 for an unknown id. */
export async function getTask(id: string, signal?: AbortSignal): Promise<Task> {
  return fetchJson(`/tasks/${encodeURIComponent(id)}`, { signal }, TaskSchema);
}

export async function createTask(form: FormData): Promise<CreateTaskResponse> {
  return fetchJson(
    '/tasks',
    { method: 'POST', body: form, cache: 'no-store' },
    CreateTaskResponseSchema,
  );
}

/**
 * Create many tasks from one pasted blob (Phase 16). Sends the raw text so the
 * gateway re-parses it with the same `parseBulkLines` the preview uses — one
 * coalesced `tasks.bulkCreated` board event lands for the whole batch. Partial
 * failure is first-class: the response carries a per-line result row + counts.
 */
export async function createBulk(body: BulkCreateTaskRequest): Promise<BulkCreateTaskResponse> {
  return fetchJson(
    '/tasks/bulk',
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) },
    BulkCreateTaskResponseSchema,
  );
}

export async function updateTaskStatus(id: string, status: Status): Promise<Task> {
  return fetchJson(
    `/tasks/${encodeURIComponent(id)}/status`,
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify({ status }) },
    TaskSchema,
  );
}

/** Manually kick off an agent run for a task (todo/backlog → wip + session).
 *  Rejects (409) when no agent slot is free or the task isn't startable. */
export async function startTask(id: string): Promise<Task> {
  // No request body — and crucially no JSON content-type header: Fastify rejects
  // a POST that declares `application/json` but sends an empty body with a 400
  // ("Body cannot be empty …").
  return fetchJson(`/tasks/${encodeURIComponent(id)}/start`, { method: 'POST' }, TaskSchema);
}

/** Stop a running task: interrupt the agent (Ctrl+C) and return it to the queue
 *  (→ `to`, default todo), idling its session. Rejects (409) if it isn't running. */
export async function stopTask(id: string, to: 'todo' | 'backlog' = 'todo'): Promise<Task> {
  return fetchJson(
    `/tasks/${encodeURIComponent(id)}/stop?to=${to}`,
    { method: 'POST' },
    TaskSchema,
  );
}

/** Resolve a needs-attention task (Phase 53 D): requeue (→todo), re-plan (requeue
 *  with a fresh prompt), or abandon (explicit terminal). */
export async function resolveTask(
  id: string,
  action: ResolveTaskAction,
  prompt?: string,
): Promise<Task> {
  return fetchJson(
    `/tasks/${encodeURIComponent(id)}/resolve`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ action, prompt }) },
    TaskSchema,
  );
}

/** A task's failure history, oldest-first (Phase 53 E). */
export async function fetchTaskFailures(id: string): Promise<TaskFailure[]> {
  const { failures } = await fetchJson(
    `/tasks/${encodeURIComponent(id)}/failures`,
    undefined,
    TaskFailuresResponseSchema,
  );
  return failures;
}

/** Recent failures across tasks, newest-first (Phase 53 E). */
export async function fetchRecentFailures(opts?: {
  class?: FailureClass;
  limit?: number;
}): Promise<TaskFailure[]> {
  const qs = new URLSearchParams();
  if (opts?.class) qs.set('class', opts.class);
  if (opts?.limit != null) qs.set('limit', String(opts.limit));
  const q = qs.toString();
  const { failures } = await fetchJson(
    `/tasks/failures${q ? `?${q}` : ''}`,
    undefined,
    TaskFailuresResponseSchema,
  );
  return failures;
}

/** The task-health "what's wedged?" report (Phase 53 E). */
export async function fetchTasksDoctor(): Promise<TasksDoctorReport> {
  return fetchJson('/tasks/doctor', undefined, TasksDoctorReportSchema);
}

export async function updateTaskProject(
  taskId: string,
  projectId: string | null,
): Promise<Task> {
  return fetchJson(
    `/tasks/${encodeURIComponent(taskId)}/project`,
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify({ projectId }) },
    TaskSchema,
  );
}

export async function setTaskTags(taskId: string, tags: string[]): Promise<Task> {
  return fetchJson(
    `/tasks/${encodeURIComponent(taskId)}/tags`,
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify({ tags }) },
    TaskSchema,
  );
}

export async function addTaskLink(taskId: string, url: string, label?: string): Promise<Task> {
  return fetchJson(
    `/tasks/${encodeURIComponent(taskId)}/links`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ url, label }) },
    TaskSchema,
  );
}

export async function removeTaskLink(taskId: string, linkId: string): Promise<Task> {
  return fetchJson(
    `/tasks/${encodeURIComponent(taskId)}/links/${encodeURIComponent(linkId)}`,
    { method: 'DELETE' },
    TaskSchema,
  );
}

/** Add a blocker edge (Phase 27). The gateway 400s a self-ref/unknown blocker and
 *  409s an edge that would close a cycle — `fetchJson` throws with the message. */
export async function addTaskDependency(taskId: string, dependsOnId: string): Promise<Task> {
  return fetchJson(
    `/tasks/${encodeURIComponent(taskId)}/dependencies`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ dependsOnId }) },
    TaskSchema,
  );
}

export async function removeTaskDependency(taskId: string, dependsOnId: string): Promise<Task> {
  return fetchJson(
    `/tasks/${encodeURIComponent(taskId)}/dependencies/${encodeURIComponent(dependsOnId)}`,
    { method: 'DELETE' },
    TaskSchema,
  );
}

// Permanent delete — the gateway rejects this unless the task is archived.
export async function deleteTask(id: string): Promise<void> {
  await fetchJson(`/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** Trigger an on-demand PR status refresh for a task. Returns the updated task. */
export async function refreshPrStatus(id: string): Promise<Task> {
  return fetchJson(
    `/tasks/${encodeURIComponent(id)}/pr/refresh`,
    { method: 'POST' },
    TaskSchema,
  );
}

/**
 * Fetch the structured diff for a task's GitHub PR (Phase 52 Theme A). The
 * gateway fails open: a 404 means no PR / unknown task, a 503 means the fetch
 * failed (render a retry banner + "Open on GitHub"). Backs the review viewer.
 */
export async function getPrDiff(id: string, signal?: AbortSignal): Promise<PrDiff> {
  return fetchJson(`/tasks/${encodeURIComponent(id)}/pr/diff`, { signal }, PrDiffSchema);
}

/** Submit a review (approve / request-changes / comment). Inline comments are
 *  sourced from the task's persisted drafts server-side (Phase 52 D), so only the
 *  event + optional body are sent. Returns the re-hydrated task. */
export async function submitPrReview(
  id: string,
  submission: Pick<PrReviewSubmission, 'event' | 'body'>,
): Promise<Task> {
  return fetchJson(
    `/tasks/${encodeURIComponent(id)}/pr/review`,
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(submission) },
    TaskSchema,
  );
}

// --- Inline review comment drafts (Phase 52 D) ---

export async function listPrDrafts(id: string, signal?: AbortSignal): Promise<PrReviewDraft[]> {
  const res = await fetchJson(
    `/tasks/${encodeURIComponent(id)}/pr/review/comments`,
    { signal },
    PrReviewDraftsResponseSchema,
  );
  return res.drafts;
}

export async function createPrDraft(id: string, draft: CreatePrReviewDraft): Promise<PrReviewDraft> {
  return fetchJson(
    `/tasks/${encodeURIComponent(id)}/pr/review/comments`,
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(draft) },
    PrReviewDraftSchema,
  );
}

export async function updatePrDraft(id: string, commentId: string, body: string): Promise<PrReviewDraft> {
  return fetchJson(
    `/tasks/${encodeURIComponent(id)}/pr/review/comments/${encodeURIComponent(commentId)}`,
    { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body }) },
    PrReviewDraftSchema,
  );
}

export async function deletePrDraft(id: string, commentId: string): Promise<void> {
  await fetchJson(`/tasks/${encodeURIComponent(id)}/pr/review/comments/${encodeURIComponent(commentId)}`, {
    method: 'DELETE',
  });
}

/** Merge a task's PR with the given method (default squash). Honors branch
 *  protection — a refusal surfaces as an ApiError. Returns the re-hydrated task. */
export async function mergePr(id: string, method: PrMergeMethod = 'squash'): Promise<Task> {
  return fetchJson(
    `/tasks/${encodeURIComponent(id)}/pr/merge`,
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ method }) },
    TaskSchema,
  );
}

// --- Guardrails: kill switch & pause (Phase 50 A) ---

/** Current guardrail (pause) state. Open to any authenticated client (the board
 *  shows a paused banner to everyone); changing it is admin-only. */
export async function getGuardrails(signal?: AbortSignal): Promise<GuardrailSettings> {
  const res = await fetchJson('/guardrails', { signal }, GuardrailsResponseSchema);
  return res.guardrails;
}

/** Phase 56 A — the live realtime event-ring size (open read). */
export async function getWsSettings(signal?: AbortSignal): Promise<number> {
  const res = await fetchJson('/ws/settings', { signal }, WsSettingsResponseSchema);
  return res.settings.ringSize;
}

/** Retune the event-ring size (admin). Returns the applied size. */
export async function updateWsSettings(ringSize: WsRingSize): Promise<number> {
  const res = await fetchJson(
    '/ws/settings',
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify({ ringSize }) },
    WsSettingsResponseSchema,
  );
  return res.settings.ringSize;
}

/** Phase 56 C — realtime transport health counters (open read; drives the future connection-status UI). */
export async function getWsMetrics(signal?: AbortSignal): Promise<WsMetrics> {
  const res = await fetchJson('/ws/metrics', { signal }, WsMetricsResponseSchema);
  return res.metrics;
}

/** The configured safety caps + policy mode + protected-actions (read-only,
 *  Phase 50 F/E). Null when an older gateway doesn't return the caps block. */
export async function getGuardrailCaps(signal?: AbortSignal): Promise<GuardrailCaps | null> {
  const res = await fetchJson('/guardrails', { signal }, GuardrailsResponseSchema);
  return res.caps ?? null;
}

/** Pause or resume a scope (soft — running agents finish). Admin-only. */
export async function pauseGuardrails(scope: PauseScope, paused: boolean): Promise<GuardrailSettings> {
  const res = await fetchJson(
    '/guardrails/pause',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scope, paused }),
    },
    GuardrailsResponseSchema,
  );
  return res.guardrails;
}

/** Emergency stop: pause a scope AND abort its in-flight agents (requeued). Admin-only. */
export async function emergencyStopGuardrails(scope: PauseScope): Promise<GuardrailSettings> {
  const res = await fetchJson(
    '/guardrails/emergency-stop',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scope }),
    },
    GuardrailsResponseSchema,
  );
  return res.guardrails;
}

/**
 * Trigger a manual quality-gate check run for a task (Phase 30 Theme D).
 * Returns a no-op stub (passed, zero results) when checks are disabled or
 * the task has no configured checks.
 */
export async function triggerCheck(taskId: string): Promise<TriggerCheckResponse> {
  return fetchJson(
    `/tasks/${encodeURIComponent(taskId)}/check`,
    { method: 'POST' },
    TriggerCheckResponseSchema,
  );
}

/** Return all check runs for a task, oldest-first (Phase 30 Theme D). */
export async function getCheckRuns(taskId: string): Promise<CheckRunListResponse> {
  return fetchJson(
    `/tasks/${encodeURIComponent(taskId)}/check-runs`,
    undefined,
    CheckRunListResponseSchema,
  );
}

export async function getSessions(): Promise<SessionSummary[]> {
  return fetchJson('/sessions', undefined, z.array(SessionSummarySchema));
}

/** Who's currently in the office (team-scoped roll-up; Phase 64 F). */
export async function getPresenceSummary(signal?: AbortSignal): Promise<PresenceSummary> {
  return fetchJson('/presence/summary', signal ? { signal } : undefined, PresenceSummarySchema);
}

/** One session's detail (`GET /sessions/:id`); throws on a 404 for an unknown id. */
export async function getSession(id: string, signal?: AbortSignal): Promise<SessionDetail> {
  return fetchJson(`/sessions/${encodeURIComponent(id)}`, { signal }, SessionDetailSchema);
}

export async function getSessionTranscript(
  projectSlug: string,
  id: string,
): Promise<SessionTranscript> {
  const path = `/sessions/${encodeURIComponent(projectSlug)}/${encodeURIComponent(id)}/transcript`;
  return fetchJson(path, undefined, SessionTranscriptSchema);
}

export async function mintTerminalToken(sessionId: string): Promise<TerminalTokenResponse> {
  return fetchJson(
    `/sessions/${encodeURIComponent(sessionId)}/terminal-token`,
    { method: 'POST' },
    TerminalTokenResponseSchema,
  );
}

export async function archiveSession(id: string): Promise<SessionSummary> {
  return fetchJson(
    `/sessions/${encodeURIComponent(id)}/archive`,
    { method: 'POST' },
    SessionSummarySchema,
  );
}

export async function unarchiveSession(id: string): Promise<SessionSummary> {
  return fetchJson(
    `/sessions/${encodeURIComponent(id)}/unarchive`,
    { method: 'POST' },
    SessionSummarySchema,
  );
}

// Permanent delete — the gateway rejects this unless the session is archived.
export async function deleteSession(id: string): Promise<void> {
  await fetchJson(`/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function getProjects(): Promise<Project[]> {
  return fetchJson('/projects', undefined, z.array(ProjectSchema));
}

export async function getProject(id: string): Promise<Project> {
  return fetchJson(`/projects/${encodeURIComponent(id)}`, undefined, ProjectSchema);
}

// Lists subdirectories of `path` on the gateway host (home dir when omitted).
// Backs the folder picker; paths are exchanged in `~`-form.
export async function browseDirectory(path?: string): Promise<BrowseDirResponse> {
  const query = path ? `?path=${encodeURIComponent(path)}` : '';
  return fetchJson(`/fs/dirs${query}`, undefined, BrowseDirResponseSchema);
}

// Creates `path` on the gateway host (recursively) and returns its listing.
// Backs the folder picker's "create folder" option; paths are in `~`-form.
export async function createDirectory(path: string): Promise<BrowseDirResponse> {
  return fetchJson(
    '/fs/dirs',
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ path }) },
    BrowseDirResponseSchema,
  );
}

export async function createProject(body: CreateProjectRequest): Promise<Project> {
  const { project } = await fetchJson(
    '/projects',
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) },
    ProjectResponseSchema,
  );
  return project;
}

export async function updateProject(
  id: string,
  body: UpdateProjectRequest,
): Promise<Project> {
  const { project } = await fetchJson(
    `/projects/${encodeURIComponent(id)}`,
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(body) },
    ProjectResponseSchema,
  );
  return project;
}

export async function deleteProject(id: string): Promise<void> {
  await fetchJson(`/projects/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// --- Repos (the DB-backed repo registry) ---

export async function getRepos(): Promise<Repo[]> {
  return fetchJson('/repos', undefined, z.array(RepoSchema));
}

export async function createRepo(body: CreateRepoRequest): Promise<Repo> {
  const { repo } = await fetchJson(
    '/repos',
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) },
    RepoResponseSchema,
  );
  return repo;
}

export async function updateRepo(id: string, body: UpdateRepoRequest): Promise<Repo> {
  const { repo } = await fetchJson(
    `/repos/${encodeURIComponent(id)}`,
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(body) },
    RepoResponseSchema,
  );
  return repo;
}

export async function deleteRepo(id: string): Promise<void> {
  await fetchJson(`/repos/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// --- Phase docs (GitHub-backed `.midnite/phases/*.md`, scoped to a project) ---
// The GitHub target is the explicitly-picked `repoId`, not stored on the project.

function phaseDocsPath(projectId: string, repoId: string, filename?: string): string {
  const base = `/projects/${encodeURIComponent(projectId)}/phase-docs`;
  const file = filename ? `/${encodeURIComponent(filename)}` : '';
  return `${base}${file}?repoId=${encodeURIComponent(repoId)}`;
}

export async function listPhaseDocs(projectId: string, repoId: string): Promise<PhaseDoc[]> {
  const { docs } = await fetchJson(
    phaseDocsPath(projectId, repoId),
    undefined,
    PhaseDocsResponseSchema,
  );
  return docs;
}

export async function getPhaseDoc(
  projectId: string,
  repoId: string,
  filename: string,
): Promise<PhaseDoc> {
  const { doc } = await fetchJson(
    phaseDocsPath(projectId, repoId, filename),
    undefined,
    PhaseDocResponseSchema,
  );
  return doc;
}

export async function createPhaseDoc(
  projectId: string,
  repoId: string,
  body: CreatePhaseDocRequest,
): Promise<PhaseDoc> {
  const { doc } = await fetchJson(
    phaseDocsPath(projectId, repoId),
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) },
    PhaseDocResponseSchema,
  );
  return doc;
}

export async function updatePhaseDoc(
  projectId: string,
  repoId: string,
  filename: string,
  body: UpdatePhaseDocRequest,
): Promise<PhaseDoc> {
  const { doc } = await fetchJson(
    phaseDocsPath(projectId, repoId, filename),
    { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(body) },
    PhaseDocResponseSchema,
  );
  return doc;
}

export async function deletePhaseDoc(
  projectId: string,
  repoId: string,
  filename: string,
  sha: string,
): Promise<void> {
  await fetchJson(`${phaseDocsPath(projectId, repoId, filename)}&sha=${encodeURIComponent(sha)}`, {
    method: 'DELETE',
  });
}

// --- Memories (markdown knowledge entries, global or project-scoped) ---

export async function getMemories(): Promise<Memory[]> {
  const { memories } = await fetchJson('/memories', undefined, MemoriesResponseSchema);
  return memories;
}

export async function getMemory(id: string): Promise<Memory> {
  const { memory } = await fetchJson(
    `/memories/${encodeURIComponent(id)}`,
    undefined,
    MemoryResponseSchema,
  );
  return memory;
}

export async function createMemory(body: CreateMemoryRequest): Promise<Memory> {
  const { memory } = await fetchJson(
    '/memories',
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) },
    MemoryResponseSchema,
  );
  return memory;
}

export async function updateMemory(id: string, body: UpdateMemoryRequest): Promise<Memory> {
  const { memory } = await fetchJson(
    `/memories/${encodeURIComponent(id)}`,
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(body) },
    MemoryResponseSchema,
  );
  return memory;
}

export async function deleteMemory(id: string): Promise<void> {
  await fetchJson(`/memories/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function addMemorySource(id: string, url: string): Promise<Memory> {
  const { memory } = await fetchJson(
    `/memories/${encodeURIComponent(id)}/sources`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ url }) },
    MemoryResponseSchema,
  );
  return memory;
}

export async function removeMemorySource(id: string, sourceId: string): Promise<Memory> {
  const { memory } = await fetchJson(
    `/memories/${encodeURIComponent(id)}/sources/${encodeURIComponent(sourceId)}`,
    { method: 'DELETE' },
    MemoryResponseSchema,
  );
  return memory;
}

export async function reorderMemorySources(id: string, sourceIds: string[]): Promise<Memory> {
  const { memory } = await fetchJson(
    `/memories/${encodeURIComponent(id)}/sources/reorder`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ sourceIds }) },
    MemoryResponseSchema,
  );
  return memory;
}

/** Upload a file (PDF / Markdown / text) as a memory source (Phase 65 B). */
export async function uploadMemorySourceFile(id: string, file: File): Promise<Memory> {
  const form = new FormData();
  form.append('file', file);
  const { memory } = await fetchJson(
    `/memories/${encodeURIComponent(id)}/sources/file`,
    { method: 'POST', body: form },
    MemoryResponseSchema,
  );
  return memory;
}

/** Re-run ingestion (URL re-fetch / file re-extract) for a memory source. */
export async function reingestMemorySource(id: string, sourceId: string): Promise<Memory> {
  const { memory } = await fetchJson(
    `/memories/${encodeURIComponent(id)}/sources/${encodeURIComponent(sourceId)}/reingest`,
    { method: 'POST' },
    MemoryResponseSchema,
  );
  return memory;
}

// ── Memory Studio artifacts (Phase 65 D) ──────────────────────────
/** List a memory's Studio artifacts (poll this for generation status). */
export async function getMemoryArtifacts(id: string): Promise<MemoryArtifact[]> {
  const { artifacts } = await fetchJson(
    `/memories/${encodeURIComponent(id)}/artifacts`,
    undefined,
    MemoryArtifactsResponseSchema,
  );
  return artifacts;
}

/** Kick generation of an artifact kind; returns the pending row to poll on. */
export async function generateMemoryArtifact(
  id: string,
  kind: MemoryArtifactKind,
): Promise<MemoryArtifact> {
  const { artifact } = await fetchJson(
    `/memories/${encodeURIComponent(id)}/artifacts`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ kind }) },
    MemoryArtifactResponseSchema,
  );
  return artifact;
}

export async function deleteMemoryArtifact(id: string, artifactId: string): Promise<void> {
  await fetchJson(`/memories/${encodeURIComponent(id)}/artifacts/${encodeURIComponent(artifactId)}`, {
    method: 'DELETE',
  });
}

/** The memory's chat thread (Phase 65 C), oldest first. */
export async function getMemoryChat(id: string): Promise<MemoryChatMessage[]> {
  const { messages } = await fetchJson(
    `/memories/${encodeURIComponent(id)}/chat`,
    undefined,
    MemoryChatHistoryResponseSchema,
  );
  return messages;
}

/** Ask a question of the memory; returns the appended user + assistant turns. */
export async function postMemoryChat(id: string, message: string): Promise<PostMemoryChatResponse> {
  return fetchJson(
    `/memories/${encodeURIComponent(id)}/chat`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ message }) },
    PostMemoryChatResponseSchema,
  );
}

/** Direct URL to a file-backed artifact's media (audio/video), for an `<audio>`/`<video>` src. */
export function memoryArtifactFileUrl(id: string, artifactId: string): string {
  return `${gatewayUrl()}/memories/${encodeURIComponent(id)}/artifacts/${encodeURIComponent(artifactId)}/file`;
}

export async function enhanceProjectDescription(input: {
  name?: string;
  description: string;
}): Promise<string> {
  const { description } = await fetchJson(
    '/projects/ai/enhance-description',
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(input) },
    EnhanceDescriptionResponseSchema,
  );
  return description;
}

export async function draftProjectPlan(id: string): Promise<DraftPlanResponse> {
  return fetchJson(
    `/projects/${encodeURIComponent(id)}/draft-plan`,
    { method: 'POST' },
    DraftPlanResponseSchema,
  );
}

export async function updateProjectPlan(id: string, plan: string): Promise<Project> {
  const { project } = await fetchJson(
    `/projects/${encodeURIComponent(id)}/plan`,
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify({ plan }) },
    ProjectResponseSchema,
  );
  return project;
}

export async function createTasksFromPlan(id: string, titles: string[]): Promise<Task[]> {
  const { tasks } = await fetchJson(
    `/projects/${encodeURIComponent(id)}/plan/create-tasks`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ titles }) },
    CreatePlanTasksResponseSchema,
  );
  return tasks;
}

/**
 * Generate a structured, dependency-aware breakdown for a project (Phase 28 C).
 * Preview-only — the client edits/confirms before `createTasksFromBreakdown`.
 */
export async function draftProjectBreakdown(id: string): Promise<BreakdownPreviewResponse> {
  return fetchJson(
    `/projects/${encodeURIComponent(id)}/plan/draft-breakdown`,
    { method: 'POST' },
    BreakdownPreviewResponseSchema,
  );
}

/** Turn a confirmed/edited breakdown into the project's dependency-wired board.
 *  Phase 58 F — pass `milestoneId` to assign every created task to that milestone. */
export async function createTasksFromBreakdown(
  id: string,
  breakdown: Breakdown,
  opts: { repo?: string; milestoneId?: string } = {},
): Promise<Task[]> {
  const { tasks } = await fetchJson(
    `/projects/${encodeURIComponent(id)}/plan/create-from-breakdown`,
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ breakdown, repo: opts.repo, milestoneId: opts.milestoneId }),
    },
    CreateFromBreakdownResponseSchema,
  );
  return tasks;
}

/** Phase 58 F — draft a dependency-aware breakdown from a freeform goal (standalone
 *  path, `POST /tasks/breakdown`). Preview-only; the client curates then creates. */
export async function draftBreakdownFromGoal(
  goal: string,
  projectId?: string,
): Promise<BreakdownPreviewResponse> {
  return fetchJson(
    `/tasks/breakdown`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ goal, projectId }) },
    BreakdownPreviewResponseSchema,
  );
}

/**
 * Preview the tasks a phase doc would seed (Phase 42 Theme D). Parses the `.md`
 * into a dependency-aware breakdown with anchors — creates nothing.
 */
export async function previewPhaseDocSeed(
  projectId: string,
  repoId: string,
  filename: string,
): Promise<BreakdownPreviewResponse> {
  const path =
    `/projects/${encodeURIComponent(projectId)}/phase-docs/${encodeURIComponent(filename)}/seed` +
    `?repoId=${encodeURIComponent(repoId)}`;
  return fetchJson(path, { method: 'POST' }, BreakdownPreviewResponseSchema);
}

/** Create the confirmed seed breakdown as project-linked, anchor-tagged tasks. */
export async function seedPhaseDocTasks(
  projectId: string,
  filename: string,
  breakdown: Breakdown,
): Promise<Task[]> {
  const { tasks } = await fetchJson(
    `/projects/${encodeURIComponent(projectId)}/phase-docs/${encodeURIComponent(filename)}/seed-tasks`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ breakdown }) },
    CreateFromBreakdownResponseSchema,
  );
  return tasks;
}

export async function exportProjectMarkdown(id: string): Promise<string> {
  const path = `/projects/${encodeURIComponent(id)}/export?format=md`;
  const res = await fetch(`${gatewayUrl()}${path}`, { cache: 'no-store' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(errorMessage(res, text), res.status);
  }
  return res.text();
}

// --- Workflows ---

export async function listWorkflows(): Promise<WorkflowSummary[]> {
  return fetchJson('/workflows', undefined, z.array(WorkflowSummarySchema));
}

export async function getWorkflow(id: string): Promise<Workflow> {
  const { workflow } = await fetchJson(
    `/workflows/${encodeURIComponent(id)}`,
    undefined,
    WorkflowResponseSchema,
  );
  return workflow;
}

export async function createWorkflow(body: CreateWorkflowRequest): Promise<Workflow> {
  const { workflow } = await fetchJson(
    '/workflows',
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) },
    WorkflowResponseSchema,
  );
  return workflow;
}

export async function updateWorkflow(id: string, body: UpdateWorkflowRequest): Promise<Workflow> {
  const { workflow } = await fetchJson(
    `/workflows/${encodeURIComponent(id)}`,
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(body) },
    WorkflowResponseSchema,
  );
  return workflow;
}

export async function deleteWorkflow(id: string): Promise<void> {
  await fetchJson(`/workflows/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function duplicateWorkflow(id: string): Promise<Workflow> {
  const { workflow } = await fetchJson(
    `/workflows/${encodeURIComponent(id)}/duplicate`,
    { method: 'POST' },
    WorkflowResponseSchema,
  );
  return workflow;
}

export async function runWorkflow(id: string): Promise<WorkflowRun> {
  const { run } = await fetchJson(
    `/workflows/${encodeURIComponent(id)}/run`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({}) },
    RunResponseSchema,
  );
  return run;
}

export async function listWorkflowRuns(id: string): Promise<WorkflowRun[]> {
  return fetchJson(
    `/workflows/${encodeURIComponent(id)}/runs`,
    undefined,
    z.array(WorkflowRunSchema),
  );
}

export async function getWorkflowRun(id: string, runId: string): Promise<WorkflowRun> {
  const { run } = await fetchJson(
    `/workflows/${encodeURIComponent(id)}/runs/${encodeURIComponent(runId)}`,
    undefined,
    RunResponseSchema,
  );
  return run;
}

export async function exportWorkflowRunMarkdown(
  workflowId: string,
  runId: string,
): Promise<string> {
  const path = `/workflows/${encodeURIComponent(workflowId)}/runs/${encodeURIComponent(runId)}/export?format=md`;
  const res = await fetch(`${gatewayUrl()}${path}`, { cache: 'no-store' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(errorMessage(res, text), res.status);
  }
  return res.text();
}

export async function rotateWorkflowWebhook(id: string): Promise<WebhookInfoResponse> {
  return fetchJson(
    `/workflows/${encodeURIComponent(id)}/webhook/rotate`,
    { method: 'POST' },
    WebhookInfoResponseSchema,
  );
}

// --- Workflow Templates ---

export async function listWorkflowTemplates(filter?: {
  category?: string;
  published?: boolean;
}): Promise<WorkflowTemplateSummary[]> {
  const params = new URLSearchParams();
  if (filter?.category) params.set('category', filter.category);
  if (filter?.published !== undefined) params.set('published', String(filter.published));
  const qs = params.size > 0 ? `?${params.toString()}` : '';
  const { templates } = await fetchJson(`/workflow-templates${qs}`, undefined, WorkflowTemplatesResponseSchema);
  return templates;
}

export async function getWorkflowTemplate(id: string): Promise<WorkflowTemplate> {
  const { template } = await fetchJson(
    `/workflow-templates/${encodeURIComponent(id)}`,
    undefined,
    WorkflowTemplateResponseSchema,
  );
  return template;
}

export async function getWorkflowTemplateSlots(id: string): Promise<TemplateSlotsResponse> {
  return fetchJson(`/workflow-templates/${encodeURIComponent(id)}/slots`, undefined, TemplateSlotsResponseSchema);
}

export async function installWorkflowTemplate(id: string, body: InstallTemplateRequest): Promise<Workflow> {
  const parsed = InstallTemplateRequestSchema.safeParse(body);
  if (!parsed.success) throw new Error(parsed.error.message);
  const { workflow } = await fetchJson(
    `/workflow-templates/${encodeURIComponent(id)}/install`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(parsed.data) },
    WorkflowResponseSchema,
  );
  return workflow;
}

export async function createWorkflowTemplateFromWorkflow(body: CreateFromWorkflowRequest): Promise<WorkflowTemplate> {
  const parsed = CreateFromWorkflowRequestSchema.safeParse(body);
  if (!parsed.success) throw new Error(parsed.error.message);
  const { template } = await fetchJson(
    '/workflow-templates/from-workflow',
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(parsed.data) },
    WorkflowTemplateResponseSchema,
  );
  return template;
}

// --- Agents (orchestrator + subagents + heartbeat) ---

export async function getAgentsConfig(): Promise<AgentsConfig> {
  const { config } = await fetchJson('/agents', undefined, AgentsConfigResponseSchema);
  return config;
}

export async function updateAgentCli(cli: AgentCli): Promise<AgentCli> {
  const res = await fetchJson(
    '/agents/cli',
    { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify({ cli }) },
    AgentCliResponseSchema,
  );
  return res.cli;
}

export async function getCliStatus(cli: AgentCli): Promise<AgentCliStatus> {
  const { status } = await fetchJson(
    `/agents/cli/${encodeURIComponent(cli)}/status`,
    undefined,
    AgentCliStatusResponseSchema,
  );
  return status;
}

/** Installed-state of every known agent CLI, in one request. */
export async function getCliStatuses(): Promise<AgentCliStatus[]> {
  const { statuses } = await fetchJson(
    '/agents/cli/statuses',
    undefined,
    AgentCliStatusListResponseSchema,
  );
  return statuses;
}

// --- LLM providers (API credentials + active provider for AI features) ---

export async function getProviders(): Promise<ProvidersResponse> {
  return fetchJson('/providers', undefined, ProvidersResponseSchema);
}

export async function updateProvider(
  provider: LlmProvider,
  body: UpdateProviderCredentialRequest,
): Promise<ProviderResponse> {
  return fetchJson(
    `/providers/${encodeURIComponent(provider)}`,
    { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(body) },
    ProviderResponseSchema,
  );
}

export async function setActiveProvider(provider: LlmProvider): Promise<ProvidersResponse> {
  return fetchJson(
    '/providers/active',
    { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify({ activeProvider: provider }) },
    ProvidersResponseSchema,
  );
}

/** Register a standalone install/uninstall terminal for a CLI; returns the id to attach to. */
export async function createCliTerminal(
  cli: AgentCli,
  action: CliTerminalAction,
): Promise<string> {
  const { terminalId } = await fetchJson(
    `/terminal/${action}/${encodeURIComponent(cli)}`,
    { method: 'POST' },
    InstallTerminalResponseSchema,
  );
  return terminalId;
}

// --- Setup readiness (Phase 19 — first-run wizard / soft nudge / status panel) ---

/** Aggregate first-run readiness: the per-item checklist + derived `ready`. */
export async function getSetupStatus(): Promise<SetupStatus> {
  return fetchJson('/setup/status', undefined, SetupStatusSchema);
}

// --- Environment (system toolchain checker for Settings → System) ---

/** Gateway host OS + install-state of every system tool for that OS. */
export async function getEnvironment(): Promise<EnvironmentResponse> {
  return fetchJson('/environment', undefined, EnvironmentResponseSchema);
}

/** Register a standalone install/update/uninstall terminal for a system tool. */
export async function createEnvTerminal(
  tool: EnvToolId,
  action: EnvToolAction,
): Promise<string> {
  const { terminalId } = await fetchJson(
    `/terminal/env/${action}/${encodeURIComponent(tool)}`,
    { method: 'POST' },
    InstallTerminalResponseSchema,
  );
  return terminalId;
}

export async function updatePrimaryAgent(body: UpdatePrimaryAgentRequest): Promise<PrimaryAgent> {
  const { primary } = await fetchJson(
    '/agents/primary',
    { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(body) },
    PrimaryAgentResponseSchema,
  );
  return primary;
}

export async function createSubAgent(body: CreateSubAgentRequest): Promise<SubAgent> {
  const { subAgent } = await fetchJson(
    '/agents/subagents',
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) },
    SubAgentResponseSchema,
  );
  return subAgent;
}

export async function updateSubAgent(id: string, body: UpdateSubAgentRequest): Promise<SubAgent> {
  const { subAgent } = await fetchJson(
    `/agents/subagents/${encodeURIComponent(id)}`,
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(body) },
    SubAgentResponseSchema,
  );
  return subAgent;
}

export async function deleteSubAgent(id: string): Promise<void> {
  await fetchJson(`/agents/subagents/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function listHeartbeatRuns(): Promise<HeartbeatRun[]> {
  const { runs } = await fetchJson(
    '/agents/heartbeat/runs',
    undefined,
    HeartbeatRunsResponseSchema,
  );
  return runs;
}

export async function runHeartbeatNow(): Promise<HeartbeatRun> {
  const { run } = await fetchJson(
    '/agents/heartbeat/run',
    { method: 'POST' },
    HeartbeatRunResponseSchema,
  );
  return run;
}

// --- Councils (member panels + switchable-format synthesis runs) ---

export async function getCouncils(): Promise<Council[]> {
  return fetchJson('/councils', undefined, z.array(CouncilSchema));
}

export async function getCouncil(id: string): Promise<Council> {
  const { council } = await fetchJson(
    `/councils/${encodeURIComponent(id)}`,
    undefined,
    CouncilResponseSchema,
  );
  return council;
}

export async function createCouncil(body: CreateCouncilRequest): Promise<Council> {
  const { council } = await fetchJson(
    '/councils',
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) },
    CouncilResponseSchema,
  );
  return council;
}

export async function updateCouncil(id: string, body: UpdateCouncilRequest): Promise<Council> {
  const { council } = await fetchJson(
    `/councils/${encodeURIComponent(id)}`,
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(body) },
    CouncilResponseSchema,
  );
  return council;
}

export async function deleteCouncil(id: string): Promise<void> {
  await fetchJson(`/councils/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function createCouncilMember(
  councilId: string,
  body: CreateCouncilMemberRequest,
): Promise<CouncilMember> {
  const { member } = await fetchJson(
    `/councils/${encodeURIComponent(councilId)}/members`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) },
    CouncilMemberResponseSchema,
  );
  return member;
}

export async function updateCouncilMember(
  councilId: string,
  memberId: string,
  body: UpdateCouncilMemberRequest,
): Promise<CouncilMember> {
  const { member } = await fetchJson(
    `/councils/${encodeURIComponent(councilId)}/members/${encodeURIComponent(memberId)}`,
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(body) },
    CouncilMemberResponseSchema,
  );
  return member;
}

export async function deleteCouncilMember(councilId: string, memberId: string): Promise<void> {
  await fetchJson(
    `/councils/${encodeURIComponent(councilId)}/members/${encodeURIComponent(memberId)}`,
    { method: 'DELETE' },
  );
}

export async function reorderCouncilMembers(
  councilId: string,
  memberIds: string[],
): Promise<CouncilMember[]> {
  const { council } = await fetchJson(
    `/councils/${encodeURIComponent(councilId)}/members/reorder`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ memberIds }) },
    CouncilResponseSchema,
  );
  return council.members;
}

export async function startCouncilRun(
  councilId: string,
  prompt: string,
  format?: CouncilFormat,
): Promise<CouncilRun> {
  const { run } = await fetchJson(
    `/councils/${encodeURIComponent(councilId)}/runs`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ prompt, format }) },
    CouncilRunResponseSchema,
  );
  return run;
}

export async function listCouncilRuns(councilId: string): Promise<CouncilRun[]> {
  const { runs } = await fetchJson(
    `/councils/${encodeURIComponent(councilId)}/runs`,
    undefined,
    CouncilRunsResponseSchema,
  );
  return runs;
}

export async function getCouncilRun(councilId: string, runId: string): Promise<CouncilRun> {
  const { run } = await fetchJson(
    `/councils/${encodeURIComponent(councilId)}/runs/${encodeURIComponent(runId)}`,
    undefined,
    CouncilRunResponseSchema,
  );
  return run;
}

export async function skipCouncilRunMember(
  councilId: string,
  runId: string,
  runMemberId: string,
): Promise<CouncilRun> {
  const { run } = await fetchJson(
    `/councils/${encodeURIComponent(councilId)}/runs/${encodeURIComponent(runId)}/members/${encodeURIComponent(runMemberId)}/skip`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({}) },
    CouncilRunResponseSchema,
  );
  return run;
}

export async function retryCouncilRunMember(
  councilId: string,
  runId: string,
  runMemberId: string,
): Promise<CouncilRun> {
  const { run } = await fetchJson(
    `/councils/${encodeURIComponent(councilId)}/runs/${encodeURIComponent(runId)}/members/${encodeURIComponent(runMemberId)}/retry`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({}) },
    CouncilRunResponseSchema,
  );
  return run;
}

export async function retryCouncilSynthesis(
  councilId: string,
  runId: string,
  format?: CouncilFormat,
): Promise<CouncilRun> {
  const { run } = await fetchJson(
    `/councils/${encodeURIComponent(councilId)}/runs/${encodeURIComponent(runId)}/synthesis/retry`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ format }) },
    CouncilRunResponseSchema,
  );
  return run;
}

/**
 * Fetch a council run's report as markdown (the export framework's `md` format).
 * Returns the raw text — the caller copies it, downloads it as a `.md` blob, or
 * renders it for print-to-PDF. PDF is produced client-side, so it never hits the
 * gateway.
 */
export async function exportCouncilRunMarkdown(
  councilId: string,
  runId: string,
): Promise<string> {
  const path = `/councils/${encodeURIComponent(councilId)}/runs/${encodeURIComponent(runId)}/export?format=md`;
  const res = await fetch(`${gatewayUrl()}${path}`, { cache: 'no-store' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(errorMessage(res, text), res.status);
  }
  return res.text();
}

/**
 * Phase 49 E — download a full-store backup archive (admin-gated). Fetches the
 * zip WITH the bearer token (a plain link wouldn't carry it), and reads the
 * per-domain summary from the `x-midnite-backup-manifest` header (exposed via
 * CORS by the export endpoint) so the caller can report what it downloaded
 * without unzipping. Returns the blob + resolved filename + summary.
 */
export async function downloadBackup(
  opts?: { domains?: string[]; includeSecrets?: boolean; passphrase?: string },
): Promise<{ blob: Blob; filename: string; summary: BackupSummary | null }> {
  const params = new URLSearchParams();
  if (opts?.domains && opts.domains.length > 0) params.set('domains', opts.domains.join(','));
  if (opts?.includeSecrets) params.set('includeSecrets', 'true');
  const qs = params.toString() ? `?${params.toString()}` : '';
  const headers: Record<string, string> = {};
  if (_accessToken) headers['authorization'] = `Bearer ${_accessToken}`;
  // Passphrase rides a header, never the query string (Theme G).
  if (opts?.passphrase) headers['x-midnite-passphrase'] = opts.passphrase;
  const res = await fetch(`${gatewayUrl()}/portability/export${qs}`, { cache: 'no-store', headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(errorMessage(res, text), res.status);
  }
  const blob = await res.blob();
  const disposition = res.headers.get('content-disposition') ?? '';
  const filename = /filename="?([^"]+)"?/.exec(disposition)?.[1] ?? 'midnite-backup.zip';
  let summary: BackupSummary | null = null;
  const rawSummary = res.headers.get('x-midnite-backup-manifest');
  if (rawSummary) {
    const parsed = BackupSummarySchema.safeParse(JSON.parse(rawSummary));
    if (parsed.success) summary = parsed.data;
  }
  return { blob, filename, summary };
}

/** Phase 49 F — scheduled auto-backup status (admin-gated) for the Data page. */
export async function getBackupStatus(signal?: AbortSignal): Promise<BackupStatus> {
  return fetchJson('/portability/backup/status', { signal }, BackupStatusSchema);
}

/**
 * Phase 49 E — dry-run a restore (admin-gated): upload the archive to
 * `POST /portability/import/preview` and get per-domain counts, id conflicts,
 * and the schema-version verdict back — no write. Multipart so the zip rides as
 * a file part (fetchJson lets the browser set the multipart boundary).
 */
export async function previewImport(file: File): Promise<ImportPreview> {
  const form = new FormData();
  form.set('archive', file, file.name);
  return fetchJson('/portability/import/preview', { method: 'POST', body: form }, ImportPreviewSchema);
}

/**
 * Phase 49 E — restore an archive (admin-gated): `merge` inserts new ids and
 * keeps existing, `replace` wipes the imported domains first. All-or-nothing on
 * the server (a single transaction) — the result reports rows inserted/skipped
 * per domain + whether the search reindex succeeded.
 */
export async function importArchive(
  file: File,
  mode: 'merge' | 'replace',
  passphrase?: string,
): Promise<ImportResult> {
  const form = new FormData();
  form.set('archive', file, file.name);
  form.set('mode', mode);
  // Theme G — unwrap a passphrase-mode archive's secrets on restore.
  if (passphrase) form.set('passphrase', passphrase);
  return fetchJson('/portability/import', { method: 'POST', body: form }, ImportResultSchema);
}

/** Fetch a task thread as markdown (the gateway's `taskToMarkdown`). Backs the
 *  task thread modal's ExportMenu (download .md / print-to-PDF / copy). */
export async function exportTask(taskId: string): Promise<string> {
  const path = `/tasks/${encodeURIComponent(taskId)}/export?format=md`;
  const res = await fetch(`${gatewayUrl()}${path}`, { cache: 'no-store' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(errorMessage(res, text), res.status);
  }
  return res.text();
}

// ---- Notes ----

export async function getNotes(): Promise<Note[]> {
  const { notes } = await fetchJson('/notes', undefined, NotesResponseSchema);
  return notes;
}

export async function createNote(body: CreateNoteRequest): Promise<Note> {
  const { note } = await fetchJson(
    '/notes',
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) },
    NoteResponseSchema,
  );
  return note;
}

export async function updateNote(id: string, body: UpdateNoteRequest): Promise<Note> {
  const { note } = await fetchJson(
    `/notes/${encodeURIComponent(id)}`,
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(body) },
    NoteResponseSchema,
  );
  return note;
}

export async function deleteNote(id: string): Promise<void> {
  await fetchJson(`/notes/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ---- Routines ----

export async function getRoutines(): Promise<Routine[]> {
  const { routines } = await fetchJson('/routines', undefined, RoutinesResponseSchema);
  return routines;
}

export async function createRoutine(body: CreateRoutineRequest): Promise<Routine> {
  const { routine } = await fetchJson(
    '/routines',
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) },
    RoutineResponseSchema,
  );
  return routine;
}

export async function updateRoutine(id: string, body: UpdateRoutineRequest): Promise<Routine> {
  const { routine } = await fetchJson(
    `/routines/${encodeURIComponent(id)}`,
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(body) },
    RoutineResponseSchema,
  );
  return routine;
}

export async function deleteRoutine(id: string): Promise<void> {
  await fetchJson(`/routines/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function addRoutineGroup(id: string, body: CreateGroupRequest): Promise<Routine> {
  const { routine } = await fetchJson(
    `/routines/${encodeURIComponent(id)}/groups`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) },
    RoutineResponseSchema,
  );
  return routine;
}

export async function updateRoutineGroup(
  id: string,
  gid: string,
  body: UpdateGroupRequest,
): Promise<Routine> {
  const { routine } = await fetchJson(
    `/routines/${encodeURIComponent(id)}/groups/${encodeURIComponent(gid)}`,
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(body) },
    RoutineResponseSchema,
  );
  return routine;
}

export async function deleteRoutineGroup(id: string, gid: string): Promise<Routine> {
  const { routine } = await fetchJson(
    `/routines/${encodeURIComponent(id)}/groups/${encodeURIComponent(gid)}`,
    { method: 'DELETE' },
    RoutineResponseSchema,
  );
  return routine;
}

export async function addRoutineItem(
  id: string,
  gid: string,
  body: CreateItemRequest,
): Promise<Routine> {
  const { routine } = await fetchJson(
    `/routines/${encodeURIComponent(id)}/groups/${encodeURIComponent(gid)}/items`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) },
    RoutineResponseSchema,
  );
  return routine;
}

export async function updateRoutineItem(
  id: string,
  iid: string,
  body: UpdateItemRequest,
): Promise<Routine> {
  const { routine } = await fetchJson(
    `/routines/${encodeURIComponent(id)}/items/${encodeURIComponent(iid)}`,
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(body) },
    RoutineResponseSchema,
  );
  return routine;
}

export async function deleteRoutineItem(id: string, iid: string): Promise<Routine> {
  const { routine } = await fetchJson(
    `/routines/${encodeURIComponent(id)}/items/${encodeURIComponent(iid)}`,
    { method: 'DELETE' },
    RoutineResponseSchema,
  );
  return routine;
}

export async function recordRoutineProgress(
  id: string,
  body: RecordProgressRequest,
): Promise<RoutineProgress> {
  const { progress } = await fetchJson(
    `/routines/${encodeURIComponent(id)}/progress`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) },
    RoutineProgressResponseSchema,
  );
  return progress;
}

export async function getRoutineProgress(
  id: string,
  from?: string,
  to?: string,
): Promise<RoutineProgress[]> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const { progress } = await fetchJson(
    `/routines/${encodeURIComponent(id)}/progress${qs}`,
    undefined,
    RoutineProgressListResponseSchema,
  );
  return progress;
}

// ---- Dashboard widgets: News & Weather (gateway proxies) ----

export async function getNews(count: number): Promise<HackerNewsStory[]> {
  const { stories } = await fetchJson(`/news?count=${count}`, undefined, NewsResponseSchema);
  return stories;
}

export async function getWeather(lat: number, lon: number): Promise<WeatherResponse> {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
  return fetchJson(`/weather?${params.toString()}`, undefined, WeatherResponseSchema);
}

export async function getLinkMetadata(url: string): Promise<LinkMetadataResponse> {
  const params = new URLSearchParams({ url });
  return fetchJson(`/metadata?${params.toString()}`, undefined, LinkMetadataResponseSchema);
}

// ---- Global full-text search (Phase 20) ----

/**
 * Cross-domain full-text search. The gateway returns ranked, self-contained
 * {@link SearchResponse} hits (each carries its own `route` + `<mark>`ed snippet),
 * so callers render and route without a per-hit re-fetch. Pass `signal` to abort
 * a stale request when the user keeps typing (the command palette does this).
 */
export async function searchAll(
  query: string,
  opts: { type?: SearchType; limit?: number; signal?: AbortSignal } = {},
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query });
  if (opts.type) params.set('type', opts.type);
  if (opts.limit != null) params.set('limit', String(opts.limit));
  return fetchJson(`/search?${params.toString()}`, { signal: opts.signal }, SearchResponseSchema);
}

// ---- Dashboard widgets: Market stocks & crypto (gateway proxy) ----

export async function searchAssets(kind: AssetKind, query: string): Promise<AssetSearchResult[]> {
  const params = new URLSearchParams({ kind, query });
  const { results } = await fetchJson(`/market/search?${params.toString()}`, undefined, AssetSearchResponseSchema);
  return results;
}

export async function getMarketQuote(kind: AssetKind, symbol: string): Promise<MarketQuote> {
  const params = new URLSearchParams({ kind, symbol });
  return fetchJson(`/market/quote?${params.toString()}`, undefined, MarketQuoteSchema);
}

export async function getMarketHistory(
  kind: AssetKind,
  symbol: string,
  timeframe: MarketTimeframe,
): Promise<MarketHistoryResponse> {
  const params = new URLSearchParams({ kind, symbol, timeframe });
  return fetchJson(`/market/history?${params.toString()}`, undefined, MarketHistoryResponseSchema);
}

// ---- Media ----

export async function listMedia(params?: { projectId?: string; type?: MediaType }): Promise<Media[]> {
  const qs = new URLSearchParams();
  if (params?.projectId) qs.set('projectId', params.projectId);
  if (params?.type) qs.set('type', params.type);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  const { items } = await fetchJson(`/media${query}`, undefined, MediaListResponseSchema);
  return items;
}

export async function createMedia(body: CreateMediaBody): Promise<Media> {
  const { media } = await fetchJson(
    '/media',
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) },
    MediaResponseSchema,
  );
  return media;
}

export async function getMedia(id: string): Promise<Media> {
  const { media } = await fetchJson(`/media/${encodeURIComponent(id)}`, undefined, MediaResponseSchema);
  return media;
}

export async function updateMedia(id: string, body: UpdateMediaBody): Promise<Media> {
  const { media } = await fetchJson(
    `/media/${encodeURIComponent(id)}`,
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(body) },
    MediaResponseSchema,
  );
  return media;
}

export async function deleteMedia(id: string): Promise<void> {
  await fetchJson(`/media/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function mediaFileUrl(id: string): string {
  return `${gatewayUrl()}/media/${encodeURIComponent(id)}/file`;
}

// ---- LLM usage & cost ----

export async function getUsageSummary(params?: {
  from?: string;
  to?: string;
  groupBy?: UsageGroupBy;
}): Promise<UsageSummaryResponse> {
  const qs = new URLSearchParams();
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  if (params?.groupBy) qs.set('groupBy', params.groupBy);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return fetchJson(`/usage/summary${query}`, undefined, UsageSummaryResponseSchema);
}

/** Cost attribution by task/repo/project/session from `GET /usage/attribution`
 *  (Phase 61 B) — harvested agent-session cost with a measured-vs-estimated split. */
export async function getUsageAttribution(
  params?: UsageAttributionQuery,
): Promise<UsageAttributionResponse> {
  const qs = new URLSearchParams();
  if (params?.groupBy) qs.set('groupBy', params.groupBy);
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return fetchJson(`/usage/attribution${query}`, undefined, UsageAttributionResponseSchema);
}

// ---- Notifications (Phase 21 — notification center + live feed) ----

/** The persisted notification feed + unread count (`GET /notifications`). */
export async function getNotifications(
  query?: NotificationListQuery,
): Promise<NotificationListResponse> {
  const qs = new URLSearchParams();
  if (query?.limit != null) qs.set('limit', String(query.limit));
  if (query?.offset != null) qs.set('offset', String(query.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return fetchJson(`/notifications${suffix}`, undefined, NotificationListResponseSchema);
}

/** Mark specific notifications read (`ids`) or all of them (`all`); returns the new unread count. */
export async function markNotificationsRead(req: MarkReadRequest): Promise<{ unread: number }> {
  return fetchJson(
    '/notifications/read',
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(req) },
    z.object({ unread: z.number().int().nonnegative() }),
  );
}

/** Clear the entire notification feed (`DELETE /notifications`). */
export async function clearNotifications(): Promise<void> {
  await fetchJson('/notifications', { method: 'DELETE' });
}

/** Dismiss a single notification (`DELETE /notifications/:id`). */
export async function dismissNotification(id: string): Promise<void> {
  await fetchJson(`/notifications/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ---- Agent pool ----

/** Live slot snapshot from `GET /pool`. */
export async function getPoolSnapshot(): Promise<AgentPoolSnapshot> {
  return fetchJson('/pool', undefined, AgentPoolSnapshotSchema);
}

// ---- Ops metrics (Phase 22 B) ----

/** Server-recorded ops summary from `GET /metrics/ops`. */
export async function getOpsMetrics(params?: OpsQuery): Promise<OpsSummary> {
  const qs = new URLSearchParams();
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return fetchJson(`/metrics/ops${query}`, undefined, OpsSummarySchema);
}

/** Lifecycle cycle-time (wait/work/end-to-end p50/p90) from `GET /metrics/cycle-time` (Phase 61 C). */
export async function getCycleTime(params?: CycleTimeQuery): Promise<CycleTimeResponse> {
  const qs = new URLSearchParams();
  if (params?.groupBy) qs.set('groupBy', params.groupBy);
  if (params?.windowDays != null) qs.set('windowDays', String(params.windowDays));
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return fetchJson(`/metrics/cycle-time${query}`, undefined, CycleTimeResponseSchema);
}

/** Persisted gauge samples (fleet trend history) from `GET /metrics/gauges/history` (Phase 61 D). */
export async function getGaugeHistory(params?: GaugeHistoryQuery): Promise<GaugeHistoryResponse> {
  const qs = new URLSearchParams();
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return fetchJson(`/metrics/gauges/history${query}`, undefined, GaugeHistoryResponseSchema);
}

/** Real host telemetry (CPU / memory / disk) from `GET /system/stats`. */
export async function getSystemStats(signal?: AbortSignal): Promise<SystemStats> {
  return fetchJson('/system/stats', signal ? { signal } : undefined, SystemStatsSchema);
}

// ---- Workflow credentials (Phase 14 B) ----

/** Name + type list — secret material is never returned. */
export async function listWorkflowCredentials(): Promise<WorkflowCredential[]> {
  const r = await fetchJson('/workflow-credentials', undefined, WorkflowCredentialsResponseSchema);
  return r.credentials;
}

/** Store a new credential. The secret `data` is encrypted at rest; the response is the public view. */
export async function createWorkflowCredential(
  req: CreateWorkflowCredentialRequest,
): Promise<WorkflowCredential> {
  const r = await fetchJson(
    '/workflow-credentials',
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(req) },
    WorkflowCredentialResponseSchema,
  );
  return r.credential;
}

/** Permanently delete a credential. Returns 404 if not found. */
export async function deleteWorkflowCredential(id: string): Promise<void> {
  await fetchJson(`/workflow-credentials/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/**
 * Build the gateway URL to start an OAuth2 authorization flow for a provider.
 * Navigate the browser to the returned URL — the gateway issues a redirect to the
 * provider's consent screen. On success the browser is sent to `redirectUri` with a
 * `credential_id` query param containing the newly-created credential's id.
 */
export function getOAuthStartUrl(
  provider: OAuthProvider,
  credentialName: string,
  redirectUri: string,
): string {
  const params = new URLSearchParams({ credential_name: credentialName, redirect_uri: redirectUri });
  return `${gatewayUrl()}/oauth/${encodeURIComponent(provider)}/start?${params.toString()}`;
}

// ---- Teams (Phase 33 B) ----

/** List teams the current user belongs to. */
export async function listTeams(): Promise<Team[]> {
  return fetchJson<Team[]>('/teams');
}

/** Get a team with its member list. */
export async function getTeamWithMembers(id: string): Promise<TeamWithMembers> {
  return fetchJson(`/teams/${encodeURIComponent(id)}`, undefined, TeamWithMembersSchema);
}

/** Create a new team; the caller becomes owner. */
export async function createTeam(req: CreateTeamRequest): Promise<TeamWithMembers> {
  return fetchJson('/teams', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(req) }, TeamWithMembersSchema);
}

/** Rename a team (admin+). */
export async function updateTeam(id: string, req: UpdateTeamRequest): Promise<TeamWithMembers> {
  return fetchJson(
    `/teams/${encodeURIComponent(id)}`,
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(req) },
    TeamWithMembersSchema,
  );
}

/** Delete a team (owner only). */
export async function deleteTeam(id: string): Promise<void> {
  await fetchJson(`/teams/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** Set a member's role (admin+). */
export async function setMemberRole(teamId: string, userId: string, role: TeamRole): Promise<void> {
  await fetchJson(
    `/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(userId)}/role`,
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify({ role }) },
  );
}

/** Remove a member from the team. Members may remove themselves; admins can remove others. */
export async function removeMember(teamId: string, userId: string): Promise<void> {
  await fetchJson(`/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(userId)}`, { method: 'DELETE' });
}

/** Create an invite token (admin+). */
export async function createInvite(teamId: string, req: CreateInviteRequest): Promise<TeamInvite> {
  return fetchJson(
    `/teams/${encodeURIComponent(teamId)}/invites`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(req) },
    TeamInviteSchema,
  );
}

/** List outstanding invites for a team (admin+). */
export async function listInvites(teamId: string): Promise<TeamInvite[]> {
  return fetchJson<TeamInvite[]>(`/teams/${encodeURIComponent(teamId)}/invites`);
}

/** Revoke an invite (admin+). */
export async function revokeInvite(teamId: string, inviteId: string): Promise<void> {
  await fetchJson(`/teams/${encodeURIComponent(teamId)}/invites/${encodeURIComponent(inviteId)}`, { method: 'DELETE' });
}

/** Fetch invite metadata (no auth required). */
export async function getInvite(token: string): Promise<TeamInvite> {
  return fetchJson(`/invites/${encodeURIComponent(token)}`, undefined, TeamInviteSchema);
}

/** Accept an invite (must be authenticated). */
export async function acceptInvite(token: string): Promise<void> {
  await fetchJson(`/invites/${encodeURIComponent(token)}/accept`, { method: 'POST' });
}

/** Update the current user's profile (display name). */
export async function updateMyProfile(req: UpdateUserRequest): Promise<User> {
  const res = await fetchJson(
    '/auth/me',
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(req) },
    z.object({ user: UserSchema }),
  );
  return res.user;
}

/** Change the current user's password. currentPassword is verified server-side. */
export async function updateMyPassword(req: UpdatePasswordRequest): Promise<void> {
  await fetchJson('/auth/me/password', { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(req) });
}

// ---- Approvals (Phase 23) ----

export async function getApprovalSettings(): Promise<ApprovalSettings> {
  return fetchJson('/approvals/settings', undefined, ApprovalSettingsSchema);
}

export async function getAutonomyMode(): Promise<ModeResponse> {
  const res = await getApprovalSettings();
  return { mode: res.mode };
}

export async function setApprovalMode(mode: AutonomyMode): Promise<ApprovalSettings> {
  return fetchJson(
    '/approvals/mode',
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify({ mode }) },
    ApprovalSettingsSchema,
  );
}

export async function setAutonomyMode(mode: AutonomyMode): Promise<ModeResponse> {
  const res = await fetchJson(
    '/approvals/mode',
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify({ mode }) },
    ApprovalSettingsSchema,
  );
  return { mode: res.mode };
}

export async function listApprovalRules(): Promise<ApprovalRule[]> {
  const res = await fetchJson('/approvals/rules', undefined, ApprovalRulesResponseSchema);
  return res.rules;
}

export async function createApprovalRule(req: CreateApprovalRule): Promise<ApprovalRule> {
  const res = await fetchJson(
    '/approvals/rules',
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(req) },
    ApprovalRuleResponseSchema,
  );
  return res.rule;
}

export async function updateApprovalRule(id: string, req: UpdateApprovalRule): Promise<ApprovalRule> {
  const res = await fetchJson(
    `/approvals/rules/${encodeURIComponent(id)}`,
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(req) },
    ApprovalRuleResponseSchema,
  );
  return res.rule;
}

export async function deleteApprovalRule(id: string): Promise<void> {
  await fetchJson(`/approvals/rules/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function listPendingApprovals(): Promise<PendingApprovalsResponse> {
  return fetchJson('/approvals/pending', undefined, PendingApprovalsResponseSchema);
}

export async function listApprovalLog(params?: {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  taskId?: string;
  sessionId?: string;
}): Promise<ApprovalLogResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  if (params?.taskId) qs.set('taskId', params.taskId);
  if (params?.sessionId) qs.set('sessionId', params.sessionId);
  const query = qs.toString();
  return fetchJson(`/approvals/log${query ? `?${query}` : ''}`, undefined, ApprovalLogResponseSchema);
}

// ── Service tokens (Phase 38 Theme B) ───────────────────────────────────────

export async function listServiceTokens(): Promise<ListServiceTokensResponse> {
  return fetchJson('/service-tokens', undefined, ListServiceTokensResponseSchema);
}

export async function createServiceToken(
  req: CreateServiceTokenRequest,
): Promise<CreateServiceTokenResponse> {
  return fetchJson(
    '/service-tokens',
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(req) },
    CreateServiceTokenResponseSchema,
  );
}

export async function revokeServiceToken(id: string): Promise<void> {
  await fetchJson(`/service-tokens/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ── Ideas (Phase 40 Theme A+B) ────────────────────────────────────────────────

export async function listIdeas(query?: IdeaQuery): Promise<IdeasResponse> {
  const qs = new URLSearchParams();
  if (query?.status) qs.set('status', query.status);
  if (query?.q) qs.set('q', query.q);
  if (query?.page) qs.set('page', String(query.page));
  if (query?.limit) qs.set('limit', String(query.limit));
  const q = qs.toString();
  return fetchJson(`/ideas${q ? `?${q}` : ''}`, undefined, IdeasResponseSchema);
}

export async function createIdea(req: CreateIdeaRequest): Promise<IdeaResponse> {
  return fetchJson(
    '/ideas',
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(req) },
    IdeaResponseSchema,
  );
}

export async function getIdea(id: string): Promise<IdeaResponse> {
  return fetchJson(`/ideas/${encodeURIComponent(id)}`, undefined, IdeaResponseSchema);
}

export async function updateIdea(id: string, req: UpdateIdeaRequest): Promise<IdeaResponse> {
  return fetchJson(
    `/ideas/${encodeURIComponent(id)}`,
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(req) },
    IdeaResponseSchema,
  );
}

export async function deleteIdea(id: string): Promise<void> {
  await fetchJson(`/ideas/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function listIdeaMessages(ideaId: string): Promise<IdeaMessagesResponse> {
  return fetchJson(
    `/ideas/${encodeURIComponent(ideaId)}/messages`,
    undefined,
    IdeaMessagesResponseSchema,
  );
}

export async function sendIdeaMessage(
  ideaId: string,
  req: IdeaChatRequest,
): Promise<IdeaChatResponse> {
  return fetchJson(
    `/ideas/${encodeURIComponent(ideaId)}/messages`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(req) },
    IdeaChatResponseSchema,
  );
}

export async function promoteIdeaToProject(
  ideaId: string,
  req: PromoteIdeaRequest,
): Promise<PromoteIdeaResponse> {
  return fetchJson(
    `/ideas/${encodeURIComponent(ideaId)}/promote`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(req) },
    PromoteIdeaResponseSchema,
  );
}

export type { Idea, IdeaMessage, IdeaResponse, IdeasResponse, IdeaChatResponse };
