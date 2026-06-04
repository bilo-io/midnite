import {
  CreateTaskResponseSchema,
  SessionSummarySchema,
  SessionTranscriptSchema,
  TaskCountsSchema,
  TaskSchema,
  type CreateTaskResponse,
  type SessionSummary,
  type SessionTranscript,
  type Task,
  type TaskCounts,
} from '@midnite/shared';
import { z } from 'zod';

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
