import {
  BulkCreateTaskResponseSchema,
  StatusSchema,
  TaskSchema,
  type BulkCreateTaskRequest,
  type BulkCreateTaskResponse,
  type Status,
  type Task,
} from '@midnite/shared';

/** Batch-wide defaults applied to every task in a create (single or bulk). */
export interface TaskDefaults {
  repo?: string;
  projectId?: string;
  priority?: number;
}

/** Resolve the gateway base URL: explicit flag → env → loopback default. */
export function resolveBaseUrl(flag?: string): string {
  return (flag || process.env['MIDNITE_GATEWAY_URL'] || 'http://localhost:7777').replace(/\/$/, '');
}

export interface GatewayClient {
  listTasks(status?: string): Promise<Task[]>;
  createTask(prompt: string, defaults?: TaskDefaults): Promise<Task>;
  createBulk(raw: string, defaults?: TaskDefaults): Promise<BulkCreateTaskResponse>;
  moveTask(id: string, status: Status): Promise<Task>;
}

/** A thin typed client over the gateway REST API. Responses are validated with
 *  the shared zod schemas, so a contract drift surfaces here, not downstream. */
export function createClient(baseUrl: string): GatewayClient {
  async function request(path: string, init: RequestInit): Promise<unknown> {
    let res: Response;
    try {
      res = await fetch(`${baseUrl}${path}`, init);
    } catch (err) {
      throw new Error(
        `cannot reach the midnite gateway at ${baseUrl} — is it running? (${err instanceof Error ? err.message : 'network error'})`,
      );
    }
    if (!res.ok) {
      let detail = '';
      try {
        const body = (await res.json()) as { message?: unknown };
        if (body?.message) detail = `: ${String(body.message)}`;
      } catch {
        // non-JSON error body
      }
      throw new Error(`gateway responded ${res.status}${detail}`);
    }
    return res.json();
  }

  return {
    async listTasks(status?: string): Promise<Task[]> {
      const query = status ? `?status=${encodeURIComponent(status)}` : '';
      return TaskSchema.array().parse(await request(`/tasks${query}`, { method: 'GET' }));
    },

    async createTask(prompt: string, defaults?: TaskDefaults): Promise<Task> {
      const form = new FormData();
      form.set('prompt', prompt);
      if (defaults?.repo) form.set('repo', defaults.repo);
      if (defaults?.projectId) form.set('projectId', defaults.projectId);
      if (defaults?.priority !== undefined) form.set('priority', String(defaults.priority));
      const body = (await request('/tasks', { method: 'POST', body: form })) as { task: unknown };
      return TaskSchema.parse(body.task);
    },

    async createBulk(raw: string, defaults?: TaskDefaults): Promise<BulkCreateTaskResponse> {
      const payload: BulkCreateTaskRequest = {
        raw,
        repo: defaults?.repo,
        projectId: defaults?.projectId,
        priority: defaults?.priority,
      };
      return BulkCreateTaskResponseSchema.parse(
        await request('/tasks/bulk', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        }),
      );
    },

    async moveTask(id: string, status: Status): Promise<Task> {
      return TaskSchema.parse(
        await request(`/tasks/${encodeURIComponent(id)}/status`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status }),
        }),
      );
    },
  };
}

/** Validate a raw status string against the task state machine. */
export function parseStatus(raw: string): Status {
  const parsed = StatusSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`invalid status "${raw}" — expected one of: ${StatusSchema.options.join(', ')}`);
  }
  return parsed.data;
}
