import {
  NotesResponseSchema,
  NoteResponseSchema,
  NewsResponseSchema,
  WeatherResponseSchema,
  MediaListResponseSchema,
  MediaResponseSchema,
  type HackerNewsStory,
  type WeatherResponse,
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
} from '@midnite/shared';
import {
  AgentCliResponseSchema,
  CouncilParticipantResponseSchema,
  CouncilResponseSchema,
  CouncilRunResponseSchema,
  CouncilRunsResponseSchema,
  CouncilSchema,
  BrainstormContributorResponseSchema,
  BrainstormResponseSchema,
  BrainstormRunResponseSchema,
  BrainstormRunsResponseSchema,
  BrainstormSchema,
  AgentCliStatusResponseSchema,
  AgentCliStatusListResponseSchema,
  AgentPingResponseSchema,
  AgentsConfigResponseSchema,
  ProvidersResponseSchema,
  ProviderResponseSchema,
  GlobalSourcesResponseSchema,
  InstallTerminalResponseSchema,
  BrowseDirResponseSchema,
  CreatePlanTasksResponseSchema,
  CreateTaskResponseSchema,
  DraftPlanResponseSchema,
  EnhanceDescriptionResponseSchema,
  HeartbeatRunResponseSchema,
  HeartbeatRunsResponseSchema,
  MemoriesResponseSchema,
  MemoryResponseSchema,
  PrimaryAgentResponseSchema,
  ProjectResponseSchema,
  ProjectSchema,
  RunResponseSchema,
  SessionSummarySchema,
  SessionTranscriptSchema,
  SubAgentResponseSchema,
  TaskCountsSchema,
  TaskSchema,
  TerminalTokenResponseSchema,
  WebhookInfoResponseSchema,
  WorkflowResponseSchema,
  WorkflowRunSchema,
  WorkflowSummarySchema,
  type AgentCli,
  type AgentCliStatus,
  type AgentsConfig,
  type BrowseDirResponse,
  type CliTerminalAction,
  type Council,
  type CouncilParticipant,
  type CouncilRun,
  type CreateCouncilParticipantRequest,
  type CreateCouncilRequest,
  type UpdateCouncilParticipantRequest,
  type UpdateCouncilRequest,
  type Brainstorm,
  type BrainstormContributor,
  type BrainstormRun,
  type BrainstormSynthMode,
  type CreateBrainstormContributorRequest,
  type CreateBrainstormRequest,
  type UpdateBrainstormContributorRequest,
  type UpdateBrainstormRequest,
  type CreateProjectRequest,
  type CreateSubAgentRequest,
  type CreateTaskResponse,
  type CreateWorkflowRequest,
  type DraftPlanResponse,
  type GlobalSource,
  type CreateMemoryRequest,
  type HeartbeatRun,
  type LlmProvider,
  type Memory,
  type PrimaryAgent,
  type ProvidersResponse,
  type ProviderResponse,
  type UpdateProviderCredentialRequest,
  type Project,
  type SessionSummary,
  type SessionTranscript,
  type AgentPingResponse,
  type Status,
  type SubAgent,
  type Task,
  type TaskCounts,
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
} from '@midnite/shared';
import { z } from 'zod';

const JSON_HEADERS = { 'content-type': 'application/json' } as const;

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

// The schema is typed structurally by its `parse` return so T is inferred from the
// zod OUTPUT type (where `.default()` fields are required), not the input type.
async function fetchJson<T>(
  path: string,
  init?: RequestInit,
  schema?: { parse: (value: unknown) => T },
): Promise<T> {
  const res = await fetch(`${gatewayUrl()}${path}`, { cache: 'no-store', ...init });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(errorMessage(res, text));
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

export async function getTaskCounts(): Promise<TaskCounts> {
  return fetchJson('/tasks/counts', undefined, TaskCountsSchema);
}

export async function getTasks(): Promise<Task[]> {
  return fetchJson('/tasks', undefined, z.array(TaskSchema));
}

export async function createTask(form: FormData): Promise<CreateTaskResponse> {
  return fetchJson(
    '/tasks',
    { method: 'POST', body: form, cache: 'no-store' },
    CreateTaskResponseSchema,
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

// Permanent delete — the gateway rejects this unless the task is archived.
export async function deleteTask(id: string): Promise<void> {
  await fetchJson(`/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function getSessions(): Promise<SessionSummary[]> {
  return fetchJson('/sessions', undefined, z.array(SessionSummarySchema));
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

// Lists subdirectories of `path` on the gateway host (home dir when omitted).
// Backs the folder picker; paths are exchanged in `~`-form.
export async function browseDirectory(path?: string): Promise<BrowseDirResponse> {
  const query = path ? `?path=${encodeURIComponent(path)}` : '';
  return fetchJson(`/fs/dirs${query}`, undefined, BrowseDirResponseSchema);
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

export async function addProjectSource(id: string, url: string): Promise<Project> {
  const { project } = await fetchJson(
    `/projects/${encodeURIComponent(id)}/sources`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ url }) },
    ProjectResponseSchema,
  );
  return project;
}

export async function removeProjectSource(id: string, sourceId: string): Promise<Project> {
  const { project } = await fetchJson(
    `/projects/${encodeURIComponent(id)}/sources/${encodeURIComponent(sourceId)}`,
    { method: 'DELETE' },
    ProjectResponseSchema,
  );
  return project;
}

export async function reorderProjectSources(id: string, sourceIds: string[]): Promise<Project> {
  const { project } = await fetchJson(
    `/projects/${encodeURIComponent(id)}/sources/reorder`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ sourceIds }) },
    ProjectResponseSchema,
  );
  return project;
}

// --- Knowledge base (global sources, applied to every project) ---

export async function getKnowledgeSources(): Promise<GlobalSource[]> {
  const { sources } = await fetchJson('/knowledge/sources', undefined, GlobalSourcesResponseSchema);
  return sources;
}

export async function addKnowledgeSource(url: string): Promise<GlobalSource[]> {
  const { sources } = await fetchJson(
    '/knowledge/sources',
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ url }) },
    GlobalSourcesResponseSchema,
  );
  return sources;
}

export async function removeKnowledgeSource(id: string): Promise<GlobalSource[]> {
  const { sources } = await fetchJson(
    `/knowledge/sources/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
    GlobalSourcesResponseSchema,
  );
  return sources;
}

export async function reorderKnowledgeSources(sourceIds: string[]): Promise<GlobalSource[]> {
  const { sources } = await fetchJson(
    '/knowledge/sources/reorder',
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ sourceIds }) },
    GlobalSourcesResponseSchema,
  );
  return sources;
}

