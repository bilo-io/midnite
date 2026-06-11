import {
  AgentCliResponseSchema,
  CouncilParticipantResponseSchema,
  CouncilResponseSchema,
  CouncilRunResponseSchema,
  CouncilRunsResponseSchema,
  CouncilSchema,
  AgentCliStatusResponseSchema,
  AgentPingResponseSchema,
  AgentsConfigResponseSchema,
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
  type CreateProjectRequest,
  type CreateSubAgentRequest,
  type CreateTaskResponse,
  type CreateWorkflowRequest,
  type DraftPlanResponse,
  type GlobalSource,
  type CreateMemoryRequest,
  type HeartbeatRun,
  type Memory,
  type PrimaryAgent,
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
    throw new Error(`${res.status} ${res.statusText}${text ? `: ${text}` : ''}`);
  }
  const body = (await res.json()) as unknown;
  return schema ? schema.parse(body) : (body as T);
}

export async function pingAgent(): Promise<AgentPingResponse> {
  return fetchJson('/agent/ping', { method: 'POST' }, AgentPingResponseSchema);
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
    { method: 'POST', headers: JSON_HEADERS },
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
    { method: 'POST', headers: JSON_HEADERS },
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
    { method: 'POST', headers: JSON_HEADERS },
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
