import {
  CreatePlanTasksResponseSchema,
  CreateTaskResponseSchema,
  DraftPlanResponseSchema,
  EnhanceDescriptionResponseSchema,
  ProjectResponseSchema,
  ProjectSchema,
  SessionSummarySchema,
  SessionTranscriptSchema,
  TaskCountsSchema,
  TaskSchema,
  type CreateProjectRequest,
  type CreateTaskResponse,
  type DraftPlanResponse,
  type Project,
  type SessionSummary,
  type SessionTranscript,
  type Task,
  type TaskCounts,
  type UpdateProjectRequest,
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

async function fetchJson<T>(path: string, init?: RequestInit, schema?: z.ZodSchema<T>): Promise<T> {
  const res = await fetch(`${gatewayUrl()}${path}`, { cache: 'no-store', ...init });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${text ? `: ${text}` : ''}`);
  }
  const body = (await res.json()) as unknown;
  return schema ? schema.parse(body) : (body as T);
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