// --- Memories (markdown knowledge entries, global or project-scoped) ---

export async function getMemories(): Promise<Memory[]> {
  const { memories } = await fetchJson('/memories', undefined, MemoriesResponseSchema);
  return memories;
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

export async function rotateWorkflowWebhook(id: string): Promise<WebhookInfoResponse> {
  return fetchJson(
    `/workflows/${encodeURIComponent(id)}/webhook/rotate`,
    { method: 'POST' },
    WebhookInfoResponseSchema,
  );
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

// --- Councils (participant panels + anonymized debate runs) ---

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

export async function createCouncilParticipant(
  councilId: string,
  body: CreateCouncilParticipantRequest,
): Promise<CouncilParticipant> {
  const { participant } = await fetchJson(
    `/councils/${encodeURIComponent(councilId)}/participants`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) },
    CouncilParticipantResponseSchema,
  );
  return participant;
}

export async function updateCouncilParticipant(
  councilId: string,
  participantId: string,
  body: UpdateCouncilParticipantRequest,
): Promise<CouncilParticipant> {
  const { participant } = await fetchJson(
    `/councils/${encodeURIComponent(councilId)}/participants/${encodeURIComponent(participantId)}`,
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(body) },
    CouncilParticipantResponseSchema,
  );
  return participant;
}

export async function deleteCouncilParticipant(
  councilId: string,
  participantId: string,
): Promise<void> {
  await fetchJson(
    `/councils/${encodeURIComponent(councilId)}/participants/${encodeURIComponent(participantId)}`,
    { method: 'DELETE' },
  );
}

export async function reorderCouncilParticipants(
  councilId: string,
  participantIds: string[],
): Promise<CouncilParticipant[]> {
  const { council } = await fetchJson(
    `/councils/${encodeURIComponent(councilId)}/participants/reorder`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ participantIds }) },
    CouncilResponseSchema,
  );
  return council.participants;
}

export async function startCouncilRun(councilId: string, topic: string): Promise<CouncilRun> {
  const { run } = await fetchJson(
    `/councils/${encodeURIComponent(councilId)}/runs`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ topic }) },
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

export async function skipCouncilRunParticipant(
  councilId: string,
  runId: string,
  runParticipantId: string,
): Promise<CouncilRun> {
  const { run } = await fetchJson(
    `/councils/${encodeURIComponent(councilId)}/runs/${encodeURIComponent(runId)}/participants/${encodeURIComponent(runParticipantId)}/skip`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({}) },
    CouncilRunResponseSchema,
  );
  return run;
}

export async function retryCouncilRunParticipant(
  councilId: string,
  runId: string,
  runParticipantId: string,
): Promise<CouncilRun> {
  const { run } = await fetchJson(
    `/councils/${encodeURIComponent(councilId)}/runs/${encodeURIComponent(runId)}/participants/${encodeURIComponent(runParticipantId)}/retry`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({}) },
    CouncilRunResponseSchema,
  );
  return run;
}

export async function retryCouncilVerdict(councilId: string, runId: string): Promise<CouncilRun> {
  const { run } = await fetchJson(
    `/councils/${encodeURIComponent(councilId)}/runs/${encodeURIComponent(runId)}/verdict/retry`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({}) },
    CouncilRunResponseSchema,
  );
  return run;
}

