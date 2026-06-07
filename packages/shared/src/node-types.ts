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

export type HttpRequestParams = z.infer<typeof HttpRequestParamsSchema>;
export type AiClaudeParams = z.infer<typeof AiClaudeParamsSchema>;

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
};

export const NODE_TYPE_IDS = Object.keys(NODE_TYPE_DEFINITIONS);

export function getNodeTypeDefinition(type: string): NodeTypeDefinition | undefined {
  return NODE_TYPE_DEFINITIONS[type];
}

export function listNodeTypes(): NodeTypeDefinition[] {
  return Object.values(NODE_TYPE_DEFINITIONS);
}
