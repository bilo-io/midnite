import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { beforeEach, describe, expect, it } from 'vitest';
import { parseConfig, type MidniteConfig } from '@midnite/shared';
import * as schema from '../db/schema';
import type { LlmService } from '../agent/llm/llm.service';
import { AgentsRepository, PRIMARY_ID } from './agents.repository';
import { HeartbeatScheduler } from './heartbeat-scheduler.service';

// Integration harness for the heartbeat scheduler over an in-memory SQLite. The
// LLM is the external boundary, faked as disabled — so a *due* tick records a
// deterministic "skipped" run and advances the schedule clock without any network,
// letting us assert the elapsed-since-lastHeartbeat due logic end-to-end.

const HOUR = 3_600_000;

function makeConfig(agents: Record<string, unknown>): MidniteConfig {
  return parseConfig({ agent: {}, agents, terminal: {}, knowledge: {}, gateway: {} });
}

interface Harness {
  repo: AgentsRepository;
  scheduler: HeartbeatScheduler;
  seedPrimary(overrides?: Partial<schema.PrimaryAgentInsert>): void;
}

function makeHarness(agents: Record<string, unknown> = {}): Harness {
  const config = makeConfig({ heartbeatEnabled: true, ...agents });
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') });

  const repo = new AgentsRepository(db);
  // AI disabled: a due tick resolves to a recorded "skipped" run, no network.
  const llm = { enabled: false } as unknown as LlmService;
  const scheduler = new HeartbeatScheduler(config, repo, llm);

  const now = '2026-06-08T00:00:00.000Z';
  function seedPrimary(overrides: Partial<schema.PrimaryAgentInsert> = {}): void {
    repo.insertPrimary({
      id: PRIMARY_ID,
      name: 'Orchestrator',
      description: '',
      heartbeatEnabled: 1,
      heartbeatPrompt: 'status?',
      heartbeatIntervalH: 4,
      lastHeartbeatAt: now,
      lastHeartbeatRunId: null,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    });
  }

  return { repo, scheduler, seedPrimary };
}

describe('heartbeat scheduler — due logic', () => {
  let h: Harness;
  beforeEach(() => {
    h = makeHarness();
  });

  it('does nothing when no primary is configured', async () => {
    await h.scheduler.tick();
    expect(h.repo.listHeartbeatRuns(10)).toHaveLength(0);
  });

  it('does nothing when the heartbeat is disabled or the prompt is blank', async () => {
    h.seedPrimary({ heartbeatEnabled: 0 });
    await h.scheduler.tick();
    expect(h.repo.listHeartbeatRuns(10)).toHaveLength(0);

    h.repo.updatePrimary({ heartbeatEnabled: 1, heartbeatPrompt: '   ', updatedAt: 'x' });
    await h.scheduler.tick();
    expect(h.repo.listHeartbeatRuns(10)).toHaveLength(0);
  });

  it('skips a not-yet-due heartbeat (last fire is recent)', async () => {
    const recent = new Date(Date.now() - HOUR).toISOString(); // 1h ago, interval 4h
    h.seedPrimary({ heartbeatIntervalH: 4, lastHeartbeatAt: recent });
    await h.scheduler.tick();
    expect(h.repo.listHeartbeatRuns(10)).toHaveLength(0);
    expect(h.repo.getPrimary()!.lastHeartbeatAt).toBe(recent);
  });

  it('fires a due heartbeat and advances the schedule clock so the next tick is not due', async () => {
    const stale = new Date(Date.now() - 10 * HOUR).toISOString(); // overdue (interval 4h)
    h.seedPrimary({ heartbeatIntervalH: 4, lastHeartbeatAt: stale });

    await h.scheduler.tick();

    // AI disabled → one recorded skip, and the clock advanced past `stale`.
    const runs = h.repo.listHeartbeatRuns(10);
    expect(runs).toHaveLength(1);
    expect(runs[0]!.status).toBe('skipped');
    const advanced = h.repo.getPrimary()!.lastHeartbeatAt!;
    expect(advanced).not.toBe(stale);
    expect(Date.parse(advanced)).toBeGreaterThan(Date.parse(stale));

    // Immediately ticking again is now a no-op (not due).
    await h.scheduler.tick();
    expect(h.repo.listHeartbeatRuns(10)).toHaveLength(1);
  });

  it('treats a never-fired heartbeat (no lastHeartbeatAt) as due', async () => {
    h.seedPrimary({ lastHeartbeatAt: null });
    await h.scheduler.tick();
    expect(h.repo.listHeartbeatRuns(10)).toHaveLength(1);
  });
});
