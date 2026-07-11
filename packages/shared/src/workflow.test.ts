import { describe, expect, it } from 'vitest';
import {
  CreateWorkflowRequestSchema,
  UpdateWorkflowRequestSchema,
  WorkflowSchema,
  WorkflowSummarySchema,
} from './workflow.js';

const baseWorkflow = {
  id: 'w1',
  name: 'Nightly sync',
  trigger: { type: 'manual' as const },
  createdAt: '2026-06-20T00:00:00.000Z',
  updatedAt: '2026-06-20T00:00:00.000Z',
};

describe('WorkflowSchema', () => {
  it('defaults enabled/nodes/edges', () => {
    const parsed = WorkflowSchema.parse(baseWorkflow);
    expect(parsed.enabled).toBe(false);
    expect(parsed.nodes).toEqual([]);
    expect(parsed.edges).toEqual([]);
  });

  it('rejects an empty name', () => {
    expect(WorkflowSchema.safeParse({ ...baseWorkflow, name: '' }).success).toBe(false);
  });

  it('rejects an invalid embedded trigger', () => {
    expect(
      WorkflowSchema.safeParse({ ...baseWorkflow, trigger: { type: 'schedule', cron: '0 0 * * *' } })
        .success,
    ).toBe(false);
  });
});

describe('WorkflowSummarySchema', () => {
  it('defaults steps to an empty array', () => {
    const summary = {
      id: 'w1',
      name: 'Nightly sync',
      enabled: true,
      triggerType: 'webhook' as const,
      nodeCount: 2,
      createdAt: '2026-06-20T00:00:00.000Z',
      updatedAt: '2026-06-20T00:00:00.000Z',
    };
    const parsed = WorkflowSummarySchema.parse(summary);
    expect(parsed.steps).toEqual([]);
  });
});

describe('CreateWorkflowRequestSchema / UpdateWorkflowRequestSchema', () => {
  it('trims and rejects a blank create name', () => {
    expect(CreateWorkflowRequestSchema.safeParse({ name: '  ' }).success).toBe(false);
  });

  it('accepts an empty update patch', () => {
    expect(UpdateWorkflowRequestSchema.parse({})).toEqual({});
  });
});
