import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseConfig, type Workflow, type WorkflowNode } from '@midnite/shared';
import * as schema from '../../db/schema';
import { WorkflowsRepository } from '../workflows.repository';
import { WorkflowEventBus } from '../workflow-event-bus';
import { ExecutorRegistry } from './executor-registry';
import { WorkflowEngine } from './workflow-engine.service';
import type { NodeExecutor } from './node-executor';

// Theme B — engine resolves `{{expr}}` params against the run context before each
// node executes. These specs drive real runs against :memory: SQLite and assert
// the *resolved* values reach the executor and are persisted on the NodeRun.

function makeDb(): BetterSQLite3Database<typeof schema> {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(__dirname, '../../../drizzle') });
  return db;
}

// http.request: echoes its input, so a downstream node has something to reference.
const echo: NodeExecutor = {
  typeId: 'http.request',
  async execute(ctx) {
    return { ok: true, echoed: ctx.input };
  },
};
// ai.claude: captures the (already-resolved) params it received, so a test can
// assert what resolution produced.
const capture: NodeExecutor = {
  typeId: 'ai.claude',
  async execute(ctx) {
    return { seenParams: ctx.params };
  },
};

const NOW = '2026-06-07T00:00:00.000Z';

// trigger ("Trigger") → http.request ("Fetch") → ai.claude ("Use"), where Use's
// params are supplied by the caller (so each test templates them differently).
function chain(useParams: Record<string, unknown>): Workflow {
  const nodes: WorkflowNode[] = [
    { id: 'trig', type: 'trigger.manual', label: 'Trigger', position: { x: 0, y: 0 }, params: {} },
    {
      id: 'fetch',
      type: 'http.request',
      label: 'Fetch',
      position: { x: 200, y: 0 },
      params: { url: 'https://example.com' },
    },
    { id: 'use', type: 'ai.claude', label: 'Use', position: { x: 400, y: 0 }, params: useParams },
  ];
  return {
    id: 'w1',
    name: 'chain',
    enabled: false,
    trigger: { type: 'manual' },
    nodes,
    edges: [
      { id: 'e1', source: 'trig', sourcePort: 'main', target: 'fetch', targetPort: 'main' },
      { id: 'e2', source: 'fetch', sourcePort: 'main', target: 'use', targetPort: 'main' },
    ],
    createdAt: NOW,
    updatedAt: NOW,
  };
}

describe('WorkflowEngine — expression resolution', () => {
  let repo: WorkflowsRepository;
  let engine: WorkflowEngine;

  beforeEach(() => {
    repo = new WorkflowsRepository(makeDb());
    engine = new WorkflowEngine(repo, new ExecutorRegistry([echo, capture]), new WorkflowEventBus(), parseConfig({ agent: {}, terminal: {}, knowledge: {}, gateway: {} }));
  });

  it('resolves {{$node["..."]}} against an upstream output (type preserved)', async () => {
    const run = await engine.runToCompletion(chain({ prompt: '{{$node["Fetch"].json.echoed.n}}' }), {
      triggerSource: 'manual',
      input: { n: 42 },
    });

    expect(run.status).toBe('succeeded');
    const use = run.nodeRuns.find((r) => r.nodeId === 'use')!;
    // A bare single span preserves the referenced value's type (number, not "42").
    expect(use.output).toEqual({ seenParams: { prompt: 42 } });
  });

  it('resolves {{$json}} (the node\'s merged input) in mixed text → a string', async () => {
    const run = await engine.runToCompletion(chain({ prompt: 'n=={{$json.echoed.n}}' }), {
      triggerSource: 'manual',
      input: { n: 7 },
    });

    const use = run.nodeRuns.find((r) => r.nodeId === 'use')!;
    expect(use.output).toEqual({ seenParams: { prompt: 'n==7' } });
  });

  it('persists the resolved params on the NodeRun (returned by getRun)', async () => {
    const run = await engine.runToCompletion(chain({ prompt: '{{$node["Fetch"].json.echoed.n}}' }), {
      triggerSource: 'manual',
      input: { n: 'hello' },
    });

    const fetched = repo.getRun('w1', run.id)!;
    const use = fetched.nodeRuns.find((r) => r.nodeId === 'use')!;
    expect(use.resolvedParams).toEqual({ prompt: 'hello' });
    // Literal params pass through unchanged.
    const fetch = fetched.nodeRuns.find((r) => r.nodeId === 'fetch')!;
    expect(fetch.resolvedParams).toEqual({ url: 'https://example.com' });
    // Trigger nodes are not resolved.
    const trig = fetched.nodeRuns.find((r) => r.nodeId === 'trig')!;
    expect(trig.resolvedParams).toBeUndefined();
  });

  it('fails the referencing node (not its predecessors) on a missing reference', async () => {
    const run = await engine.runToCompletion(chain({ prompt: '{{$node["Typo"].json.x}}' }), {
      triggerSource: 'manual',
      input: { n: 1 },
    });

    expect(run.status).toBe('failed');
    const fetch = run.nodeRuns.find((r) => r.nodeId === 'fetch')!;
    const use = run.nodeRuns.find((r) => r.nodeId === 'use')!;
    expect(fetch.status).toBe('succeeded'); // the upstream node still ran
    expect(use.status).toBe('failed');
    expect(use.error).toMatch(/expression error in "Use"/);
    expect(use.error).toMatch(/Typo/);
    expect(run.error).toBe(use.error);
  });
});

