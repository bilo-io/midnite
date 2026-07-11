import { describe, expect, it } from 'vitest';
import type { Workflow, WorkflowEvent, WorkflowRun, WorkflowSummary } from '@midnite/shared';

import {
  gatewayWsUrl,
  lastRunLabel,
  nodeLabelOf,
  runListRows,
  runSummaryLines,
  watchEventLine,
  workflowListRows,
} from './workflow.js';

function summary(overrides: Partial<WorkflowSummary> = {}): WorkflowSummary {
  return {
    id: 'wf-1',
    name: 'Nightly digest',
    enabled: true,
    triggerType: 'manual',
    nodeCount: 3,
    steps: [],
    createdAt: '2026-06-22T00:00:00.000Z',
    updatedAt: '2026-06-22T00:00:00.000Z',
    ...overrides,
  };
}

function run(overrides: Partial<WorkflowRun> = {}): WorkflowRun {
  return {
    id: 'run-1',
    workflowId: 'wf-1',
    status: 'running',
    triggerSource: 'manual',
    startedAt: '2026-06-22T09:30:05.000Z',
    nodeRuns: [
      { id: 'nr-1', runId: 'run-1', nodeId: 'n1', nodeType: 'trigger.manual', status: 'succeeded', logs: [] },
      { id: 'nr-2', runId: 'run-1', nodeId: 'n2', nodeType: 'http.request', status: 'running', logs: [] },
    ],
    ...overrides,
  };
}

describe('gatewayWsUrl', () => {
  it('maps http→ws and https→wss', () => {
    expect(gatewayWsUrl('http://localhost:7777')).toBe('ws://localhost:7777');
    expect(gatewayWsUrl('https://gw.example.com')).toBe('wss://gw.example.com');
  });
});


describe('lastRunLabel', () => {
  it('em-dashes a workflow that never ran', () => {
    expect(lastRunLabel({})).toBe('—');
  });
  it('joins status and time', () => {
    expect(lastRunLabel({ lastRunStatus: 'succeeded', lastRunAt: '2026-06-22T09:30:00.000Z' })).toBe(
      'succeeded · 2026-06-22 09:30',
    );
  });
});

describe('workflowListRows', () => {
  it('renders one row per workflow', () => {
    const rows = workflowListRows([
      summary(),
      summary({
        id: 'wf-2',
        name: 'Deploy check',
        enabled: false,
        triggerType: 'webhook',
        nodeCount: 5,
        lastRunStatus: 'failed',
        lastRunAt: '2026-06-21T23:00:00.000Z',
      }),
    ]);
    expect(rows[0]).toEqual(['wf-1', 'Nightly digest', 'yes', 'manual', '3', '—']);
    expect(rows[1]).toEqual([
      'wf-2',
      'Deploy check',
      'no',
      'webhook',
      '5',
      'failed · 2026-06-21 23:00',
    ]);
  });
});

describe('runListRows', () => {
  it('renders started/finished and node count', () => {
    const rows = runListRows([
      run({ status: 'succeeded', finishedAt: '2026-06-22T09:31:00.000Z' }),
    ]);
    expect(rows[0]).toEqual([
      'run-1',
      'succeeded',
      'manual',
      '2026-06-22 09:30',
      '2026-06-22 09:31',
      '2',
    ]);
  });
  it('em-dashes an unfinished run', () => {
    expect(runListRows([run()])[0]?.[4]).toBe('—');
  });
});

describe('nodeLabelOf', () => {
  const workflow = {
    nodes: [
      { id: 'n1', type: 'trigger.manual', position: { x: 0, y: 0 }, label: 'Start', params: {} },
      { id: 'n2', type: 'http.request', position: { x: 0, y: 0 }, params: {} },
    ],
  } as unknown as Workflow;

  it('uses the label when present, the id otherwise', () => {
    const labelOf = nodeLabelOf(workflow);
    expect(labelOf('n1')).toBe('Start');
    expect(labelOf('n2')).toBe('n2'); // no label
    expect(labelOf('missing')).toBe('missing');
  });
});

describe('watchEventLine', () => {
  const labelOf = (id: string) => (id === 'n2' ? 'Fetch' : id);

  const line = (event: WorkflowEvent) => watchEventLine(event, labelOf);

  it('renders each event type', () => {
    expect(line({ type: 'run.started', workflowId: 'wf-1', runId: 'run-1', at: 't', triggerSource: 'manual' })).toBe(
      '▶ run started',
    );
    expect(line({ type: 'node.started', workflowId: 'wf-1', runId: 'run-1', at: 't', nodeId: 'n2', nodeType: 'http.request' })).toBe(
      '  · Fetch …',
    );
    expect(line({ type: 'node.succeeded', workflowId: 'wf-1', runId: 'run-1', at: 't', nodeId: 'n2', output: {} })).toBe(
      '  ✓ Fetch',
    );
    expect(line({ type: 'node.failed', workflowId: 'wf-1', runId: 'run-1', at: 't', nodeId: 'n2', error: 'boom' })).toBe(
      '  ✗ Fetch: boom',
    );
    expect(line({ type: 'run.failed', workflowId: 'wf-1', runId: 'run-1', at: 't', error: 'nope' })).toBe(
      '✗ run failed: nope',
    );
  });

  it('reports the final status from run.finished', () => {
    expect(
      line({ type: 'run.finished', workflowId: 'wf-1', runId: 'run-1', at: 't', run: run({ status: 'succeeded' }) }),
    ).toBe('✓ run succeeded');
  });
});

describe('runSummaryLines', () => {
  it('lists each node then the run verdict', () => {
    const labelOf = (id: string) => (id === 'n2' ? 'Fetch' : 'Start');
    const lines = runSummaryLines(
      run({
        status: 'succeeded',
        nodeRuns: [
          { id: 'nr-1', runId: 'run-1', nodeId: 'n1', nodeType: 'trigger.manual', status: 'succeeded', logs: [] },
          { id: 'nr-2', runId: 'run-1', nodeId: 'n2', nodeType: 'http.request', status: 'skipped', logs: [] },
        ],
      }),
      labelOf,
    );
    expect(lines).toEqual(['  ✓ Start  succeeded', '  · Fetch  skipped', '✓ run succeeded']);
  });
});
