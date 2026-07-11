import { describe, expect, it } from 'vitest';
import type { NodeRun, Workflow, WorkflowRun } from '@midnite/shared';
import { runReportFilename, runToMarkdown } from './run-report';

const NOW = new Date('2026-06-23T12:00:00Z');

function makeWorkflow(overrides: Partial<Workflow> = {}): Workflow {
  return {
    id: 'wf1',
    name: 'My Pipeline',
    enabled: true,
    trigger: { type: 'manual' },
    nodes: [
      { id: 'n1', type: 'trigger.manual', label: 'Start', params: {}, position: { x: 0, y: 0 } },
      { id: 'n2', type: 'http.request', label: 'Fetch data', params: {}, position: { x: 200, y: 0 } },
    ],
    edges: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeRun(overrides: Partial<WorkflowRun> = {}): WorkflowRun {
  return {
    id: 'run1',
    workflowId: 'wf1',
    status: 'succeeded',
    triggerSource: 'manual',
    startedAt: '2026-06-23T10:00:00Z',
    finishedAt: '2026-06-23T10:00:05Z',
    nodeRuns: [],
    ...overrides,
  };
}

function makeNodeRun(overrides: Partial<NodeRun> = {}): NodeRun {
  return {
    id: 'nr1',
    runId: 'run1',
    nodeId: 'n2',
    nodeType: 'http.request',
    status: 'succeeded',
    logs: [],
    ...overrides,
  };
}

describe('runToMarkdown', () => {
  it('renders the workflow name, export date, and run status', () => {
    const md = runToMarkdown(makeWorkflow(), makeRun(), { now: NOW });
    expect(md).toContain('# My Pipeline — Run');
    expect(md).toContain('*Exported 2026-06-23*');
    expect(md).toContain('succeeded');
  });

  it('includes trigger type', () => {
    const md = runToMarkdown(makeWorkflow(), makeRun(), { now: NOW });
    expect(md).toContain('manual');
  });

  it('shows a run-level error when present', () => {
    const run = makeRun({ status: 'failed', error: 'engine crashed' });
    const md = runToMarkdown(makeWorkflow(), run, { now: NOW });
    expect(md).toContain('## Run error');
    expect(md).toContain('engine crashed');
  });

  it('shows "No node runs" when nodeRuns is empty', () => {
    const md = runToMarkdown(makeWorkflow(), makeRun({ nodeRuns: [] }), { now: NOW });
    expect(md).toContain('No node runs recorded');
  });

  it('renders node run with label from workflow nodes', () => {
    const run = makeRun({ nodeRuns: [makeNodeRun({ nodeId: 'n2', nodeType: 'http.request' })] });
    const md = runToMarkdown(makeWorkflow(), run, { now: NOW });
    expect(md).toContain('### Fetch data');
  });

  it('falls back to nodeType when node has no label', () => {
    const wf = makeWorkflow({
      nodes: [{ id: 'n2', type: 'http.request', params: {}, position: { x: 0, y: 0 } }],
    });
    const run = makeRun({ nodeRuns: [makeNodeRun({ nodeId: 'n2' })] });
    const md = runToMarkdown(wf, run, { now: NOW });
    expect(md).toContain('### http.request');
  });

  it('renders input, resolvedParams, and output in per-node sections', () => {
    const nr = makeNodeRun({
      input: { url: 'https://api.example.com' },
      resolvedParams: { method: 'GET', url: 'https://api.example.com' },
      output: { status: 200, body: 'ok' },
    });
    const md = runToMarkdown(makeWorkflow(), makeRun({ nodeRuns: [nr] }), { now: NOW });
    expect(md).toContain('**Input**');
    expect(md).toContain('https://api.example.com');
    expect(md).toContain('**Resolved params**');
    expect(md).toContain('**Output**');
    expect(md).toContain('"status": 200');
  });

  it('shows node error in a blockquote', () => {
    const nr = makeNodeRun({ status: 'failed', error: 'connection refused' });
    const md = runToMarkdown(makeWorkflow(), makeRun({ nodeRuns: [nr] }), { now: NOW });
    expect(md).toContain('**Error**');
    expect(md).toContain('> connection refused');
  });

  it('omits absent sections (no input, no resolvedParams, no output, no error)', () => {
    const nr = makeNodeRun({ status: 'succeeded' });
    const md = runToMarkdown(makeWorkflow(), makeRun({ nodeRuns: [nr] }), { now: NOW });
    expect(md).not.toContain('**Input**');
    expect(md).not.toContain('**Resolved params**');
    expect(md).not.toContain('**Output**');
    expect(md).not.toContain('**Error**');
  });

  it('handles a failed node alongside a succeeded one', () => {
    const nodeRuns = [
      makeNodeRun({ id: 'nr1', nodeId: 'n1', status: 'succeeded', output: { triggered: true } }),
      makeNodeRun({ id: 'nr2', nodeId: 'n2', status: 'failed', error: 'timeout' }),
    ];
    const md = runToMarkdown(makeWorkflow(), makeRun({ nodeRuns }), { now: NOW });
    expect(md).toContain('✅');
    expect(md).toContain('❌');
    expect(md).toContain('timeout');
  });

  it('ends with a single trailing newline', () => {
    const md = runToMarkdown(makeWorkflow(), makeRun(), { now: NOW });
    expect(md).toMatch(/\n$/);
    expect(md).not.toMatch(/\n\n$/);
  });
});

describe('runReportFilename', () => {
  it('slugifies the workflow name with run date', () => {
    const wf = makeWorkflow({ name: 'My Data Pipeline!' });
    const run = makeRun({ finishedAt: '2026-06-23T10:00:00Z' });
    expect(runReportFilename(wf, run)).toBe('my-data-pipeline-run-2026-06-23.md');
  });

  it('uses startedAt when finishedAt is absent', () => {
    const run = makeRun({ finishedAt: undefined, startedAt: '2026-06-23T09:00:00Z' });
    expect(runReportFilename(makeWorkflow({ name: 'W' }), run)).toMatch(/2026-06-23/);
  });
});
