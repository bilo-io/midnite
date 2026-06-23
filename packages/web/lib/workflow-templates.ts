import type { Trigger, Workflow, WorkflowEdge, WorkflowNode } from '@midnite/shared';

import type { WorkflowGraphPayload } from './workflow-store';

// Starter templates (Phase 14 Theme E): a small gallery that seeds a new
// workflow with a ready-made graph, so a user starts from a working shape
// instead of a blank canvas. Each template is a trigger + a linear chain of
// steps built only from shipped node types (http.request / ai.claude /
// data.filter / storage.*); the AI prompts reference upstream nodes by label
// via {{ }} expressions (Phase 12), exactly as a hand-built graph would.

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
    name: 'Summarise a web page with AI',
    description: 'Fetch a URL on demand, then have the AI node summarise the response.',
    trigger: { type: 'manual' },
    steps: [
      {
        type: 'http.request',
        label: 'Fetch page',
        params: { method: 'GET', url: 'https://example.com' },
      },
      {
        type: 'ai.claude',
        label: 'Summarise',
        params: {
          prompt: 'Summarise the following page in 3 concise bullet points:\n\n{{$node["Fetch page"].json.body}}',
        },
      },
    ],
  },
  {
    id: 'scheduled-api-digest',
    name: 'Daily API digest',
    description: 'Every morning, fetch an endpoint, trim it to the fields you care about, and write a digest.',
    trigger: { type: 'schedule', cron: '0 9 * * *', timezone: 'UTC' },
    steps: [
      {
        type: 'http.request',
        label: 'Fetch items',
        params: { method: 'GET', url: 'https://api.example.com/items' },
      },
      {
        type: 'data.filter',
        label: 'Keep fields',
        params: { mode: 'pick', fields: ['title', 'url'] },
      },
      {
        type: 'ai.claude',
        label: 'Write digest',
        params: { prompt: 'Write a short digest of these items:\n\n{{$node["Keep fields"].json}}' },
      },
    ],
  },
  {
    id: 'track-latest-value',
    name: 'Track the latest value across runs',
    description: 'On an hourly schedule, read the previous run’s value from storage, fetch the current one, and stash it.',
    trigger: { type: 'schedule', cron: '0 * * * *', timezone: 'UTC' },
    steps: [
      {
        type: 'storage.get',
        label: 'Previous value',
        params: { key: 'lastSeen', defaultValue: null },
      },
      {
        type: 'http.request',
        label: 'Fetch latest',
        params: { method: 'GET', url: 'https://api.example.com/latest' },
      },
      {
        type: 'storage.set',
        label: 'Save latest',
        params: { key: 'lastSeen', value: '{{$node["Fetch latest"].json.body}}' },
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
