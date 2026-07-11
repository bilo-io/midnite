import { z } from 'zod';
import { HTTP_METHODS } from './trigger.js';
import { LLM_PROVIDERS, LLM_PROVIDER_LABEL, LlmProviderSchema } from './llm.js';

// Node categories drive palette grouping and graph-validation rules
// (a trigger must be the graph root, etc.).
export const NODE_CATEGORIES = ['trigger', 'action', 'logic', 'data', 'storage'] as const;
export type NodeCategory = (typeof NODE_CATEGORIES)[number];

// Field descriptors let the web render a node's config form generically,
// without a bespoke component per node type.
export const NODE_FIELD_KINDS = ['string', 'text', 'number', 'boolean', 'select', 'json', 'credential'] as const;
export type NodeFieldKind = (typeof NODE_FIELD_KINDS)[number];

export interface NodeFieldOption {
  value: string;
  label: string;
}

export interface NodeField {
  key: string;
  label: string;
  kind: NodeFieldKind;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: NodeFieldOption[];
  /**
   * This field accepts `{{ }}` expressions (see `expression.ts`), so the editor
   * offers the ƒx toggle + data picker on it (Phase 12 Theme D). Set on fields
   * whose value flows into the executor as data — URLs, bodies, prompts — not on
   * structural selects (method, provider) or numeric knobs.
   */
  expressionable?: boolean;
  /** When `kind === 'credential'`, filters the picker to this credential type. */
  credentialType?: string;
}

export interface PortSpec {
  name: string;
  label?: string;
}

// The declarative contract for a node type. Lives in shared so BOTH the gateway
// executor registry (which runs the node) and the web palette/config form (which
// renders it) are driven by one source of truth. Adding an integration = one
// definition here + one executor in the gateway.
export interface NodeTypeDefinition {
  id: string;
  category: NodeCategory;
  title: string;
  description: string;
  icon: string;
  // The credential provider this node needs, if any (resolved at run time by the
  // gateway). Undefined for nodes that need no user credential (e.g. ai.claude).
  provider?: string;
  inputs: PortSpec[];
  outputs: PortSpec[];
  paramsSchema: z.ZodTypeAny;
  fields: NodeField[];
}

// --- Per-type param schemas ---

export const ManualTriggerParamsSchema = z.object({}).passthrough();
export const WebhookTriggerParamsSchema = z.object({}).passthrough();
export const TaskEventTriggerParamsSchema = z.object({}).passthrough();

export const HttpRequestParamsSchema = z.object({
  method: z.enum(HTTP_METHODS).default('GET'),
  url: z.string().url(),
  headers: z.record(z.string()).default({}),
  body: z.string().optional(),
  timeoutMs: z.number().int().positive().max(60000).default(10000),
  // When set, the engine resolves this credential server-side and injects the
  // appropriate auth header — overrides any explicit Authorization in `headers`.
  credentialId: z.string().optional(),
});

export const AiClaudeParamsSchema = z.object({
  // Which LLM provider runs this node. Omitted/blank = the gateway's active
  // provider (chosen on the Agents page); set it to pin the node to one.
  provider: z.preprocess(
    (v) => (v === '' ? undefined : v),
    LlmProviderSchema.optional(),
  ),
  model: z.string().min(1).default('sonnet4.6'),
  system: z.string().optional(),
  prompt: z.string().min(1),
  maxTokens: z.number().int().positive().max(8192).default(1024),
});

const PROVIDER_FIELD_OPTIONS = [
  { value: '', label: 'Active provider' },
  ...LLM_PROVIDERS.map((p) => ({ value: p, label: LLM_PROVIDER_LABEL[p] })),
];

// Comparison operators for the Branch node. `isTruthy`/`isFalsy` ignore `right`.
export const BRANCH_OPERATORS = [
  'isTruthy',
  'isFalsy',
  'equals',
  'notEquals',
  'contains',
  'gt',
  'gte',
  'lt',
  'lte',
] as const;
export type BranchOperator = (typeof BRANCH_OPERATORS)[number];

