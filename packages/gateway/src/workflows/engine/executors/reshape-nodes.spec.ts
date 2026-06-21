import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { describe, expect, it } from 'vitest';
import type { Workflow, WorkflowNode } from '@midnite/shared';
import * as schema from '../../../db/schema';
import { WorkflowsRepository } from '../../workflows.repository';
import { WorkflowEventBus } from '../../workflow-event-bus';
import { ExecutorRegistry } from '../executor-registry';
import { WorkflowEngine } from '../workflow-engine.service';
import type { NodeRunContext } from '../node-executor';
import { SetDataExecutor } from './set-data.executor';
import { MergeExecutor } from './merge.executor';
import { DataFilterExecutor } from './data-filter.executor';

// Phase 12 Theme C — pure reshape nodes (setData / merge / filter). Executors are
// pure, so most cases call execute() directly; one engine integration proves
// setData composes with Theme B's resolve-before-execute.

function ctx(input: unknown, params: Record<string, unknown>): NodeRunContext {
  return { input, params, signal: new AbortController().signal, log: () => {} };
}

describe('SetDataExecutor', () => {
  const exec = new SetDataExecutor();

  it('replace mode emits only the set fields', async () => {
    expect(await exec.execute(ctx({ keep: 1 }, { mode: 'replace', fields: { a: 1, b: 'x' } }))).toEqual({
      a: 1,
      b: 'x',
    });
  });

  it('merge mode overlays the set fields onto the input object', async () => {
    expect(
      await exec.execute(ctx({ keep: 1, a: 0 }, { mode: 'merge', fields: { a: 2 } })),
    ).toEqual({ keep: 1, a: 2 });
  });

  it('merge mode ignores a non-object input', async () => {
    expect(await exec.execute(ctx('scalar', { mode: 'merge', fields: { a: 1 } }))).toEqual({ a: 1 });
  });

  it('defaults to replace with an empty object', async () => {
    expect(await exec.execute(ctx({ a: 1 }, {}))).toEqual({});
  });
});

describe('MergeExecutor', () => {
  const exec = new MergeExecutor();

  it('shallow-merges object inputs left-to-right', async () => {
    expect(await exec.execute(ctx([{ a: 1 }, { a: 2, b: 3 }], { mode: 'shallowMerge' }))).toEqual({
      a: 2,
      b: 3,
    });
  });

  it('collects inputs into an array', async () => {
    expect(await exec.execute(ctx([{ a: 1 }, 2], { mode: 'array' }))).toEqual([{ a: 1 }, 2]);
  });

  it('concatenates array inputs, wrapping scalars', async () => {
    expect(await exec.execute(ctx([[1, 2], 3], { mode: 'concat' }))).toEqual([1, 2, 3]);
  });

  it('normalises a single (non-array) input', async () => {
    expect(await exec.execute(ctx({ a: 1 }, { mode: 'shallowMerge' }))).toEqual({ a: 1 });
  });
});

describe('DataFilterExecutor', () => {
  const exec = new DataFilterExecutor();

  it('picks only the named fields', async () => {
    expect(
      await exec.execute(ctx({ a: 1, b: 2, c: 3 }, { mode: 'pick', fields: ['a', 'c'] })),
    ).toEqual({ a: 1, c: 3 });
  });

  it('omits the named fields', async () => {
    expect(
      await exec.execute(ctx({ a: 1, b: 2, c: 3 }, { mode: 'omit', fields: ['b'] })),
    ).toEqual({ a: 1, c: 3 });
  });

  it('yields {} for a non-object input', async () => {
    expect(await exec.execute(ctx('scalar', { mode: 'pick', fields: ['a'] }))).toEqual({});
  });
});

// --- Engine integration: setData resolves {{expr}} fields (Theme B + C) ---

function makeDb(): BetterSQLite3Database<typeof schema> {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(__dirname, '../../../../drizzle') });
  return db;
}

const NOW = '2026-06-07T00:00:00.000Z';

// trigger → logic.setData, where setData's fields reference the trigger output.
function setDataChain(fields: Record<string, unknown>, mode = 'replace'): Workflow {
  const nodes: WorkflowNode[] = [
    { id: 'trig', type: 'trigger.manual', label: 'Trigger', position: { x: 0, y: 0 }, params: {} },
    { id: 'shape', type: 'logic.setData', label: 'Shape', position: { x: 200, y: 0 }, params: { mode, fields } },
  ];
  return {
    id: 'w1',
    name: 'setData',
    enabled: false,
    trigger: { type: 'manual' },
    nodes,
    edges: [{ id: 'e1', source: 'trig', sourcePort: 'main', target: 'shape', targetPort: 'main' }],
    createdAt: NOW,
    updatedAt: NOW,
  };
}

describe('logic.setData — engine integration', () => {
  it('resolves {{expr}} field values against upstream output before building the object', async () => {
    const repo = new WorkflowsRepository(makeDb());
    const engine = new WorkflowEngine(
      repo,
      new ExecutorRegistry([new SetDataExecutor()]),
      new WorkflowEventBus(),
    );

    const run = await engine.runToCompletion(
      setDataChain({ greeting: 'hi {{$json.name}}', count: '{{$node["Trigger"].json.n}}' }),
      { triggerSource: 'manual', input: { name: 'ada', n: 3 } },
    );

    expect(run.status).toBe('succeeded');
    const shape = run.nodeRuns.find((r) => r.nodeId === 'shape')!;
    // Mixed text → string; a bare span preserves the number's type.
    expect(shape.output).toEqual({ greeting: 'hi ada', count: 3 });
    // Theme B persists what the executor received.
    expect(shape.resolvedParams).toEqual({
      mode: 'replace',
      fields: { greeting: 'hi ada', count: 3 },
    });
  });
});
