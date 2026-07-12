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
import { WorkflowEventBus } from './workflow-event-bus';
import type { NodeExecutor } from './engine/node-executor';
import type { WorkflowEvent } from '@midnite/shared';

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

// trigger → branch, with a true-path and a false-path action (both echo nodes).
function branchWorkflow(params: Record<string, unknown>): Workflow {
  return {
    id: 'wb',
    name: 'branch demo',
    enabled: false,
    trigger: { type: 'manual' },
    nodes: [
      { id: 'trig', type: 'trigger.manual', position: { x: 0, y: 0 }, params: {} },
      { id: 'br', type: 'logic.branch', position: { x: 200, y: 0 }, params },
      { id: 'yes', type: 'http.request', position: { x: 400, y: -60 }, params: { url: 'https://example.com' } },
      { id: 'no', type: 'http.request', position: { x: 400, y: 60 }, params: { url: 'https://example.com' } },
    ],
    edges: [
      { id: 'e1', source: 'trig', sourcePort: 'main', target: 'br', targetPort: 'main' },
      { id: 'e2', source: 'br', sourcePort: 'true', target: 'yes', targetPort: 'main' },
      { id: 'e3', source: 'br', sourcePort: 'false', target: 'no', targetPort: 'main' },
    ],
    createdAt: NOW,
    updatedAt: NOW,
  };
}

const CONFIG: MidniteConfig = parseConfig({ agent: {}, terminal: {}, knowledge: {}, gateway: {} });

describe('WorkflowEngine', () => {
  let repo: WorkflowsRepository;
  let engine: WorkflowEngine;
  let events: WorkflowEvent[];

  beforeEach(() => {
    repo = new WorkflowsRepository(makeDb());
    const bus = new WorkflowEventBus();
    events = [];
    bus.subscribe((e) => events.push(e));
    engine = new WorkflowEngine(repo, new ExecutorRegistry([echo, boom]), bus, CONFIG);
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

  it('takes the true path and skips the false path when the condition holds', async () => {
    const run = await engine.runToCompletion(branchWorkflow({ left: 'go', operator: 'isTruthy' }), {
      triggerSource: 'manual',
      input: { go: true },
    });
    expect(run.status).toBe('succeeded');
    expect(run.nodeRuns.find((n) => n.nodeId === 'br')!.status).toBe('succeeded');
    const yes = run.nodeRuns.find((n) => n.nodeId === 'yes')!;
    const no = run.nodeRuns.find((n) => n.nodeId === 'no')!;
    expect(yes.status).toBe('succeeded');
    expect(yes.output).toEqual({ ok: true, echoed: { go: true } }); // branch passes input through
    expect(no.status).toBe('skipped');
  });

  it('takes the false path and skips the true path when the condition fails', async () => {
    const run = await engine.runToCompletion(branchWorkflow({ left: 'go', operator: 'isTruthy' }), {
      triggerSource: 'manual',
      input: { go: false },
    });
    expect(run.status).toBe('succeeded');
    expect(run.nodeRuns.find((n) => n.nodeId === 'yes')!.status).toBe('skipped');
    expect(run.nodeRuns.find((n) => n.nodeId === 'no')!.status).toBe('succeeded');
  });

  it('validateGraph accepts a branch node', () => {
    const wf = branchWorkflow({ left: 'body.status', operator: 'equals', right: 'ok' });
    expect(() => engine.validateGraph({ nodes: wf.nodes, edges: wf.edges })).not.toThrow();
  });

  it('emits run/node lifecycle events in order on a successful run', async () => {
    await engine.runToCompletion(workflow('http.request'), {
      triggerSource: 'manual',
      input: { hello: 'world' },
    });
    const types = events.map((e) => e.type);
    expect(types[0]).toBe('run.started');
    expect(types.at(-1)).toBe('run.finished');
    expect(types).toContain('node.started');
    expect(types).toContain('node.succeeded');
    // every emitted event carries the same runId
    const runIds = new Set(events.map((e) => e.runId));
    expect(runIds.size).toBe(1);
  });

  it('emits run.failed when a node throws', async () => {
    await engine.runToCompletion(workflow('ai.claude'), { triggerSource: 'manual' });
    const types = events.map((e) => e.type);
    expect(types).toContain('node.failed');
    expect(types.at(-1)).toBe('run.failed');
  });
});

describe('WorkflowsService', () => {
  let repo: WorkflowsRepository;
  let service: WorkflowsService;

  beforeEach(() => {
    repo = new WorkflowsRepository(makeDb());
    const engine = new WorkflowEngine(repo, new ExecutorRegistry([echo, boom]), new WorkflowEventBus(), CONFIG);
    service = new WorkflowsService(repo, engine, CONFIG);
  });

  it('seeds a single trigger node on create', () => {
    const wf = service.create({ name: 'demo' });
    expect(wf.trigger.type).toBe('manual');
    expect(wf.nodes).toHaveLength(1);
    expect(wf.nodes[0]!.type).toBe('trigger.manual');
  });

  it('includes the cron in the summary for schedule triggers and omits it otherwise', () => {
    service.create({ name: 'fast', trigger: { type: 'schedule', cron: '*/5 * * * *', timezone: 'UTC' } });
    service.create({ name: 'manual one' });
    const summaries = service.listSummaries();
    const sched = summaries.find((s) => s.name === 'fast')!;
    const manual = summaries.find((s) => s.name === 'manual one')!;
    expect(sched.triggerType).toBe('schedule');
    expect(sched.cron).toBe('*/5 * * * *');
    expect(manual.cron).toBeUndefined();
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

describe('WorkflowsRepository — schedule hydration', () => {
  // The cron `schedule` trigger is a first-class trigger: a stored schedule
  // workflow (its trigger + `trigger.schedule` node) hydrates natively, cron
  // and timezone intact — the ready-set query surfaces it to the scheduler.
  it('hydrates a schedule workflow with its cron and node type intact', () => {
    const db = makeDb();
    const repo = new WorkflowsRepository(db);
    db.insert(schema.workflows)
      .values({
        id: 'sched-1',
        name: 'Nightly cron workflow',
        enabled: 1,
        triggerType: 'schedule',
        trigger: JSON.stringify({ type: 'schedule', cron: '0 9 * * *', timezone: 'UTC' }),
        graph: JSON.stringify({
          nodes: [
            { id: 'n1', type: 'trigger.schedule', label: 'Nightly', position: { x: 0, y: 0 }, params: {} },
            { id: 'n2', type: 'http.request', label: 'Fetch', position: { x: 200, y: 0 }, params: { url: 'https://example.com' } },
          ],
          edges: [{ id: 'e1', source: 'n1', sourcePort: 'main', target: 'n2', targetPort: 'main' }],
        }),
        createdAt: NOW,
        updatedAt: NOW,
      })
      .run();

    const row = repo.getWorkflowRow('sched-1')!;
    const wf = repo.hydrateWorkflow(row);
    expect(wf.trigger.type).toBe('schedule');
    if (wf.trigger.type === 'schedule') expect(wf.trigger.cron).toBe('0 9 * * *');
    expect(wf.nodes.find((n) => n.id === 'n1')!.type).toBe('trigger.schedule');
    expect(wf.nodes.find((n) => n.id === 'n2')!.type).toBe('http.request');

    expect(repo.listScheduledEnabledRows().map((r) => r.id)).toContain('sched-1');
  });
});
