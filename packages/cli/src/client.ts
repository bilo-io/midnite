import {
  ApprovalLogResponseSchema,
  AuthResponseSchema,
  BreakdownPreviewResponseSchema,
  BreakdownSchema,
  BulkCreateTaskResponseSchema,
  CheckRunListResponseSchema,
  CreateFromBreakdownResponseSchema,
  GuardrailsResponseSchema,
  InstallTemplateRequestSchema,
  RunResponseSchema,
  SearchResponseSchema,
  StatusSchema,
  TaskFailuresResponseSchema,
  TaskSchema,
  TasksDoctorReportSchema,
  TemplateSlotsResponseSchema,
  TerminalTokenResponseSchema,
  TriggerCheckResponseSchema,
  UserSchema,
  WorkflowRunSchema,
  WorkflowSchema,
  WorkflowSummarySchema,
  WorkflowTemplatesResponseSchema,
  type ApprovalLogResponse,
  type AuthResponse,
  type Breakdown,
  type BreakdownPreviewResponse,
  type BulkCreateTaskRequest,
  type BulkCreateTaskResponse,
  type CheckRun,
  type CreateFromBreakdownResponse,
  type GuardrailsResponse,
  type InstallTemplateRequest,
  type PauseScope,
  type ResolveTaskAction,
  type SearchQuery,
  type SearchResponse,
  type Status,
  type FailureClass,
  type Task,
  type TaskFailure,
  type TasksDoctorReport,
  type TemplateSlotsResponse,
  type TerminalTokenResponse,
  type User,
  type Workflow,
  type WorkflowRun,
  type WorkflowSummary,
  type WorkflowTemplateSummary,
} from '@midnite/shared';

/** Batch-wide defaults applied to every task in a create (single or bulk). */
export interface TaskDefaults {
  repo?: string;
  projectId?: string;
  priority?: number;
  /** Blocker task ids (single `add` only — a per-line bulk blocker makes no sense). */
  dependsOn?: string[];
}

/** Resolve the gateway base URL: explicit flag → env → loopback default. */
export function resolveBaseUrl(flag?: string): string {
  return (flag || process.env['MIDNITE_GATEWAY_URL'] || 'http://localhost:7777').replace(/\/$/, '');
}

export interface GatewayClient {
  /** Authenticate and return tokens + user. */
  login(email: string, password: string): Promise<AuthResponse>;
  /** Revoke the current session (best-effort; never throws). */
  logout(): Promise<void>;
  /** Return the currently authenticated user, or throw on 401. */
  whoami(): Promise<User>;
  listTasks(status?: string): Promise<Task[]>;
  createTask(prompt: string, defaults?: TaskDefaults): Promise<Task>;
  createBulk(raw: string, defaults?: TaskDefaults): Promise<BulkCreateTaskResponse>;
  moveTask(id: string, status: Status): Promise<Task>;
  resolveTask(id: string, action: ResolveTaskAction, prompt?: string): Promise<Task>;
  listRecentFailures(opts?: { class?: FailureClass; limit?: number }): Promise<TaskFailure[]>;
  tasksDoctor(): Promise<TasksDoctorReport>;
  setPriority(id: string, priority: number): Promise<Task>;
  addDependency(id: string, dependsOnId: string): Promise<Task>;
  removeDependency(id: string, dependsOnId: string): Promise<Task>;
  search(query: SearchQuery): Promise<SearchResponse>;
  listWorkflows(): Promise<WorkflowSummary[]>;
  getWorkflow(id: string): Promise<Workflow>;
  runWorkflow(id: string): Promise<WorkflowRun>;
  listWorkflowRuns(id: string): Promise<WorkflowRun[]>;
  getWorkflowRun(id: string, runId: string): Promise<WorkflowRun>;
  triggerCheck(taskId: string): Promise<CheckRun>;
  getCheckRuns(taskId: string): Promise<CheckRun[]>;
  /** A task thread serialized as markdown (the gateway's `taskToMarkdown`). */
  exportTask(taskId: string): Promise<string>;
  getTerminalToken(sessionId: string): Promise<TerminalTokenResponse>;
  draftBreakdown(goal: string): Promise<BreakdownPreviewResponse>;
  createFromBreakdown(breakdown: Breakdown, repo?: string): Promise<CreateFromBreakdownResponse>;
  listTemplates(category?: string): Promise<WorkflowTemplateSummary[]>;
  getTemplateSlots(idOrSlug: string): Promise<TemplateSlotsResponse>;
  installTemplate(idOrSlug: string, body: InstallTemplateRequest): Promise<Workflow>;
  /** Read the guardrail pause state + configured caps/mode (Phase 50 F). */
  getGuardrails(): Promise<GuardrailsResponse>;
  /** Pause (`paused:true`) or resume (`false`) a scope. Admin-gated server-side. */
  setPause(scope: PauseScope, paused: boolean): Promise<GuardrailsResponse>;
  /** Emergency stop: pause a scope AND abort its in-flight agents (requeued). */
  emergencyStop(scope: PauseScope): Promise<GuardrailsResponse>;
  /** Recent act-path approval decisions (for `guardrails status` denials). The
   *  server applies its own defaults, so only the paging knobs are accepted. */
  getApprovalLog(query?: { limit?: number; page?: number }): Promise<ApprovalLogResponse>;
}

