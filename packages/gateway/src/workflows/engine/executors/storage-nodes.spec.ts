import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { describe, expect, it } from 'vitest';
import { parseConfig, type Workflow, type WorkflowNode } from '@midnite/shared';
import * as schema from '../../../db/schema';
import { WorkflowsRepository } from '../../workflows.repository';
import { WorkflowStorageRepository } from '../../workflow-storage.repository';
import { WorkflowStorageService } from '../../workflow-storage.service';
import { WorkflowEventBus } from '../../workflow-event-bus';
import { ExecutorRegistry } from '../executor-registry';
import { WorkflowEngine } from '../workflow-engine.service';
import type { NodeRunContext } from '../node-executor';
import { StorageSetExecutor } from './storage-set.executor';
import { StorageGetExecutor } from './storage-get.executor';

// Phase 12 Theme C — storage.set / storage.get. Unlike the pure reshape nodes,
// these persist, so every case runs against a real (:memory:) SQLite via the
// repository → service the executors depend on.

function makeDb(): BetterSQLite3Database<typeof schema> {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(__dirname, '../../../../drizzle') });
  return db;
}

function ctx(workflowId: string, params: Record<string, unknown>): NodeRunContext {
  return { workflowId, workflowCreatedBy: null, input: {}, params, signal: new AbortController().signal, log: () => {} };
}

describe('storage.set / storage.get executors', () => {
  function build() {
    const service = new WorkflowStorageService(new WorkflowStorageRepository(makeDb()));
    return { set: new StorageSetExecutor(service), get: new StorageGetExecutor(service) };
  }

  it('round-trips a value through set then get', async () => {
    const { set, get } = build();
    await set.execute(ctx('w1', { key: 'lastId', value: 99 }));
    expect(await get.execute(ctx('w1', { key: 'lastId', defaultValue: null }))).toBe(99);
  });

  it('set returns the stored value (readable downstream in the same run)', async () => {
    const { set } = build();
    expect(await set.execute(ctx('w1', { key: 'k', value: { a: 1 } }))).toEqual({ a: 1 });
  });

  it('get returns the configured default for a never-set key', async () => {
    const { get } = build();
    expect(await get.execute(ctx('w1', { key: 'missing', defaultValue: 'fallback' }))).toBe('fallback');
  });

  it('get defaults a never-set key to null when no default is given', async () => {
    const { get } = build();
    expect(await get.execute(ctx('w1', { key: 'missing', defaultValue: undefined }))).toBeNull();
  });

  it('distinguishes a stored null from a never-set key', async () => {
    const { set, get } = build();
    await set.execute(ctx('w1', { key: 'k', value: null }));
    // Stored null comes back as null, not the default.
    expect(await get.execute(ctx('w1', { key: 'k', defaultValue: 'default' }))).toBeNull();
  });

  it('overwrites on a repeated set under the same key', async () => {
    const { set, get } = build();
    await set.execute(ctx('w1', { key: 'k', value: 1 }));
    await set.execute(ctx('w1', { key: 'k', value: 2 }));
    expect(await get.execute(ctx('w1', { key: 'k', defaultValue: null }))).toBe(2);
  });

  it('scopes storage per workflow', async () => {
    const { set, get } = build();
    await set.execute(ctx('w1', { key: 'k', value: 'one' }));
    expect(await get.execute(ctx('w2', { key: 'k', defaultValue: 'none' }))).toBe('none');
  });

  it('rejects an empty key', async () => {
    const { set } = build();
    await expect(set.execute(ctx('w1', { key: '', value: 1 }))).rejects.toThrow();
  });
});

// --- Engine integration: persist across runs + resolve {{expr}} (Theme B + C) ---

const NOW = '2026-06-21T00:00:00.000Z';

function workflow(nodes: WorkflowNode[], edges: Workflow['edges']): Workflow {
  return {
    id: 'wf-storage',
    name: 'storage',
    enabled: false,
    trigger: { type: 'manual' },
    nodes,
    edges,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function engineWith(db: BetterSQLite3Database<typeof schema>): WorkflowEngine {
  const storage = new WorkflowStorageService(new WorkflowStorageRepository(db));
  return new WorkflowEngine(
    new WorkflowsRepository(db),
    new ExecutorRegistry([new StorageSetExecutor(storage), new StorageGetExecutor(storage)]),
    new WorkflowEventBus(),
    parseConfig({ agent: {}, terminal: {}, knowledge: {}, gateway: {} }),
  );
}

describe('storage nodes — engine integration', () => {
  it('persists across runs: set in one run, get in a later run', async () => {
    const db = makeDb();
    const engine = engineWith(db);

    const setWf = workflow(
      [
        { id: 'trig', type: 'trigger.manual', label: 'Trigger', position: { x: 0, y: 0 }, params: {} },
        {
          id: 'save',
          type: 'storage.set',
          label: 'Save',
          position: { x: 200, y: 0 },
          params: { key: 'lastSeen', value: '{{$json.id}}' },
        },
      ],
      [{ id: 'e1', source: 'trig', sourcePort: 'main', target: 'save', targetPort: 'main' }],
    );

    const run1 = await engine.runToCompletion(setWf, { triggerSource: 'manual', input: { id: 7 } });
    expect(run1.status).toBe('succeeded');
    const save = run1.nodeRuns.find((r) => r.nodeId === 'save')!;
    // The bare {{expr}} preserves the number's type, and Theme B persists it.
    expect(save.output).toBe(7);
    expect(save.resolvedParams).toEqual({ key: 'lastSeen', value: 7 });

    // A separate, later run of the same workflow reads the stored value back.
    const getWf = workflow(
      [
        { id: 'trig', type: 'trigger.manual', label: 'Trigger', position: { x: 0, y: 0 }, params: {} },
        {
          id: 'load',
          type: 'storage.get',
          label: 'Load',
          position: { x: 200, y: 0 },
          params: { key: 'lastSeen', defaultValue: null },
        },
      ],
      [{ id: 'e1', source: 'trig', sourcePort: 'main', target: 'load', targetPort: 'main' }],
    );

    const run2 = await engine.runToCompletion(getWf, { triggerSource: 'manual', input: {} });
    expect(run2.status).toBe('succeeded');
    expect(run2.nodeRuns.find((r) => r.nodeId === 'load')!.output).toBe(7);
  });

  it('returns the default when the key has never been set', async () => {
    const engine = engineWith(makeDb());
    const getWf = workflow(
      [
        { id: 'trig', type: 'trigger.manual', label: 'Trigger', position: { x: 0, y: 0 }, params: {} },
        {
          id: 'load',
          type: 'storage.get',
          label: 'Load',
          position: { x: 200, y: 0 },
          params: { key: 'never', defaultValue: 'fallback' },
        },
      ],
      [{ id: 'e1', source: 'trig', sourcePort: 'main', target: 'load', targetPort: 'main' }],
    );
    const run = await engine.runToCompletion(getWf, { triggerSource: 'manual', input: {} });
    expect(run.status).toBe('succeeded');
    expect(run.nodeRuns.find((r) => r.nodeId === 'load')!.output).toBe('fallback');
  });
});
