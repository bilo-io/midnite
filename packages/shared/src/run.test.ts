import { describe, expect, it } from 'vitest';
import {
  NodeRunSchema,
  RunStatusSchema,
  RunWorkflowRequestSchema,
  WorkflowRunSchema,
} from './run.js';

describe('RunStatusSchema', () => {
  it('accepts the declared run statuses and rejects others', () => {
    for (const s of ['queued', 'running', 'succeeded', 'failed', 'canceled']) {
      expect(RunStatusSchema.parse(s)).toBe(s);
    }
    expect(RunStatusSchema.safeParse('done').success).toBe(false);
  });
});

describe('NodeRunSchema', () => {
  it('defaults logs to an empty array and preserves unknown input/output', () => {
    const parsed = NodeRunSchema.parse({
      id: 'nr1',
      runId: 'r1',
      nodeId: 'n1',
      nodeType: 'http.request',
      status: 'succeeded',
      input: { a: 1 },
      output: [1, 2, 3],
    });
    expect(parsed.logs).toEqual([]);
    expect(parsed.output).toEqual([1, 2, 3]);
  });

  it('rejects an invalid node-run status', () => {
    expect(
      NodeRunSchema.safeParse({
        id: 'nr1',
        runId: 'r1',
        nodeId: 'n1',
        nodeType: 't',
        status: 'canceled',
      }).success,
    ).toBe(false);
  });
});

describe('WorkflowRunSchema', () => {
  it('defaults nodeRuns to an empty array', () => {
    const parsed = WorkflowRunSchema.parse({
      id: 'r1',
      workflowId: 'w1',
      status: 'running',
      triggerSource: 'manual',
      startedAt: '2026-06-20T00:00:00.000Z',
    });
    expect(parsed.nodeRuns).toEqual([]);
  });

  it('rejects an unknown trigger source', () => {
    expect(
      WorkflowRunSchema.safeParse({
        id: 'r1',
        workflowId: 'w1',
        status: 'running',
        triggerSource: 'cron',
        startedAt: '',
      }).success,
    ).toBe(false);
  });
});

describe('RunWorkflowRequestSchema', () => {
  it('accepts an empty request', () => {
    expect(RunWorkflowRequestSchema.parse({})).toEqual({});
  });
});