export const BranchParamsSchema = z.object({
  // Dot-path into the incoming data (e.g. `body.ok`). Blank means the whole input.
  left: z.string().default(''),
  operator: z.enum(BRANCH_OPERATORS).default('isTruthy'),
  right: z.string().optional(),
});

// --- Integration node params (Phase 14 Theme C) ---

// slack.message — post a message to a Slack channel via a `slack` credential.
// `blocks` is optional Slack Block Kit: when present it renders the rich message
// and `text` is the notification fallback. It's expressionable, so before the
// engine resolves it the value is a `{{ … }}` string — hence the union (a bare
// span resolves to the typed array at run time; see build-digest's `blocks`).
export const SlackMessageParamsSchema = z.object({
  credentialId: z.string().min(1),
  channel: z.string().min(1),
  text: z.string().min(1),
  blocks: z.union([z.array(z.unknown()), z.string()]).optional(),
});
export type SlackMessageParams = z.infer<typeof SlackMessageParamsSchema>;

// github.get-pr — fetch pull-request metadata via a `github` credential.
// `prUrl` is the full HTML URL (e.g. https://github.com/owner/repo/pull/42).
export const GithubGetPrParamsSchema = z.object({
  credentialId: z.string().min(1),
  prUrl: z.string().min(1),
});
export type GithubGetPrParams = z.infer<typeof GithubGetPrParamsSchema>;

// github.get-diff — fetch the unified diff for a PR.
// `maxTokens` controls truncation (default 8 000; 1 token ≈ 4 chars).
export const GithubGetDiffParamsSchema = z.object({
  credentialId: z.string().min(1),
  prUrl: z.string().min(1),
  maxTokens: z.number().int().positive().default(8000),
});
export type GithubGetDiffParams = z.infer<typeof GithubGetDiffParamsSchema>;

// github.post-review — submit a review comment on a PR.
export const GITHUB_REVIEW_EVENTS = ['COMMENT', 'APPROVE', 'REQUEST_CHANGES'] as const;
export const GithubPostReviewParamsSchema = z.object({
  credentialId: z.string().min(1),
  prUrl: z.string().min(1),
  body: z.string().min(1),
  event: z.enum(GITHUB_REVIEW_EVENTS).default('COMMENT'),
});
export type GithubPostReviewParams = z.infer<typeof GithubPostReviewParamsSchema>;

// email.send — send an email via SMTP using a `smtp` credential.
export const EmailSendParamsSchema = z.object({
  credentialId: z.string().min(1),
  to: z.string().min(1),
  subject: z.string().min(1),
  text: z.string().optional(),
  html: z.string().optional(),
});
export type EmailSendParams = z.infer<typeof EmailSendParamsSchema>;

// --- Reshape node params (Phase 12 Theme C) ---
// These three are pure data-flow nodes: they consume the engine's
// resolve-before-execute (Theme B), so their expression-valued fields arrive
// already resolved. No credentials, no network, no persistence.

// logic.setData — build an object from key → value pairs (values may be `{{expr}}`,
// resolved by the engine before the executor runs). `merge` keeps the incoming
// input and overlays the set fields; `replace` emits only the set fields.
export const SET_DATA_MODES = ['replace', 'merge'] as const;
export const SetDataParamsSchema = z.object({
  mode: z.enum(SET_DATA_MODES).default('replace'),
  fields: z.record(z.string(), z.unknown()).default({}),
});

// logic.merge — fan-in: combine the outputs of multiple upstream branches (the
// engine hands a multi-predecessor node an array of their outputs).
//   shallowMerge — Object.assign the object inputs left-to-right
//   array        — collect the inputs into an array as-is
//   concat       — concatenate array inputs (non-arrays are wrapped)
export const MERGE_MODES = ['shallowMerge', 'array', 'concat'] as const;
export const MergeParamsSchema = z.object({
  mode: z.enum(MERGE_MODES).default('shallowMerge'),
});

