import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { beforeEach, describe, expect, it } from 'vitest';
import * as schema from '../db/schema';
import { AgentsRepository, PRIMARY_ID } from './agents.repository';

function makeRepo() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') });
  return new AgentsRepository(db);
}

let repo: AgentsRepository;
const now = '2026-06-08T00:00:00.000Z';

beforeEach(() => {
  repo = makeRepo();
});

function seedPrimary(overrides: Partial<schema.PrimaryAgentInsert> = {}) {
  repo.insertPrimary({
    id: PRIMARY_ID,
    name: 'Orchestrator',
    description: '',
    heartbeatEnabled: 0,
    heartbeatPrompt: '',
    heartbeatIntervalH: 4,
    lastHeartbeatAt: now,
    lastHeartbeatRunId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

describe('AgentsRepository', () => {
  it('seeds the primary singleton idempotently', () => {
    seedPrimary({ name: 'First' });
    seedPrimary({ name: 'Second' }); // onConflictDoNothing — must not overwrite
    const primary = repo.hydratePrimary(repo.getPrimary()!);
    expect(primary.name).toBe('First');
  });

  it('hydrates the primary with the heartbeat flag as a boolean', () => {
    seedPrimary({ heartbeatEnabled: 1, heartbeatPrompt: 'go', heartbeatIntervalH: 12 });
    const primary = repo.hydratePrimary(repo.getPrimary()!);
    expect(primary.heartbeatEnabled).toBe(true);
    expect(primary.heartbeatPrompt).toBe('go');
    expect(primary.heartbeatIntervalH).toBe(12);
    expect(primary.lastHeartbeatAt).toBe(now);
  });

  it('updates the primary and advances heartbeat bookkeeping', () => {
    seedPrimary();
    repo.updatePrimary({ heartbeatEnabled: 1, description: 'sys', updatedAt: now });
    repo.advanceHeartbeat('2026-06-08T04:00:00.000Z', 'run-1');
    const row = repo.getPrimary()!;
    expect(row.heartbeatEnabled).toBe(1);
    expect(row.description).toBe('sys');
    expect(row.lastHeartbeatAt).toBe('2026-06-08T04:00:00.000Z');
    expect(row.lastHeartbeatRunId).toBe('run-1');
  });

  it('does CRUD on subagents ordered by creation', () => {
    const a = repo.insertSubAgent({
      id: 'a',
      name: 'Alpha',
      role: 'r1',
      description: 'd1',
      createdAt: '2026-06-08T00:00:01.000Z',
      updatedAt: now,
    });
    repo.insertSubAgent({
      id: 'b',
      name: 'Beta',
      role: 'r2',
      description: 'd2',
      createdAt: '2026-06-08T00:00:02.000Z',
      updatedAt: now,
    });
    expect(repo.listSubAgents().map((s) => s.id)).toEqual(['a', 'b']);

    repo.updateSubAgent(a.id, { role: 'updated', updatedAt: now });
    expect(repo.getSubAgent('a')!.role).toBe('updated');

    repo.deleteSubAgent('a');
    expect(repo.getSubAgent('a')).toBeUndefined();
    expect(repo.listSubAgents().map((s) => s.id)).toEqual(['b']);
  });

  it('lists heartbeat runs newest-first, bounded by limit', () => {
    for (let i = 0; i < 3; i++) {
      repo.insertHeartbeatRun({
        id: `r${i}`,
        status: 'succeeded',
        triggerSource: 'schedule',
        model: 'm',
        systemPrompt: null,
        prompt: 'p',
        output: 'o',
        error: null,
        startedAt: `2026-06-08T0${i}:00:00.000Z`,
        finishedAt: `2026-06-08T0${i}:00:01.000Z`,
      });
    }
    const runs = repo.listHeartbeatRuns(2);
    expect(runs.map((r) => r.id)).toEqual(['r2', 'r1']);
    expect(repo.hydrateRun(runs[0]!).output).toBe('o');
  });

  it('updates a heartbeat run from running to a terminal state', () => {
    repo.insertHeartbeatRun({
      id: 'run',
      status: 'running',
      triggerSource: 'manual',
      model: 'm',
      systemPrompt: null,
      prompt: 'p',
      output: null,
      error: null,
      startedAt: now,
      finishedAt: null,
    });
    const updated = repo.updateHeartbeatRun('run', {
      status: 'failed',
      error: 'boom',
      finishedAt: now,
    })!;
    const run = repo.hydrateRun(updated);
    expect(run.status).toBe('failed');
    expect(run.error).toBe('boom');
    expect(run.finishedAt).toBe(now);
  });
});