// trigger → branch (templated `right`) → true/false echo actions.
function branch(params: Record<string, unknown>): Workflow {
  const nodes: WorkflowNode[] = [
    { id: 'trig', type: 'trigger.manual', label: 'Trigger', position: { x: 0, y: 0 }, params: {} },
    { id: 'br', type: 'logic.branch', label: 'Gate', position: { x: 200, y: 0 }, params },
    { id: 'yes', type: 'http.request', label: 'Yes', position: { x: 400, y: -60 }, params: { url: 'https://example.com' } },
    { id: 'no', type: 'http.request', label: 'No', position: { x: 400, y: 60 }, params: { url: 'https://example.com' } },
  ];
  return {
    id: 'wb',
    name: 'branch',
    enabled: false,
    trigger: { type: 'manual' },
    nodes,
    edges: [
      { id: 'e1', source: 'trig', sourcePort: 'main', target: 'br', targetPort: 'main' },
      { id: 'e2', source: 'br', sourcePort: 'true', target: 'yes', targetPort: 'main' },
      { id: 'e3', source: 'br', sourcePort: 'false', target: 'no', targetPort: 'main' },
    ],
    createdAt: NOW,
    updatedAt: NOW,
  };
}

describe('WorkflowEngine — branch params are resolved too', () => {
  let repo: WorkflowsRepository;
  let engine: WorkflowEngine;

  beforeEach(() => {
    repo = new WorkflowsRepository(makeDb());
    engine = new WorkflowEngine(repo, new ExecutorRegistry([echo, capture]), new WorkflowEventBus(), parseConfig({ agent: {}, terminal: {}, knowledge: {}, gateway: {} }));
  });

  it('templates the branch condition `right` from the input and takes the true path', async () => {
    const run = await engine.runToCompletion(
      branch({ left: 'status', operator: 'equals', right: '{{$json.expected}}' }),
      { triggerSource: 'manual', input: { status: 'ok', expected: 'ok' } },
    );

    expect(run.status).toBe('succeeded');
    expect(run.nodeRuns.find((r) => r.nodeId === 'yes')!.status).toBe('succeeded');
    expect(run.nodeRuns.find((r) => r.nodeId === 'no')!.status).toBe('skipped');
    expect(run.nodeRuns.find((r) => r.nodeId === 'br')!.resolvedParams).toEqual({
      left: 'status',
      operator: 'equals',
      right: 'ok',
    });
  });
});

// Phase 60 B — `$env` must expose ordinary env vars but never the gateway's own
// master secrets (a resolved value is persisted + broadcast + exfiltratable).
describe('WorkflowEngine — $env excludes gateway master secrets', () => {
  let repo: WorkflowsRepository;
  let engine: WorkflowEngine;

  beforeEach(() => {
    repo = new WorkflowsRepository(makeDb());
    engine = new WorkflowEngine(repo, new ExecutorRegistry([echo, capture]), new WorkflowEventBus(), parseConfig({ agent: {}, terminal: {}, knowledge: {}, gateway: {} }));
    process.env.MIDNITE_SECRET_KEY = 'SEKRIT-master-key';
    process.env.PUBLIC_WF_VAR = 'public-ok';
  });
  afterEach(() => {
    delete process.env.MIDNITE_SECRET_KEY;
    delete process.env.PUBLIC_WF_VAR;
  });

  it('still resolves an ordinary (non-secret) env var', async () => {
    const run = await engine.runToCompletion(chain({ prompt: 'v={{$env.PUBLIC_WF_VAR}}' }), {
      triggerSource: 'manual',
      input: {},
    });
    expect(run.nodeRuns.find((r) => r.nodeId === 'use')!.output).toEqual({
      seenParams: { prompt: 'v=public-ok' },
    });
  });

  it('never surfaces MIDNITE_SECRET_KEY through $env', async () => {
    const run = await engine.runToCompletion(chain({ prompt: '{{$env.MIDNITE_SECRET_KEY}}' }), {
      triggerSource: 'manual',
      input: {},
    });
    // Whether the reference errors (scrubbed → undefined) or empties, the secret
    // value must never appear anywhere in the run (outputs, resolved params, error).
    expect(JSON.stringify(run)).not.toContain('SEKRIT-master-key');
  });
});