// data.filter — pick or omit a set of top-level fields from the input object.
export const FILTER_MODES = ['pick', 'omit'] as const;
export const DataFilterParamsSchema = z.object({
  mode: z.enum(FILTER_MODES).default('pick'),
  fields: z.array(z.string()).default([]),
});

// --- Storage node params (Phase 12 Theme C) ---
// A persisted key-value store scoped per workflow: `storage.set` stashes a value
// under a key, `storage.get` reads it back — within the same run via {{$node}} or
// across later runs. Key/value flow through the engine's resolve-before-execute,
// so both may be `{{expr}}`. A missing key reads back `defaultValue` (default null)
// rather than hard-failing, since the first run legitimately finds nothing stored.
export const StorageSetParamsSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
});

export const StorageGetParamsSchema = z.object({
  key: z.string().min(1),
  defaultValue: z.unknown(),
});

// task.create — enqueue a midnite board task (e.g. a recurring task fired by a
// schedule trigger). `prompt` is expression-enabled so a scheduled task can
// interpolate run context; `priority` is the 0–3 scheduling band (defaults Normal).
export const TaskCreateParamsSchema = z.object({
  prompt: z.string().min(1),
  repo: z.string().optional(),
  projectId: z.string().optional(),
  priority: z.number().int().min(0).max(3).optional(),
});
export type TaskCreateParams = z.infer<typeof TaskCreateParamsSchema>;

// --- Reporting nodes (Phase 62 Theme C) ---
// The workflow vocabulary for reporting: build a task retrospective narrative,
// list terminal tasks in a window, roll them up into a fleet digest, and post an
// in-app notification. Each is a thin executor over a real gateway service.

// midnite.generate-retro — attach an LLM narrative to a task's retro skeleton.
// `taskId` is optional: when blank the executor reads it from the upstream input
// (e.g. a task-event trigger's task), so a `[trigger.task-event] → [generate-retro]`
// workflow needs no config.
export const GenerateRetroParamsSchema = z.object({
  taskId: z.string().optional(),
});
export type GenerateRetroParams = z.infer<typeof GenerateRetroParamsSchema>;

// midnite.list-completed-tasks — the terminal (done/abandoned) tasks whose last
// transition falls in a trailing window, optionally scoped to a repo/project.
export const ListCompletedTasksParamsSchema = z.object({
  /** Trailing window length in hours (default 24). */
  sinceHours: z.number().int().positive().max(8760).default(24),
  repo: z.string().optional(),
  projectId: z.string().optional(),
});
export type ListCompletedTasksParams = z.infer<typeof ListCompletedTasksParamsSchema>;

// midnite.build-digest — roll a window of terminal tasks up into a fleet digest
// (counts, per-repo sections, highlights, best-effort spend + cycle-time, an LLM
// headline). Uses the upstream list-completed-tasks output when present, else
// queries the window itself. `from`/`to` (ISO) override `sinceHours` when both set.
export const BuildDigestParamsSchema = z.object({
  sinceHours: z.number().int().positive().max(8760).default(24),
  from: z.string().optional(),
  to: z.string().optional(),
  repo: z.string().optional(),
  projectId: z.string().optional(),
});
export type BuildDigestParams = z.infer<typeof BuildDigestParamsSchema>;

// midnite.notify — post an in-app notification (the digest/retro reporting kinds).
export const NOTIFY_NODE_KINDS = ['digest.generated', 'retro.notable'] as const;
export const NOTIFY_NODE_SEVERITIES = ['info', 'warn', 'urgent'] as const;
export const NotifyParamsSchema = z.object({
  kind: z.enum(NOTIFY_NODE_KINDS).default('digest.generated'),
  severity: z.enum(NOTIFY_NODE_SEVERITIES).default('info'),
  title: z.string().min(1),
  body: z.string().min(1),
  /** Optional entity id the notification points at (task/digest id). */
  entityId: z.string().optional(),
  /** Optional client route to open (defaults applied downstream). */
  route: z.string().optional(),
});
export type NotifyParams = z.infer<typeof NotifyParamsSchema>;

