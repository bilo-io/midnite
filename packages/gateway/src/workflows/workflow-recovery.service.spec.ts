import type { WorkflowEvent } from '@midnite/shared';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import type { MidniteDb } from '../db/db.module';
import * as schema from '../db/schema';
import { WorkflowEventBus } from './workflow-event-bus';
import { WorkflowRecoveryService } from './workflow-recovery.service';
import { WorkflowsRepository } from './workflows.repository';

const STALE_ERROR = 'gateway restarted mid-run';

type Harness = {
  repo: WorkflowsRepository;
  events: WorkflowEvent[];
  recover: () => void;
};

function makeHarness(): Harness {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema }) as unknown as MidniteDb;
  migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') });
  const repo = new WorkflowsRepository(db);
  const bus = new WorkflowEventBus();
  const events: WorkflowEvent[] = [];
  bus.subscribe((e) => events.push(e));
  const svc = new WorkflowRecoveryService(repo, bus);
  return { repo, events, recover: () => svc.onModuleInit() };
}

const run = (id: string, workflowId: string, status: string) => ({
  id,
  workflowId,
  status,
  triggerSource: 'manual',
  startedAt: '2026-06-22T00:00:00.000Z',
  finishedAt: status === 'running' ? null : '2026-06-22T00:01:00.000Z',
});

const nodeRun = (id: string, runId: string, status: string) => ({
  id,
  runId,
  nodeId: `node-${id}`,
  nodeType: 'set-data',
  status,
});

describe('WorkflowRecoveryService', () => {
  let h: Harness;
  beforeEach(() => {
    h = makeHarness();
  });

  it('does nothing on a clean boot (no running runs)', () => {
    h.repo.createRun(run('r1', 'wf1', 'succeeded'));
    h.recover();
    expect(h.repo.getRunRow('r1')?.status).toBe('succeeded');
    expect(h.events).toHaveLength(0);
  });

  it('fails a stale running run, sets the error + finishedAt, and emits run.failed', () => {
    h.repo.createRun(run('stale', 'wf1', 'running'));
    h.recover();

    const row = h.repo.getRunRow('stale');
    expect(row?.status).toBe('failed');
    expect(row?.error).toBe(STALE_ERROR);
    expect(row?.finishedAt).toBeTruthy();

    expect(h.events).toEqual([
      { type: 'run.failed', workflowId: 'wf1', runId: 'stale', at: expect.any(String), error: STALE_ERROR },
    ]);
  });

  it('fails the run\'s in-flight node-runs but leaves settled ones alone', () => {
    h.repo.createRun(run('stale', 'wf1', 'running'));
    h.repo.createNodeRun(nodeRun('inflight', 'stale', 'running'));
    h.repo.createNodeRun(nodeRun('settled', 'stale', 'succeeded'));
    h.recover();

    const byId = new Map(h.repo.listNodeRunRows('stale').map((n) => [n.id, n]));
    expect(byId.get('inflight')?.status).toBe('failed');
    expect(byId.get('inflight')?.error).toBe(STALE_ERROR);
    expect(byId.get('settled')?.status).toBe('succeeded');
  });

  it('leaves already-finished runs untouched', () => {
    h.repo.createRun(run('ok', 'wf1', 'succeeded'));
    h.repo.createRun(run('bad', 'wf1', 'failed'));
    h.recover();
    expect(h.repo.getRunRow('ok')?.status).toBe('succeeded');
    expect(h.repo.getRunRow('bad')?.status).toBe('failed');
    expect(h.events).toHaveLength(0);
  });

  it('reconciles every stale run across workflows', () => {
    h.repo.createRun(run('s1', 'wf1', 'running'));
    h.repo.createRun(run('s2', 'wf2', 'running'));
    h.repo.createRun(run('done', 'wf1', 'succeeded'));
    h.recover();

    expect(h.repo.getRunRow('s1')?.status).toBe('failed');
    expect(h.repo.getRunRow('s2')?.status).toBe('failed');
    expect(h.events.map((e) => e.type)).toEqual(['run.failed', 'run.failed']);
  });
});
