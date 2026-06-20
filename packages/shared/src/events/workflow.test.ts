import { describe, expect, it } from 'vitest';
import {
  WORKFLOW_WS_PATH,
  WorkflowEventSchema,
  WorkflowSubscribeMessageSchema,
} from './workflow.js';

describe('WorkflowEventSchema (discriminated union)', () => {
  it('narrows run.started on its type', () => {
    const e = WorkflowEventSchema.parse({
      type: 'run.started',
      workflowId: 'w1',
      runId: 'r1',
      at: '2026-06-20T00:00:00.000Z',
      triggerSource: 'manual',
    });
    expect(e.type).toBe('run.started');
  });

  it('round-trips node.failed with its error', () => {
    const e = WorkflowEventSchema.parse({
      type: 'node.failed',
      workflowId: 'w1',
      runId: 'r1',
      at: '2026-06-20T00:00:00.000Z',
      nodeId: 'n1',
      error: 'boom',
    });
    if (e.type !== 'node.failed') throw new Error('expected node.failed');
    expect(e.error).toBe('boom');
  });

  it('round-trips run.finished carrying the full run', () => {
    const run = {
      id: 'r1',
      workflowId: 'w1',
      status: 'succeeded' as const,
      triggerSource: 'manual' as const,
      startedAt: '2026-06-20T00:00:00.000Z',
      nodeRuns: [],
    };
    const e = WorkflowEventSchema.parse({
      type: 'run.finished',
      workflowId: 'w1',
      runId: 'r1',
      at: '2026-06-20T00:00:00.000Z',
      run,
    });
    if (e.type !== 'run.finished') throw new Error('expected run.finished');
    expect(e.run.status).toBe('succeeded');
  });

  it('rejects an unknown event type', () => {
    expect(
      WorkflowEventSchema.safeParse({ type: 'run.paused', workflowId: 'w', runId: 'r', at: '' })
        .success,
    ).toBe(false);
  });

  it('rejects node.failed missing its error field', () => {
    expect(
      WorkflowEventSchema.safeParse({
        type: 'node.failed',
        workflowId: 'w',
        runId: 'r',
        at: '',
        nodeId: 'n',
      }).success,
    ).toBe(false);
  });
});

describe('WorkflowSubscribeMessageSchema', () => {
  it('round-trips a subscribe message', () => {
    expect(WorkflowSubscribeMessageSchema.parse({ type: 'subscribe', runId: 'r1' })).toEqual({
      type: 'subscribe',
      runId: 'r1',
    });
  });

  it('exposes the WS path constant', () => {
    expect(WORKFLOW_WS_PATH).toBe('/ws/workflows');
  });
});