export type HttpRequestParams = z.infer<typeof HttpRequestParamsSchema>;
export type AiClaudeParams = z.infer<typeof AiClaudeParamsSchema>;
export type BranchParams = z.infer<typeof BranchParamsSchema>;
export type SetDataParams = z.infer<typeof SetDataParamsSchema>;
export type MergeParams = z.infer<typeof MergeParamsSchema>;
export type DataFilterParams = z.infer<typeof DataFilterParamsSchema>;
export type StorageSetParams = z.infer<typeof StorageSetParamsSchema>;
export type StorageGetParams = z.infer<typeof StorageGetParamsSchema>;

// The two output ports of a Branch node — also the sourcePort values on its edges.
export const BRANCH_PORTS = ['true', 'false'] as const;
export type BranchPort = (typeof BRANCH_PORTS)[number];

function resolvePath(input: unknown, path: string): unknown {
  const trimmed = path.trim();
  if (!trimmed) return input;
  let cur: unknown = input;
  for (const key of trimmed.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

/**
 * Evaluate a Branch node's condition against its input. Pure and total — never throws
 * for runtime input (params are re-parsed with defaults). Shared so the gateway engine
 * and any future client-side preview agree on the exact semantics.
 */
export function evaluateBranchCondition(input: unknown, rawParams: Record<string, unknown>): boolean {
  const { left, operator, right } = BranchParamsSchema.parse(rawParams);
  const value = resolvePath(input, left);
  const rhs = right ?? '';
  switch (operator) {
    case 'isTruthy':
      return Boolean(value);
    case 'isFalsy':
      return !value;
    case 'equals':
      return String(value) === rhs;
    case 'notEquals':
      return String(value) !== rhs;
    case 'contains':
      return String(value ?? '').includes(rhs);
    case 'gt':
      return Number(value) > Number(rhs);
    case 'gte':
      return Number(value) >= Number(rhs);
    case 'lt':
      return Number(value) < Number(rhs);
    case 'lte':
      return Number(value) <= Number(rhs);
    default:
      return false;
  }
}

// --- The registry ---

const NO_INPUTS: PortSpec[] = [];
const MAIN_IN: PortSpec[] = [{ name: 'main' }];
const MAIN_OUT: PortSpec[] = [{ name: 'main' }];

export const NODE_TYPE_DEFINITIONS: Record<string, NodeTypeDefinition> = {
  'trigger.manual': {
    id: 'trigger.manual',
    category: 'trigger',
    title: 'Manual Trigger',
    description: 'Run on demand with the Play button.',
    icon: 'play',
    inputs: NO_INPUTS,
    outputs: MAIN_OUT,
    paramsSchema: ManualTriggerParamsSchema,
    fields: [],
  },
  'trigger.webhook': {
    id: 'trigger.webhook',
    category: 'trigger',
    title: 'Webhook',
    description: 'Run when an inbound HTTP request arrives.',
    icon: 'webhook',
    inputs: NO_INPUTS,
    outputs: MAIN_OUT,
    paramsSchema: WebhookTriggerParamsSchema,
    fields: [],
  },
  'trigger.task-event': {
    id: 'trigger.task-event',
    category: 'trigger',
    title: 'Task Event',
    description: 'Run when a task finishes, is abandoned, or needs attention.',
    icon: 'check-circle',
    inputs: NO_INPUTS,
    outputs: MAIN_OUT,
    paramsSchema: TaskEventTriggerParamsSchema,
    fields: [],
  },
  'http.request': {
    id: 'http.request',
    category: 'action',
    title: 'HTTP Request',
    description: 'Make an outbound HTTP call.',
    icon: 'globe',
    inputs: MAIN_IN,
    outputs: MAIN_OUT,
    paramsSchema: HttpRequestParamsSchema,
    fields: [
      {
        key: 'method',
        label: 'Method',
        kind: 'select',
        required: true,
        options: HTTP_METHODS.map((m) => ({ value: m, label: m })),
      },
      { key: 'url', label: 'URL', kind: 'string', required: true, placeholder: 'https://api.github.com/repos/owner/repo', expressionable: true },
      { key: 'headers', label: 'Headers', kind: 'json', help: 'JSON object of header name → value.', expressionable: true },
      { key: 'body', label: 'Body', kind: 'text', placeholder: 'Raw request body', expressionable: true },
      { key: 'credentialId', label: 'Credential', kind: 'credential', help: 'Optional: inject auth from a saved credential (bearer / basic / header).', credentialType: 'http-bearer' },
    ],
  },
  'ai.claude': {
    id: 'ai.claude',
    category: 'action',
    title: 'AI',
    description: 'Run an AI completion via the active provider, or pin one.',
    icon: 'bot',
    inputs: MAIN_IN,
    outputs: MAIN_OUT,
    paramsSchema: AiClaudeParamsSchema,
    fields: [
      {
        key: 'provider',
        label: 'Provider',
        kind: 'select',
        options: PROVIDER_FIELD_OPTIONS,
        help: 'Leave on "Active provider" to follow the Agents-page selection.',
      },
      { key: 'model', label: 'Model', kind: 'string', placeholder: 'sonnet4.6' },
      { key: 'system', label: 'System prompt', kind: 'text', expressionable: true },
      { key: 'prompt', label: 'Prompt', kind: 'text', required: true, expressionable: true },
      { key: 'maxTokens', label: 'Max tokens', kind: 'number' },
    ],
  },
  'task.create': {
    id: 'task.create',
    category: 'action',
    title: 'Create task',
    description: 'Create a midnite board task — e.g. enqueue a recurring task on a schedule.',
    icon: 'list-plus',
    inputs: MAIN_IN,
    outputs: MAIN_OUT,
    paramsSchema: TaskCreateParamsSchema,
    fields: [
      { key: 'prompt', label: 'Task prompt', kind: 'text', required: true, expressionable: true, placeholder: 'What should the agent do?' },
      { key: 'repo', label: 'Repo', kind: 'string', expressionable: true, help: 'Optional: a registered repo name.' },
      { key: 'projectId', label: 'Project', kind: 'string', help: 'Optional: project id to file the task under.' },
      { key: 'priority', label: 'Priority', kind: 'number', help: '0–3 (higher runs first); defaults to Normal (1).' },
    ],
  },
  // --- Reporting nodes (Phase 62 Theme C) ---
  'midnite.generate-retro': {
    id: 'midnite.generate-retro',
    category: 'action',
    title: 'Generate Retro',
    description: "Attach an AI narrative to a completed task's retrospective.",
    icon: 'file-text',
    inputs: MAIN_IN,
    outputs: MAIN_OUT,
    paramsSchema: GenerateRetroParamsSchema,
    fields: [
      {
        key: 'taskId',
        label: 'Task ID',
        kind: 'string',
        expressionable: true,
        placeholder: 'Leave blank to use the incoming task',
        help: 'Optional: the task to summarise. Defaults to the upstream task (e.g. a task-event trigger).',
      },
    ],
  },
  'midnite.list-completed-tasks': {
    id: 'midnite.list-completed-tasks',
    category: 'action',
    title: 'List Completed Tasks',
    description: 'List tasks that finished or were abandoned in a trailing window.',
    icon: 'list-checks',
    inputs: MAIN_IN,
    outputs: MAIN_OUT,
    paramsSchema: ListCompletedTasksParamsSchema,
    fields: [
      { key: 'sinceHours', label: 'Since (hours)', kind: 'number', help: 'How far back to look. Default 24.' },
      { key: 'repo', label: 'Repo', kind: 'string', expressionable: true, help: 'Optional: only this repo.' },
      { key: 'projectId', label: 'Project', kind: 'string', help: 'Optional: only this project.' },
    ],
  },
  'midnite.build-digest': {
    id: 'midnite.build-digest',
    category: 'action',
    title: 'Build Digest',
    description: 'Roll completed tasks up into a fleet digest (counts, sections, highlights).',
    icon: 'newspaper',
    inputs: MAIN_IN,
    outputs: MAIN_OUT,
    paramsSchema: BuildDigestParamsSchema,
    fields: [
      { key: 'sinceHours', label: 'Since (hours)', kind: 'number', help: 'Window length. Ignored when From/To are both set. Default 24.' },
      { key: 'from', label: 'From (ISO)', kind: 'string', expressionable: true, help: 'Optional explicit window start.' },
      { key: 'to', label: 'To (ISO)', kind: 'string', expressionable: true, help: 'Optional explicit window end.' },
      { key: 'repo', label: 'Repo', kind: 'string', expressionable: true, help: 'Optional: only this repo.' },
      { key: 'projectId', label: 'Project', kind: 'string', help: 'Optional: only this project.' },
    ],
  },
  'midnite.notify': {
    id: 'midnite.notify',
    category: 'action',
    title: 'Notify',
    description: 'Post an in-app notification (e.g. a digest is ready, a retro is notable).',
    icon: 'bell',
    inputs: MAIN_IN,
    outputs: MAIN_OUT,
    paramsSchema: NotifyParamsSchema,
    fields: [
      {
        key: 'kind',
        label: 'Kind',
        kind: 'select',
        required: true,
        options: [
          { value: 'digest.generated', label: 'Digest generated' },
          { value: 'retro.notable', label: 'Notable retro' },
        ],
      },
      {
        key: 'severity',
        label: 'Severity',
        kind: 'select',
        options: [
          { value: 'info', label: 'Info' },
          { value: 'warn', label: 'Warning' },
          { value: 'urgent', label: 'Urgent' },
        ],
      },
      { key: 'title', label: 'Title', kind: 'string', required: true, expressionable: true },
      { key: 'body', label: 'Body', kind: 'text', required: true, expressionable: true },
      { key: 'entityId', label: 'Entity ID', kind: 'string', expressionable: true, help: 'Optional: the task/digest id to link to.' },
      { key: 'route', label: 'Route', kind: 'string', expressionable: true, help: 'Optional: client route to open.' },
    ],
  },
  'logic.branch': {
    id: 'logic.branch',
    category: 'logic',
    title: 'Branch',
    description: 'Split the flow into a true and a false path based on a condition.',
    icon: 'git-branch',
    inputs: MAIN_IN,
    // Two output ports — the engine activates exactly one per run.
    outputs: [
      { name: 'true', label: 'True' },
      { name: 'false', label: 'False' },
    ],
    paramsSchema: BranchParamsSchema,
    fields: [
      {
        key: 'left',
        label: 'Value (path)',
        kind: 'string',
        placeholder: 'body.ok',
        help: 'Dot-path into the incoming data. Leave blank to test the whole input.',
      },
      {
        key: 'operator',
        label: 'Condition',
        kind: 'select',
        required: true,
        options: [
          { value: 'isTruthy', label: 'is truthy' },
          { value: 'isFalsy', label: 'is falsy' },
          { value: 'equals', label: '= equals' },
          { value: 'notEquals', label: '≠ not equals' },
          { value: 'contains', label: 'contains' },
          { value: 'gt', label: '> greater than' },
          { value: 'gte', label: '≥ greater or equal' },
          { value: 'lt', label: '< less than' },
          { value: 'lte', label: '≤ less or equal' },
        ],
      },
      {
        key: 'right',
        label: 'Compare to',
        kind: 'string',
        placeholder: 'ok',
        help: 'Compared against the value. Ignored for “is truthy/falsy”.',
        expressionable: true,
      },
    ],
  },
  'logic.setData': {
    id: 'logic.setData',
    category: 'logic',
    title: 'Set Data',
    description: 'Build a payload from fields, using {{ }} to pull from upstream nodes.',
    icon: 'pencil',
    inputs: MAIN_IN,
    outputs: MAIN_OUT,
    paramsSchema: SetDataParamsSchema,
    fields: [
      {
        key: 'mode',
        label: 'Mode',
        kind: 'select',
        required: true,
        options: [
          { value: 'replace', label: 'Replace — emit only the set fields' },
          { value: 'merge', label: 'Merge — overlay the set fields onto the input' },
        ],
      },
      {
        key: 'fields',
        label: 'Fields',
        kind: 'json',
        help: 'JSON object of key → value. Values may use {{ }} expressions.',
        expressionable: true,
      },
    ],
  },
  'logic.merge': {
    id: 'logic.merge',
    category: 'logic',
    title: 'Merge',
    description: 'Combine the outputs of multiple upstream branches into one payload.',
    icon: 'git-merge',
    inputs: MAIN_IN,
    outputs: MAIN_OUT,
    paramsSchema: MergeParamsSchema,
    fields: [
      {
        key: 'mode',
        label: 'Mode',
        kind: 'select',
        required: true,
        options: [
          { value: 'shallowMerge', label: 'Shallow merge objects' },
          { value: 'array', label: 'Collect into an array' },
          { value: 'concat', label: 'Concatenate arrays' },
        ],
      },
    ],
  },
  'data.filter': {
    id: 'data.filter',
    category: 'data',
    title: 'Filter Fields',
    description: 'Pick or drop a set of top-level fields from the payload.',
    icon: 'filter',
    inputs: MAIN_IN,
    outputs: MAIN_OUT,
    paramsSchema: DataFilterParamsSchema,
    fields: [
      {
        key: 'mode',
        label: 'Mode',
        kind: 'select',
        required: true,
        options: [
          { value: 'pick', label: 'Pick — keep only these fields' },
          { value: 'omit', label: 'Omit — drop these fields' },
        ],
      },
      {
        key: 'fields',
        label: 'Fields',
        kind: 'json',
        help: 'JSON array of top-level field names.',
      },
    ],
  },
  'storage.set': {
    id: 'storage.set',
    category: 'storage',
    title: 'Store Value',
    description: 'Save a value under a key — readable later in this run or a future run.',
    icon: 'database',
    inputs: MAIN_IN,
    outputs: MAIN_OUT,
    paramsSchema: StorageSetParamsSchema,
    fields: [
      {
        key: 'key',
        label: 'Key',
        kind: 'string',
        required: true,
        placeholder: 'lastSeenId',
        expressionable: true,
      },
      {
        key: 'value',
        label: 'Value',
        kind: 'json',
        help: 'The value to store. Use {{ }} to pull from upstream nodes.',
        expressionable: true,
      },
    ],
  },
  // --- Integration nodes (Phase 14 Theme C) ---
  'slack.message': {
    id: 'slack.message',
    category: 'action',
    title: 'Slack Message',
    description: 'Post a message to a Slack channel.',
    icon: 'message-square',
    inputs: MAIN_IN,
    outputs: MAIN_OUT,
    paramsSchema: SlackMessageParamsSchema,
    fields: [
      { key: 'credentialId', label: 'Slack credential', kind: 'credential', required: true, credentialType: 'slack' },
      { key: 'channel', label: 'Channel', kind: 'string', required: true, placeholder: '#general or channel ID', expressionable: true },
      { key: 'text', label: 'Message text', kind: 'text', required: true, expressionable: true },
      { key: 'blocks', label: 'Blocks (Block Kit)', kind: 'text', expressionable: true, help: 'Optional Slack Block Kit array (usually an expression, e.g. {{ $json.blocks }}). Text is the fallback.' },
    ],
  },
  'email.send': {
    id: 'email.send',
    category: 'action',
    title: 'Send Email',
    description: 'Send an email via SMTP.',
    icon: 'mail',
    inputs: MAIN_IN,
    outputs: MAIN_OUT,
    paramsSchema: EmailSendParamsSchema,
    fields: [
      { key: 'credentialId', label: 'SMTP credential', kind: 'credential', required: true, credentialType: 'smtp' },
      { key: 'to', label: 'To', kind: 'string', required: true, placeholder: 'recipient@example.com', expressionable: true },
      { key: 'subject', label: 'Subject', kind: 'string', required: true, expressionable: true },
      { key: 'text', label: 'Body (plain text)', kind: 'text', expressionable: true },
      { key: 'html', label: 'Body (HTML)', kind: 'text', expressionable: true },
    ],
  },
  'storage.get': {
    id: 'storage.get',
    category: 'storage',
    title: 'Read Value',
    description: 'Read a stored value by key (from this or a previous run).',
    icon: 'database',
    inputs: MAIN_IN,
    outputs: MAIN_OUT,
    paramsSchema: StorageGetParamsSchema,
    fields: [
      {
        key: 'key',
        label: 'Key',
        kind: 'string',
        required: true,
        placeholder: 'lastSeenId',
        expressionable: true,
      },
      {
        key: 'defaultValue',
        label: 'Default',
        kind: 'json',
        help: 'Returned when the key has never been set. Defaults to null.',
        expressionable: true,
      },
    ],
  },
  // --- GitHub integration nodes (Phase 37 Theme A) ---
  'github.get-pr': {
    id: 'github.get-pr',
    category: 'action',
    title: 'Get PR',
    description: 'Fetch pull-request metadata (title, state, author, labels, head/base) from GitHub.',
    icon: 'git-pull-request',
    inputs: MAIN_IN,
    outputs: MAIN_OUT,
    paramsSchema: GithubGetPrParamsSchema,
    fields: [
      { key: 'credentialId', label: 'GitHub credential', kind: 'credential', required: true, credentialType: 'github' },
      { key: 'prUrl', label: 'PR URL', kind: 'string', required: true, placeholder: 'https://github.com/owner/repo/pull/42', expressionable: true },
    ],
  },
  'github.get-diff': {
    id: 'github.get-diff',
    category: 'action',
    title: 'Get PR Diff',
    description: 'Fetch the unified diff for a pull request (truncated to maxTokens).',
    icon: 'git-pull-request',
    inputs: MAIN_IN,
    outputs: MAIN_OUT,
    paramsSchema: GithubGetDiffParamsSchema,
    fields: [
      { key: 'credentialId', label: 'GitHub credential', kind: 'credential', required: true, credentialType: 'github' },
      { key: 'prUrl', label: 'PR URL', kind: 'string', required: true, placeholder: 'https://github.com/owner/repo/pull/42', expressionable: true },
      { key: 'maxTokens', label: 'Max tokens', kind: 'number', help: 'Diff is truncated at this token estimate (1 token ≈ 4 chars). Default: 8000.' },
    ],
  },
  'github.post-review': {
    id: 'github.post-review',
    category: 'action',
    title: 'Post PR Review',
    description: 'Submit a review comment (or approval / request changes) on a GitHub pull request.',
    icon: 'git-pull-request',
    inputs: MAIN_IN,
    outputs: MAIN_OUT,
    paramsSchema: GithubPostReviewParamsSchema,
    fields: [
      { key: 'credentialId', label: 'GitHub credential', kind: 'credential', required: true, credentialType: 'github' },
      { key: 'prUrl', label: 'PR URL', kind: 'string', required: true, placeholder: 'https://github.com/owner/repo/pull/42', expressionable: true },
      { key: 'body', label: 'Review body', kind: 'text', required: true, expressionable: true },
      { key: 'event', label: 'Event', kind: 'select', options: [{ value: 'COMMENT', label: 'Comment' }, { value: 'APPROVE', label: 'Approve' }, { value: 'REQUEST_CHANGES', label: 'Request changes' }] },
    ],
  },
};

export const NODE_TYPE_IDS = Object.keys(NODE_TYPE_DEFINITIONS);

export function getNodeTypeDefinition(type: string): NodeTypeDefinition | undefined {
  return NODE_TYPE_DEFINITIONS[type];
}

export function listNodeTypes(): NodeTypeDefinition[] {
  return Object.values(NODE_TYPE_DEFINITIONS);
}
