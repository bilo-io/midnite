import { z } from 'zod';
import { HTTP_METHODS } from './trigger.js';

// Node categories drive palette grouping and graph-validation rules
// (a trigger must be the graph root, etc.).
export const NODE_CATEGORIES = ['trigger', 'action', 'logic'] as const;
export type NodeCategory = (typeof NODE_CATEGORIES)[number];

// Field descriptors let the web render a node's config form generically,
// without a bespoke component per node type.
export const NODE_FIELD_KINDS = ['string', 'text', 'number', 'boolean', 'select', 'json'] as const;
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
export const ScheduleTriggerParamsSchema = z.object({}).passthrough();
export const WebhookTriggerParamsSchema = z.object({}).passthrough();

export const HttpRequestParamsSchema = z.object({
  method: z.enum(HTTP_METHODS).default('GET'),
  url: z.string().url(),
  headers: z.record(z.string()).default({}),
  body: z.string().optional(),
  timeoutMs: z.number().int().positive().max(60000).default(10000),
});

export const AiClaudeParamsSchema = z.object({
  model: z.string().min(1).default('sonnet4.7'),
  system: z.string().optional(),
  prompt: z.string().min(1),
  maxTokens: z.number().int().positive().max(8192).default(1024),
});

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

export type HttpRequestParams = z.infer<typeof HttpRequestParamsSchema>;
export type AiClaudeParams = z.infer<typeof AiClaudeParamsSchema>;
export type BranchParams = z.infer<typeof BranchParamsSchema>;

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
  'trigger.schedule': {
    id: 'trigger.schedule',
    category: 'trigger',
    title: 'Schedule',
    description: 'Run automatically on a cron schedule.',
    icon: 'clock',
    inputs: NO_INPUTS,
    outputs: MAIN_OUT,
    paramsSchema: ScheduleTriggerParamsSchema,
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
      { key: 'url', label: 'URL', kind: 'string', required: true, placeholder: 'https://api.example.com/…' },
      { key: 'headers', label: 'Headers', kind: 'json', help: 'JSON object of header name → value.' },
      { key: 'body', label: 'Body', kind: 'text', placeholder: 'Raw request body' },
    ],
  },
  'ai.claude': {
    id: 'ai.claude',
    category: 'action',
    title: 'Claude',
    description: 'Run a Claude completion.',
    icon: 'sparkles',
    inputs: MAIN_IN,
    outputs: MAIN_OUT,
    paramsSchema: AiClaudeParamsSchema,
    fields: [
      { key: 'model', label: 'Model', kind: 'string', placeholder: 'sonnet4.7' },
      { key: 'system', label: 'System prompt', kind: 'text' },
      { key: 'prompt', label: 'Prompt', kind: 'text', required: true },
      { key: 'maxTokens', label: 'Max tokens', kind: 'number' },
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
      },
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
