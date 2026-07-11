import type { Trigger, Workflow, WorkflowEdge, WorkflowNode } from '@midnite/shared';

import type { WorkflowGraphPayload } from './workflow-store';

// Starter templates (Phase 14 Theme E): a small gallery that seeds a new
// workflow with a ready-made graph, so a user starts from a working shape
// instead of a blank canvas. Each template is a trigger + a linear chain of
// steps built only from shipped node types (http.request / ai.claude /
// data.filter / storage.*); the AI prompts reference upstream nodes by label
// via {{ }} expressions (Phase 12), exactly as a hand-built graph would.
//
// The http.request steps target the gateway's own demo API (`/playground/*`) so
// they run out of the box against a local gateway — the SSRF guard permits the
// gateway's own origin (see the gateway's http-request executor). `GATEWAY_BASE`
// is the default local address; edit the URL on any node to point elsewhere.

const GATEWAY_BASE = 'http://localhost:7777';
const JSON_HEADERS = { 'content-type': 'application/json' };

export interface TemplateStep {
  /** A node type id from `NODE_TYPE_DEFINITIONS` (e.g. `http.request`). */
  type: string;
  /** The node's label — also how downstream `{{$node["…"]}}` expressions refer to it. */
  label: string;
  params: Record<string, unknown>;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  trigger: Trigger;
  /** A linear chain wired after the trigger: trigger → steps[0] → steps[1] → … */
  steps: TemplateStep[];
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'ai-webpage-summary',
    name: 'Fetch data and summarise with AI',
    description: 'Fetch a JSON endpoint on demand, then have the AI node summarise the response.',
    trigger: { type: 'manual' },
    steps: [
      {
        type: 'http.request',
        label: 'Fetch data',
        params: { method: 'GET', url: `${GATEWAY_BASE}/playground/items` },
      },
      {
        type: 'ai.claude',
        label: 'Summarise',
        params: {
          prompt: 'Summarise the following data in 3 concise bullet points:\n\n{{$node["Fetch data"].json.body}}',
        },
      },
    ],
  },
  {
    id: 'api-digest',
    name: 'API digest',
    description: 'Fetch an endpoint, trim it to the fields you care about, and write a short digest.',
    trigger: { type: 'manual' },
    steps: [
      {
        type: 'http.request',
        label: 'Fetch items',
        params: { method: 'GET', url: `${GATEWAY_BASE}/playground/items` },
      },
      {
        type: 'data.filter',
        label: 'Keep fields',
        params: { mode: 'pick', fields: ['status', 'body'] },
      },
      {
        type: 'ai.claude',
        label: 'Write digest',
        params: { prompt: 'Write a short digest of these items:\n\n{{$node["Keep fields"].json.body}}' },
      },
    ],
  },
  {
    id: 'track-latest-value',
    name: 'Track the latest value across runs',
    description: 'Read the previous run’s value from storage, fetch the current one, and stash it back.',
    trigger: { type: 'manual' },
    steps: [
      {
        type: 'storage.get',
        label: 'Previous value',
        params: { key: 'lastSeen', defaultValue: null },
      },
      {
        type: 'http.request',
        label: 'Fetch latest',
        params: { method: 'GET', url: `${GATEWAY_BASE}/playground/latest` },
      },
      {
        type: 'storage.set',
        label: 'Save latest',
        params: { key: 'lastSeen', value: '{{$node["Fetch latest"].json.body}}' },
      },
    ],
  },
  {
    id: 'http-method-showcase',
    name: 'HTTP methods showcase',
    description:
      'Exercises GET, POST, PUT, PATCH and DELETE against the demo echo endpoint so you can see each request and its response in the run panel.',
    trigger: { type: 'manual' },
    steps: [
      {
        type: 'http.request',
        label: 'GET echo',
        params: { method: 'GET', url: `${GATEWAY_BASE}/playground/echo?step=get` },
      },
      {
        type: 'http.request',
        label: 'POST echo',
        params: {
          method: 'POST',
          url: `${GATEWAY_BASE}/playground/echo`,
          headers: JSON_HEADERS,
          body: '{"step":"post"}',
        },
      },
      {
        type: 'http.request',
        label: 'PUT echo',
        params: {
          method: 'PUT',
          url: `${GATEWAY_BASE}/playground/echo`,
          headers: JSON_HEADERS,
          body: '{"step":"put"}',
        },
      },
      {
        type: 'http.request',
        label: 'PATCH echo',
        params: {
          method: 'PATCH',
          url: `${GATEWAY_BASE}/playground/echo`,
          headers: JSON_HEADERS,
          body: '{"step":"patch"}',
        },
      },
      {
        type: 'http.request',
        label: 'DELETE echo',
        params: { method: 'DELETE', url: `${GATEWAY_BASE}/playground/echo?step=delete` },
      },
    ],
  },
];

export function getWorkflowTemplate(id: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find((t) => t.id === id);
}

/** Horizontal gap between the trigger and each successive step on the canvas. */
const STEP_DX = 240;

/**
 * Build the graph a template seeds onto a freshly-created workflow: the existing
 * trigger node kept as-is, then each step as a node wired in a chain after it
 * (trigger → step0 → step1 → …), cascading to the right of the trigger. Pure —
 * `makeId` is injectable so the wiring is deterministic in tests.
 */
export function buildTemplateGraph(
  template: WorkflowTemplate,
  triggerNode: WorkflowNode,
  makeId: () => string = () => crypto.randomUUID(),
): WorkflowGraphPayload {
  const nodes: WorkflowNode[] = [triggerNode];
  const edges: WorkflowEdge[] = [];
  let prevId = triggerNode.id;

  template.steps.forEach((step, i) => {
    const id = makeId();
    nodes.push({
      id,
      type: step.type,
      label: step.label,
      position: {
        x: triggerNode.position.x + (i + 1) * STEP_DX,
        y: triggerNode.position.y,
      },
      params: step.params,
    });
    edges.push({ id: makeId(), source: prevId, sourcePort: 'main', target: id, targetPort: 'main' });
    prevId = id;
  });

  return { nodes, edges };
}

/**
 * The trigger node to seed a template onto: a freshly-created workflow already
 * carries one (the gateway seeds it from the chosen trigger), so reuse it; fall
 * back to synthesising one if absent, so seeding never depends on that detail.
 */
export function triggerNodeOf(
  workflow: Workflow,
  template: WorkflowTemplate,
  makeId: () => string = () => crypto.randomUUID(),
): WorkflowNode {
  const existing = workflow.nodes.find((n) => n.type.startsWith('trigger.'));
  if (existing) return existing;
  return {
    id: makeId(),
    type: `trigger.${template.trigger.type}`,
    label: 'Trigger',
    position: { x: 80, y: 120 },
    params: {},
  };
}