// --- Brainstorms (contributor panels + mode-based synthesis runs) ---

export async function getBrainstorms(): Promise<Brainstorm[]> {
  return fetchJson('/brainstorms', undefined, z.array(BrainstormSchema));
}

export async function getBrainstorm(id: string): Promise<Brainstorm> {
  const { brainstorm } = await fetchJson(
    `/brainstorms/${encodeURIComponent(id)}`,
    undefined,
    BrainstormResponseSchema,
  );
  return brainstorm;
}

export async function createBrainstorm(body: CreateBrainstormRequest): Promise<Brainstorm> {
  const { brainstorm } = await fetchJson(
    '/brainstorms',
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) },
    BrainstormResponseSchema,
  );
  return brainstorm;
}

export async function updateBrainstorm(
  id: string,
  body: UpdateBrainstormRequest,
): Promise<Brainstorm> {
  const { brainstorm } = await fetchJson(
    `/brainstorms/${encodeURIComponent(id)}`,
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(body) },
    BrainstormResponseSchema,
  );
  return brainstorm;
}

export async function deleteBrainstorm(id: string): Promise<void> {
  await fetchJson(`/brainstorms/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function createBrainstormContributor(
  brainstormId: string,
  body: CreateBrainstormContributorRequest,
): Promise<BrainstormContributor> {
  const { contributor } = await fetchJson(
    `/brainstorms/${encodeURIComponent(brainstormId)}/contributors`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) },
    BrainstormContributorResponseSchema,
  );
  return contributor;
}

export async function updateBrainstormContributor(
  brainstormId: string,
  contributorId: string,
  body: UpdateBrainstormContributorRequest,
): Promise<BrainstormContributor> {
  const { contributor } = await fetchJson(
    `/brainstorms/${encodeURIComponent(brainstormId)}/contributors/${encodeURIComponent(contributorId)}`,
    { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(body) },
    BrainstormContributorResponseSchema,
  );
  return contributor;
}

export async function deleteBrainstormContributor(
  brainstormId: string,
  contributorId: string,
): Promise<void> {
  await fetchJson(
    `/brainstorms/${encodeURIComponent(brainstormId)}/contributors/${encodeURIComponent(contributorId)}`,
    { method: 'DELETE' },
  );
}

export async function reorderBrainstormContributors(
  brainstormId: string,
  contributorIds: string[],
): Promise<BrainstormContributor[]> {
  const { brainstorm } = await fetchJson(
    `/brainstorms/${encodeURIComponent(brainstormId)}/contributors/reorder`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ contributorIds }) },
    BrainstormResponseSchema,
  );
  return brainstorm.contributors;
}

export async function startBrainstormRun(
  brainstormId: string,
  prompt: string,
  mode?: BrainstormSynthMode,
): Promise<BrainstormRun> {
  const { run } = await fetchJson(
    `/brainstorms/${encodeURIComponent(brainstormId)}/runs`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ prompt, mode }) },
    BrainstormRunResponseSchema,
  );
  return run;
}

export async function listBrainstormRuns(brainstormId: string): Promise<BrainstormRun[]> {
  const { runs } = await fetchJson(
    `/brainstorms/${encodeURIComponent(brainstormId)}/runs`,
    undefined,
    BrainstormRunsResponseSchema,
  );
  return runs;
}

export async function getBrainstormRun(
  brainstormId: string,
  runId: string,
): Promise<BrainstormRun> {
  const { run } = await fetchJson(
    `/brainstorms/${encodeURIComponent(brainstormId)}/runs/${encodeURIComponent(runId)}`,
    undefined,
    BrainstormRunResponseSchema,
  );
  return run;
}

export async function skipBrainstormRunContributor(
  brainstormId: string,
  runId: string,
  runContributorId: string,
): Promise<BrainstormRun> {
  const { run } = await fetchJson(
    `/brainstorms/${encodeURIComponent(brainstormId)}/runs/${encodeURIComponent(runId)}/contributors/${encodeURIComponent(runContributorId)}/skip`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({}) },
    BrainstormRunResponseSchema,
  );
  return run;
}

export async function retryBrainstormRunContributor(
  brainstormId: string,
  runId: string,
  runContributorId: string,
): Promise<BrainstormRun> {
  const { run } = await fetchJson(
    `/brainstorms/${encodeURIComponent(brainstormId)}/runs/${encodeURIComponent(runId)}/contributors/${encodeURIComponent(runContributorId)}/retry`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({}) },
    BrainstormRunResponseSchema,
  );
  return run;
}

export async function retryBrainstormSynthesis(
  brainstormId: string,
  runId: string,
  mode?: BrainstormSynthMode,
): Promise<BrainstormRun> {
  const { run } = await fetchJson(
    `/brainstorms/${encodeURIComponent(brainstormId)}/runs/${encodeURIComponent(runId)}/synthesis/retry`,
    { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ mode }) },
    BrainstormRunResponseSchema,
  );
  return run;
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
