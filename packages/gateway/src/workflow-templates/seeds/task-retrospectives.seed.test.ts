import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { beforeEach, describe, expect, it } from 'vitest';
import { parseConfig, TriggerSchema, WorkflowGraphSchema, type Workflow, type WorkflowNode } from '@midnite/shared';

import * as schema from '../../db/schema';
import { WorkflowsRepository } from '../../workflows/workflows.repository';
import { WorkflowEventBus } from '../../workflows/workflow-event-bus';
import { ExecutorRegistry } from '../../workflows/engine/executor-registry';
import { WorkflowEngine } from '../../workflows/engine/workflow-engine.service';
import type { NodeExecutor } from '../../workflows/engine/node-executor';
import seed from './task-retrospectives.seed';

describe('task-retrospectives seed', () => {
  it('is a task-event notifications template', () => {
    expect(seed.slug).toBe('task-retrospectives');
    expect(seed.category).toBe('notifications');
    expect(seed.credentialSlots ?? []).toHaveLength(0); // in-app notify needs no credential
  });

  it('fires on task done + abandoned via a valid task-event trigger', () => {
    const def = seed.definition as { trigger: Record<string, unknown> };
    const trigger = TriggerSchema.parse(def.trigger);
    expect(trigger.type).toBe('task-event');
    if (trigger.type !== 'task-event') throw new Error('unreachable');
    expect(trigger.events).toEqual(['task.done', 'task.abandoned']);
  });

  it('wires trigger → generate-retro → branch(notable) →(true) notify', () => {
    const def = seed.definition as {
      nodes: { id: string; type: string; params?: Record<string, unknown> }[];
      edges: { source: string; target: string; sourcePort?: string }[];
    };
    expect(def.nodes.map((n) => n.type)).toEqual([
      'trigger.task-event',
      'midnite.generate-retro',
      'logic.branch',
      'midnite.notify',
    ]);

    // The branch tests the generate-retro output's `notable` flag.
    const branch = def.nodes.find((n) => n.type === 'logic.branch')!;
    expect(branch.params).toMatchObject({ left: 'notable', operator: 'isTruthy' });

    // Notify only runs on the notable (true) path.
    const notifyEdge = def.edges.find((e) => e.target === 'n4')!;
    expect(notifyEdge.sourcePort).toBe('true');
    expect(notifyEdge.source).toBe('n3');

    const notify = def.nodes.find((n) => n.type === 'midnite.notify')!;
    expect(notify.params).toMatchObject({ kind: 'retro.notable' });
  });

  it('is install-valid — the stored graph parses (nodes carry positions)', () => {
    // Guards the install path (see daily-digest); a missing `position` or a
    // mis-keyed branch port would break "installable + one-click enable".
    const def = seed.definition as { nodes: unknown[]; edges: unknown[] };
    expect(() => WorkflowGraphSchema.parse({ nodes: def.nodes, edges: def.edges })).not.toThrow();
  });
});

// Phase 62 Verification — a real engine run over the retro seed with fake
// executors. Proves the notable branch routes to notify (and a clean done stays
// quiet), and that the notify node's expressions resolve against the real context
// (a regression guard: they used the non-existent `$trigger`/`$n2` roots before).

interface SeedDefinition {
  trigger: Record<string, unknown>;
  nodes: { id: string; type: string; label?: string; params?: Record<string, unknown> }[];
  edges: { id: string; source: string; target: string; sourcePort?: string }[];
}

const definition = seed.definition as unknown as SeedDefinition;
const NOW = '2026-07-11T00:00:00.000Z';

function toWorkflow(): Workflow {
  const nodes: WorkflowNode[] = definition.nodes.map((n, i) => ({
    id: n.id,
    type: n.type,
    label: n.label,
    position: { x: i * 160, y: 0 },
    params: n.params ?? {},
  }));
  const edges = definition.edges.map((e) => ({
    id: e.id,
    source: e.source,
    sourcePort: e.sourcePort ?? 'main',
    target: e.target,
    targetPort: 'main',
  }));
  return {
    id: 'retro-wf',
    name: seed.name,
    enabled: false,
    trigger: definition.trigger as Workflow['trigger'],
    nodes,
    edges,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function makeDb(): BetterSQLite3Database<typeof schema> {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(__dirname, '../../../drizzle') });
  return db;
}

describe('task-retrospectives seed — pipeline run', () => {
  let engine: WorkflowEngine;
  const notifyParams: Record<string, unknown>[] = [];
  let notable = true;

  beforeEach(() => {
    notifyParams.length = 0;
    const generateRetro: NodeExecutor = {
      typeId: 'midnite.generate-retro',
      async execute() {
        return { taskId: 't1', outcome: notable ? 'abandoned' : 'done', notable, narrative: null, generated: false };
      },
    };
    const notify: NodeExecutor = {
      typeId: 'midnite.notify',
      async execute(ctx) {
        notifyParams.push(ctx.params as Record<string, unknown>);
        return { notified: true };
      },
    };
    engine = new WorkflowEngine(
      new WorkflowsRepository(makeDb()),
      new ExecutorRegistry([generateRetro, notify]),
      new WorkflowEventBus(),
      parseConfig({ agent: {}, terminal: {}, knowledge: {}, gateway: {} }),
    );
  });

  const triggerInput = { event: 'task.abandoned', task: { id: 't1', title: 'Ship the thing' } };

  it('routes a notable retro to notify, resolving the task title from the trigger', async () => {
    notable = true;
    const run = await engine.runToCompletion(toWorkflow(), { triggerSource: 'task-event', input: triggerInput });

    expect(run.status).toBe('succeeded');
    expect(notifyParams).toHaveLength(1);
    // The expressions resolve against the real context ($node[trigger].json.task + $json.outcome).
    expect(notifyParams[0]).toMatchObject({
      kind: 'retro.notable',
      title: 'Notable retro: Ship the thing',
      body: 'Task "Ship the thing" ended abandoned — open its retrospective for the full story.',
      entityId: 't1',
    });
  });

  it('stays quiet on a clean done (the false branch has no target)', async () => {
    notable = false;
    const run = await engine.runToCompletion(toWorkflow(), {
      triggerSource: 'task-event',
      input: { event: 'task.done', task: { id: 't1', title: 'Ship the thing' } },
    });
    expect(run.status).toBe('succeeded');
    expect(notifyParams).toHaveLength(0);
  });
});
