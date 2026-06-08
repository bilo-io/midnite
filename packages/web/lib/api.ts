import {
  AgentPingResponseSchema,
  CreatePlanTasksResponseSchema,
  CreateTaskResponseSchema,
  DraftPlanResponseSchema,
  EnhanceDescriptionResponseSchema,
  ProjectResponseSchema,
  ProjectSchema,
  RunResponseSchema,
  SessionSummarySchema,
  SessionTranscriptSchema,
  TaskCountsSchema,
  TaskSchema,
  TerminalTokenResponseSchema,
  WebhookInfoResponseSchema,
  WorkflowResponseSchema,
  WorkflowRunSchema,
  WorkflowSummarySchema,
  type CreateProjectRequest,
  type CreateTaskResponse,
  type CreateWorkflowRequest,
  type DraftPlanResponse,
  type Project,
  type SessionSummary,
  type SessionTranscript,
  type AgentPingResponse,
  type Task,
  type TaskCounts,
  type TerminalTokenResponse,
  type UpdateProjectRequest,
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

export async function getProjects(): Promise<Project[]> {
  return fetchJson('/projects', undefined, z.array(ProjectSchema));
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