/** A thin typed client over the gateway REST API. Responses are validated with
 *  the shared zod schemas, so a contract drift surfaces here, not downstream. */
export function createClient(baseUrl: string, token?: string): GatewayClient {
  // Fetch with uniform connection-error + non-2xx handling, returning the raw
  // Response. Callers decode it as JSON (`request`) or text (`exportTask`).
  async function fetchOk(path: string, init: RequestInit): Promise<Response> {
    // Merge any caller-provided Authorization header, or add the bearer token if set.
    const callerHeaders = init.headers as Record<string, string> | undefined;
    const headers: Record<string, string> = {};
    if (token) headers['authorization'] = `Bearer ${token}`;
    if (callerHeaders) Object.assign(headers, callerHeaders);

    let res: Response;
    try {
      res = await fetch(`${baseUrl}${path}`, { ...init, headers });
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
    return res;
  }

  async function request(path: string, init: RequestInit): Promise<unknown> {
    return (await fetchOk(path, init)).json();
  }

  return {
    async login(email: string, password: string): Promise<AuthResponse> {
      return AuthResponseSchema.parse(
        await request('/auth/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email, password }),
        }),
      );
    },

    async logout(): Promise<void> {
      try {
        await fetchOk('/auth/logout', { method: 'POST' });
      } catch {
        // best-effort
      }
    },

    async whoami(): Promise<User> {
      return UserSchema.parse(
        (await request('/auth/me', { method: 'GET' })) as unknown,
      );
    },

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
      // Repeatable `dependsOn` fields — the gateway collects each into the
      // blocker list (matches the multipart parse in tasks.controller).
      for (const id of defaults?.dependsOn ?? []) form.append('dependsOn', id);
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

    /** Resolve a needs-attention task (Phase 53 D): requeue / replan / abandon. */
    async resolveTask(id: string, action: ResolveTaskAction, prompt?: string): Promise<Task> {
      return TaskSchema.parse(
        await request(`/tasks/${encodeURIComponent(id)}/resolve`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action, prompt }),
        }),
      );
    },

    /** Recent failures across tasks (Phase 53 E), newest-first. */
    async listRecentFailures(opts?: { class?: FailureClass; limit?: number }): Promise<TaskFailure[]> {
      const qs = new URLSearchParams();
      if (opts?.class) qs.set('class', opts.class);
      if (opts?.limit != null) qs.set('limit', String(opts.limit));
      const q = qs.toString();
      return TaskFailuresResponseSchema.parse(
        await request(`/tasks/failures${q ? `?${q}` : ''}`, { method: 'GET' }),
      ).failures;
    },

    /** The task-health "what's wedged?" report (Phase 53 E). */
    async tasksDoctor(): Promise<TasksDoctorReport> {
      return TasksDoctorReportSchema.parse(await request('/tasks/doctor', { method: 'GET' }));
    },

    async setPriority(id: string, priority: number): Promise<Task> {
      return TaskSchema.parse(
        await request(`/tasks/${encodeURIComponent(id)}/priority`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ priority }),
        }),
      );
    },

    async addDependency(id: string, dependsOnId: string): Promise<Task> {
      return TaskSchema.parse(
        await request(`/tasks/${encodeURIComponent(id)}/dependencies`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ dependsOnId }),
        }),
      );
    },

    async removeDependency(id: string, dependsOnId: string): Promise<Task> {
      return TaskSchema.parse(
        await request(
          `/tasks/${encodeURIComponent(id)}/dependencies/${encodeURIComponent(dependsOnId)}`,
          { method: 'DELETE' },
        ),
      );
    },

    async search(query: SearchQuery): Promise<SearchResponse> {
      const params = new URLSearchParams({ q: query.q });
      if (query.type) params.set('type', query.type);
      if (query.limit !== undefined) params.set('limit', String(query.limit));
      return SearchResponseSchema.parse(
        await request(`/search?${params.toString()}`, { method: 'GET' }),
      );
    },

    async listWorkflows(): Promise<WorkflowSummary[]> {
      return WorkflowSummarySchema.array().parse(await request('/workflows', { method: 'GET' }));
    },

    async getWorkflow(id: string): Promise<Workflow> {
      const body = (await request(`/workflows/${encodeURIComponent(id)}`, { method: 'GET' })) as {
        workflow: unknown;
      };
      return WorkflowSchema.parse(body.workflow);
    },

    async runWorkflow(id: string): Promise<WorkflowRun> {
      return RunResponseSchema.parse(
        await request(`/workflows/${encodeURIComponent(id)}/run`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        }),
      ).run;
    },

    async listWorkflowRuns(id: string): Promise<WorkflowRun[]> {
      return WorkflowRunSchema.array().parse(
        await request(`/workflows/${encodeURIComponent(id)}/runs`, { method: 'GET' }),
      );
    },

    async getWorkflowRun(id: string, runId: string): Promise<WorkflowRun> {
      return RunResponseSchema.parse(
        await request(
          `/workflows/${encodeURIComponent(id)}/runs/${encodeURIComponent(runId)}`,
          { method: 'GET' },
        ),
      ).run;
    },

    async triggerCheck(taskId: string): Promise<CheckRun> {
      return TriggerCheckResponseSchema.parse(
        await request(`/tasks/${encodeURIComponent(taskId)}/check`, { method: 'POST' }),
      ).run;
    },

    async getCheckRuns(taskId: string): Promise<CheckRun[]> {
      return CheckRunListResponseSchema.parse(
        await request(`/tasks/${encodeURIComponent(taskId)}/check-runs`, { method: 'GET' }),
      ).runs;
    },

    async exportTask(taskId: string): Promise<string> {
      // The export route serves `text/markdown`, not JSON — read it as text.
      const res = await fetchOk(`/tasks/${encodeURIComponent(taskId)}/export?format=md`, {
        method: 'GET',
      });
      return res.text();
    },

    async getTerminalToken(sessionId: string): Promise<TerminalTokenResponse> {
      return TerminalTokenResponseSchema.parse(
        await request(`/sessions/${encodeURIComponent(sessionId)}/terminal-token`, { method: 'GET' }),
      );
    },

    async draftBreakdown(goal: string): Promise<BreakdownPreviewResponse> {
      return BreakdownPreviewResponseSchema.parse(
        await request('/tasks/breakdown', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ goal }),
        }),
      );
    },

    async createFromBreakdown(
      breakdown: Breakdown,
      repo?: string,
    ): Promise<CreateFromBreakdownResponse> {
      return CreateFromBreakdownResponseSchema.parse(
        await request('/tasks/breakdown/create', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ breakdown: BreakdownSchema.parse(breakdown), repo }),
        }),
      );
    },

    async listTemplates(category?: string): Promise<WorkflowTemplateSummary[]> {
      const params = new URLSearchParams({ published: 'true' });
      if (category) params.set('category', category);
      return WorkflowTemplatesResponseSchema.parse(
        await request(`/workflow-templates?${params.toString()}`, { method: 'GET' }),
      ).templates;
    },

    async getTemplateSlots(idOrSlug: string): Promise<TemplateSlotsResponse> {
      return TemplateSlotsResponseSchema.parse(
        await request(`/workflow-templates/${encodeURIComponent(idOrSlug)}/slots`, {
          method: 'GET',
        }),
      );
    },

    async installTemplate(idOrSlug: string, body: InstallTemplateRequest): Promise<Workflow> {
      const res = (await request(
        `/workflow-templates/${encodeURIComponent(idOrSlug)}/install`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(InstallTemplateRequestSchema.parse(body)),
        },
      )) as { workflow: unknown };
      return WorkflowSchema.parse(res.workflow);
    },

    async getGuardrails(): Promise<GuardrailsResponse> {
      return GuardrailsResponseSchema.parse(await request('/guardrails', { method: 'GET' }));
    },

    async setPause(scope: PauseScope, paused: boolean): Promise<GuardrailsResponse> {
      return GuardrailsResponseSchema.parse(
        await request('/guardrails/pause', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ scope, paused }),
        }),
      );
    },

    async emergencyStop(scope: PauseScope): Promise<GuardrailsResponse> {
      return GuardrailsResponseSchema.parse(
        await request('/guardrails/emergency-stop', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ scope }),
        }),
      );
    },

    async getApprovalLog(query?: { limit?: number; page?: number }): Promise<ApprovalLogResponse> {
      const qs = new URLSearchParams();
      if (query?.limit !== undefined) qs.set('limit', String(query.limit));
      if (query?.page !== undefined) qs.set('page', String(query.page));
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      return ApprovalLogResponseSchema.parse(await request(`/approvals/log${suffix}`, { method: 'GET' }));
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
