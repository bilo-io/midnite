import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { parseConfig, type MidniteConfig, type Workflow } from '@midnite/shared';
import * as schema from '../db/schema';
import { WorkflowsRepository } from './workflows.repository';
import { ExecutorRegistry } from './engine/executor-registry';
import { WorkflowEngine } from './engine/workflow-engine.service';
import { WorkflowsService } from './workflows.service';
import type { NodeExecutor } from './engine/node-executor';

function makeDb(): BetterSQLite3Database<typeof schema> {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(__dirname, '../../drizzle') });
  return db;
}

// Fakes for the two MVP node types — deterministic, no network/AI.
const echo: NodeExecutor = {
  typeId: 'http.request',
  async execute(ctx) {
    return { ok: true, echoed: ctx.input };
  },
};
const boom: NodeExecutor = {
  typeId: 'ai.claude',
  async execute() {
    throw new Error('boom');
  },
};

const NOW = '2026-06-07T00:00:00.000Z';

function workflow(actionType: string): Workflow {
  return {
    id: 'w1',
    name: 'demo',
    enabled: false,
    trigger: { type: 'manual' },
    nodes: [
      { id: 'trig', type: 'trigger.manual', position: { x: 0, y: 0 }, params: {} },
      {
        id: 'act',
        type: actionType,
        position: { x: 200, y: 0 },
        params: actionType === 'http.request' ? { url: 'https://example.com' } : { prompt: 'hi' },
      },
    ],
    edges: [{ id: 'e1', source: 'trig', sourcePort: 'main', target: 'act', targetPort: 'main' }],
    createdAt: NOW,
    updatedAt: NOW,
  };
}

const CONFIG: MidniteConfig = parseConfig({ agent: {}, terminal: {}, knowledge: {}, gateway: {} });

describe('WorkflowEngine', () => {
  let repo: WorkflowsRepository;
  let engine: WorkflowEngine;

  beforeEach(() => {
    repo = new WorkflowsRepository(makeDb());
    engine = new WorkflowEngine(repo, new ExecutorRegistry([echo, boom]));
  });

  it('runs a linear graph, passing the trigger payload downstream', async () => {
    const run = await engine.runToCompletion(workflow('http.request'), {
      triggerSource: 'manual',
      input: { hello: 'world' },
    });
    expect(run.status).toBe('succeeded');
    const act = run.nodeRuns.find((n) => n.nodeId === 'act')!;
    expect(act.status).toBe('succeeded');
    expect(act.output).toEqual({ ok: true, echoed: { hello: 'world' } });
  });

  it('short-circuits and marks the run failed when a node throws', async () => {
    const run = await engine.runToCompletion(workflow('ai.claude'), { triggerSource: 'manual' });
    expect(run.status).toBe('failed');
    expect(run.error).toBe('boom');
    const act = run.nodeRuns.find((n) => n.nodeId === 'act')!;
    expect(act.status).toBe('failed');
    expect(act.error).toBe('boom');
  });

  it('validateGraph rejects unknown node types', () => {
    const wf = workflow('http.request');
    wf.nodes[1]!.type = 'does.not.exist';
    expect(() => engine.validateGraph({ nodes: wf.nodes, edges: wf.edges })).toThrow(/unknown node type/);
  });

  it('validateGraph rejects invalid node params', () => {
    const wf = workflow('http.request');
    wf.nodes[1]!.params = { url: 'not-a-url' };
    expect(() => engine.validateGraph({ nodes: wf.nodes, edges: wf.edges })).toThrow(/invalid params/);
  });
});

describe('WorkflowsService', () => {
  let repo: WorkflowsRepository;
  let service: WorkflowsService;

  beforeEach(() => {
    repo = new WorkflowsRepository(makeDb());
    const engine = new WorkflowEngine(repo, new ExecutorRegistry([echo, boom]));
    service = new WorkflowsService(repo, engine, CONFIG);
  });

  it('seeds a single trigger node on create', () => {
    const wf = service.create({ name: 'demo' });
    expect(wf.trigger.type).toBe('manual');
    expect(wf.nodes).toHaveLength(1);
    expect(wf.nodes[0]!.type).toBe('trigger.manual');
  });

  it('keeps the trigger node type in sync with workflow.trigger on update', () => {
    const wf = service.create({ name: 'demo' });
    const updated = service.update(wf.id, { trigger: { type: 'schedule', cron: '0 9 * * *', timezone: 'UTC' } });
    expect(updated.trigger.type).toBe('schedule');
    const trig = updated.nodes.find((n) => n.type.startsWith('trigger.'))!;
    expect(trig.type).toBe('trigger.schedule');
  });

  it('rotates a webhook secret and rejects a bad token', () => {
    let wf = service.create({ name: 'hook', trigger: { type: 'webhook', method: 'POST', hasSecret: false } });
    wf = service.update(wf.id, { enabled: true });
    const info = service.rotateWebhookSecret(wf.id);
    expect(info.token.length).toBeGreaterThan(0);
    expect(info.url).toContain(`/hooks/workflows/${wf.id}/`);
    expect(service.handleWebhook(wf.id, info.token, { a: 1 })).toBeTruthy();
    expect(() => service.handleWebhook(wf.id, 'wrong-token', {})).toThrow();
  });
});
