import { describe, expect, it } from 'vitest';
import { getNodeTypeDefinition, WorkflowSchema } from '@midnite/shared';

import {
  buildTemplateGraph,
  getWorkflowTemplate,
  triggerNodeOf,
  WORKFLOW_TEMPLATES,
} from './workflow-templates';

// A deterministic id generator so the wiring is assertable.
function seqIds() {
  let n = 0;
  return () => `id-${n++}`;
}

const TRIGGER_NODE = {
  id: 'trig',
  type: 'trigger.manual',
  label: 'Trigger',
  position: { x: 80, y: 120 },
  params: {},
};

describe('WORKFLOW_TEMPLATES', () => {
  it('every template is a non-empty chain of known node types with labels', () => {
    expect(WORKFLOW_TEMPLATES.length).toBeGreaterThan(0);
    for (const template of WORKFLOW_TEMPLATES) {
      expect(template.steps.length).toBeGreaterThan(0);
      for (const step of template.steps) {
        expect(getNodeTypeDefinition(step.type), `${template.id}: ${step.type}`).toBeTruthy();
        expect(step.label.trim()).not.toBe('');
      }
    }
  });

  it('step labels are unique within a template (expressions reference nodes by label)', () => {
    for (const template of WORKFLOW_TEMPLATES) {
      const labels = template.steps.map((s) => s.label);
      expect(new Set(labels).size).toBe(labels.length);
    }
  });
});

describe('buildTemplateGraph', () => {
  it('keeps the trigger and wires the steps as a chain cascading to its right', () => {
    const template = getWorkflowTemplate('ai-webpage-summary');
    expect(template).toBeTruthy();
    const graph = buildTemplateGraph(template!, TRIGGER_NODE, seqIds());

    // trigger + 2 steps
    expect(graph.nodes).toHaveLength(3);
    expect(graph.nodes[0]).toBe(TRIGGER_NODE);
    expect(graph.nodes[1]?.type).toBe('http.request');
    expect(graph.nodes[2]?.type).toBe('ai.claude');

    // positions cascade right of the trigger (STEP_DX = 240), same row
    expect(graph.nodes[1]?.position).toEqual({ x: 320, y: 120 });
    expect(graph.nodes[2]?.position).toEqual({ x: 560, y: 120 });

    // edges chain: trigger → step0 → step1
    expect(graph.edges).toHaveLength(2);
    expect(graph.edges[0]?.source).toBe('trig');
    expect(graph.edges[0]?.target).toBe(graph.nodes[1]?.id);
    expect(graph.edges[1]?.source).toBe(graph.nodes[1]?.id);
    expect(graph.edges[1]?.target).toBe(graph.nodes[2]?.id);

    // params carried through verbatim
    expect(graph.nodes[1]?.params).toMatchObject({ method: 'GET', url: 'https://example.com' });
  });

  it('produces a valid graph for every template (one edge per step)', () => {
    for (const template of WORKFLOW_TEMPLATES) {
      const graph = buildTemplateGraph(template, TRIGGER_NODE, seqIds());
      expect(graph.nodes).toHaveLength(template.steps.length + 1);
      expect(graph.edges).toHaveLength(template.steps.length);
    }
  });
});

describe('triggerNodeOf', () => {
  it('reuses the trigger node the gateway seeds on create', () => {
    const workflow = WorkflowSchema.parse({
      id: 'w1',
      name: 'X',
      trigger: { type: 'manual' },
      nodes: [{ id: 'seeded-trigger', type: 'trigger.manual', position: { x: 1, y: 2 }, params: {} }],
      edges: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(triggerNodeOf(workflow, getWorkflowTemplate('ai-webpage-summary')!).id).toBe('seeded-trigger');
  });

  it('synthesises a trigger node matching the template when none exists', () => {
    const workflow = WorkflowSchema.parse({
      id: 'w2',
      name: 'X',
      trigger: { type: 'schedule', cron: '0 9 * * *', timezone: 'UTC' },
      nodes: [],
      edges: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    const node = triggerNodeOf(workflow, getWorkflowTemplate('scheduled-api-digest')!, seqIds());
    expect(node.type).toBe('trigger.schedule');
    expect(node.id).toBe('id-0');
  });
});
