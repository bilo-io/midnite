import { describe, expect, it } from 'vitest';
import type { Workflow, WorkflowSummary } from '@midnite/shared';

import {
  buildScheduleGraph,
  decodeSchedule,
  DEFAULT_SCHEDULE_FORM,
  isScheduleWorkflow,
  type ScheduleFormValues,
} from './schedules';

const summary = (over: Partial<WorkflowSummary>): WorkflowSummary => ({
  id: 'w1',
  name: 'S',
  enabled: true,
  triggerType: 'schedule',
  nodeCount: 2,
  steps: [{ type: 'trigger.schedule' }, { type: 'task.create' }],
  createdAt: '2026-06-30T00:00:00Z',
  updatedAt: '2026-06-30T00:00:00Z',
  ...over,
});

describe('isScheduleWorkflow', () => {
  it('accepts a schedule-triggered workflow with a task.create action', () => {
    expect(isScheduleWorkflow(summary({}))).toBe(true);
  });

  it('rejects a schedule workflow without a task.create action', () => {
    expect(
      isScheduleWorkflow(summary({ steps: [{ type: 'trigger.schedule' }, { type: 'ai.claude' }] })),
    ).toBe(false);
  });

  it('rejects a task.create workflow on a non-schedule trigger', () => {
    expect(isScheduleWorkflow(summary({ triggerType: 'manual' }))).toBe(false);
  });
});

const makeIds = () => {
  let n = 0;
  return () => `id-${++n}`;
};

describe('buildScheduleGraph', () => {
  it('wires trigger → task.create, preserving the seeded trigger node', () => {
    const wf = {
      nodes: [{ id: 'trig', type: 'trigger.schedule', label: 'Schedule', position: { x: 80, y: 120 }, params: {} }],
    };
    const values: ScheduleFormValues = {
      ...DEFAULT_SCHEDULE_FORM,
      name: 'Standup',
      prompt: 'Daily standup',
      priority: 2,
      repo: 'midnite',
    };
    const graph = buildScheduleGraph(wf, values, makeIds());
    expect(graph.nodes).toHaveLength(2);
    expect(graph.nodes[0].id).toBe('trig');
    const task = graph.nodes[1];
    expect(task.type).toBe('task.create');
    expect(task.params).toEqual({ prompt: 'Daily standup', repo: 'midnite', priority: 2 });
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]).toMatchObject({ source: 'trig', target: task.id });
  });

  it('omits priority when it is the Normal default', () => {
    const graph = buildScheduleGraph({ nodes: [] }, { ...DEFAULT_SCHEDULE_FORM, prompt: 'x' }, makeIds());
    expect(graph.nodes[1].params).toEqual({ prompt: 'x' });
  });

  it('preserves an existing task.create node id and position on edit', () => {
    const wf = {
      nodes: [
        { id: 'trig', type: 'trigger.schedule', position: { x: 80, y: 120 }, params: {} },
        { id: 'task', type: 'task.create', position: { x: 500, y: 200 }, params: { prompt: 'old' } },
      ],
    };
    const graph = buildScheduleGraph(wf, { ...DEFAULT_SCHEDULE_FORM, prompt: 'new' }, makeIds());
    const task = graph.nodes[1];
    expect(task.id).toBe('task');
    expect(task.position).toEqual({ x: 500, y: 200 });
    expect(task.params).toEqual({ prompt: 'new' });
  });
});

describe('decodeSchedule round-trips buildScheduleGraph', () => {
  it('decodes a built workflow back to the same form values', () => {
    const values: ScheduleFormValues = {
      name: 'Weekly cleanup',
      cron: '0 9 * * 1',
      timezone: 'Europe/London',
      enabled: false,
      prompt: 'Tidy up',
      repo: 'midnite',
      projectId: 'proj-1',
      priority: 3,
    };
    const graph = buildScheduleGraph({ nodes: [] }, values, makeIds());
    const workflow: Workflow = {
      id: 'w1',
      name: values.name,
      enabled: values.enabled,
      trigger: { type: 'schedule', cron: values.cron, timezone: values.timezone },
      nodes: graph.nodes,
      edges: graph.edges,
      createdAt: '2026-06-30T00:00:00Z',
      updatedAt: '2026-06-30T00:00:00Z',
    };
    expect(decodeSchedule(workflow)).toEqual(values);
  });
});
