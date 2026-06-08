import { describe, expect, it } from 'vitest';
import type { MidniteConfig } from '@midnite/shared';
import type { HeartbeatRunInsert, HeartbeatRunRow, PrimaryAgentRow } from '../db/schema';
import type { AnthropicService } from '../agent/anthropic.service';
import { AgentsRepository } from './agents.repository';
import { HeartbeatScheduler } from './heartbeat-scheduler.service';

const HOUR_MS = 3_600_000;

// In-memory repo covering just what the scheduler touches; inherits the pure
// hydrateRun/hydratePrimary mappers from the base.
class InMemoryRepo extends AgentsRepository {
  primary: PrimaryAgentRow | undefined;
  runs: HeartbeatRunRow[] = [];

  constructor(primary?: PrimaryAgentRow) {
    super({} as never);
    this.primary = primary;
  }

  override getPrimary(): PrimaryAgentRow | undefined {
    return this.primary;
  }

  override insertHeartbeatRun(row: HeartbeatRunInsert): HeartbeatRunRow {
    const full: HeartbeatRunRow = {
      id: row.id,
      status: row.status,
      triggerSource: row.triggerSource,
      model: row.model ?? null,
      systemPrompt: row.systemPrompt ?? null,
      prompt: row.prompt ?? null,
      output: row.output ?? null,
      error: row.error ?? null,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt ?? null,
    };
    this.runs.push(full);
    return full;
  }

  override updateHeartbeatRun(
    id: string,
    patch: Partial<HeartbeatRunInsert>,
  ): HeartbeatRunRow | undefined {
    const cur = this.runs.find((r) => r.id === id);
    if (!cur) return undefined;
    Object.assign(cur, patch);
    return cur;
  }

  override advanceHeartbeat(at: string, runId: string): void {
    if (this.primary) this.primary = { ...this.primary, lastHeartbeatAt: at, lastHeartbeatRunId: runId };
  }

  override setLastHeartbeatRunId(runId: string): void {
    if (this.primary) this.primary = { ...this.primary, lastHeartbeatRunId: runId };
  }
}

const now = '2026-06-08T00:00:00.000Z';

function primaryRow(over: Partial<PrimaryAgentRow> = {}): PrimaryAgentRow {
  return {
    id: 'primary',
    name: 'Orchestrator',
    description: 'You are the orchestrator.',
    heartbeatEnabled: 1,
    heartbeatPrompt: 'sweep open work',
    heartbeatIntervalH: 1,
    lastHeartbeatAt: null,
    lastHeartbeatRunId: null,
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

type CreateFn = (...args: unknown[]) => Promise<unknown>;

function makeAnthropic(opts: { enabled: boolean; create?: CreateFn }): AnthropicService {
  const create: CreateFn =
    opts.create ??
    (async () => ({ content: [{ type: 'text', text: 'beat' }], stop_reason: 'end_turn' }));
  return {
    enabled: opts.enabled,
    getActModel: () => 'claude-test',
    getClient: () => ({ messages: { create } }),
  } as unknown as AnthropicService;
}

const config = { agents: { heartbeatEnabled: true, schedulerTickMs: 60000 } } as unknown as MidniteConfig;

function makeScheduler(repo: InMemoryRepo, anthropic: AnthropicService) {
  return new HeartbeatScheduler(config, repo, anthropic);
}

function makeDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('HeartbeatScheduler', () => {
  it('fires when due, records success, and advances the schedule clock', async () => {
    const lastAt = new Date(Date.now() - 2 * HOUR_MS).toISOString();
    const repo = new InMemoryRepo(primaryRow({ lastHeartbeatAt: lastAt }));
    const scheduler = makeScheduler(repo, makeAnthropic({ enabled: true }));

    await scheduler.tick();

    expect(repo.runs).toHaveLength(1);
    expect(repo.runs[0]!.status).toBe('succeeded');
    expect(repo.runs[0]!.output).toBe('beat');
    expect(repo.primary!.lastHeartbeatAt).not.toBe(lastAt); // advanced
    expect(repo.primary!.lastHeartbeatRunId).toBe(repo.runs[0]!.id);
  });

  it('does not fire when the interval has not elapsed', async () => {
    const repo = new InMemoryRepo(primaryRow({ lastHeartbeatAt: new Date().toISOString() }));
    const scheduler = makeScheduler(repo, makeAnthropic({ enabled: true }));
    await scheduler.tick();
    expect(repo.runs).toHaveLength(0);
  });

  it('does nothing when the heartbeat is disabled', async () => {
    const repo = new InMemoryRepo(primaryRow({ heartbeatEnabled: 0, lastHeartbeatAt: null }));
    const scheduler = makeScheduler(repo, makeAnthropic({ enabled: true }));
    await scheduler.tick();
    expect(repo.runs).toHaveLength(0);
  });

  it('skips on tick when the prompt is blank', async () => {
    const repo = new InMemoryRepo(primaryRow({ heartbeatPrompt: '   ', lastHeartbeatAt: null }));
    const scheduler = makeScheduler(repo, makeAnthropic({ enabled: true }));
    await scheduler.tick();
    expect(repo.runs).toHaveLength(0);
  });

  it('records a skipped run and advances the clock when AI is disabled', async () => {
    const lastAt = new Date(Date.now() - 2 * HOUR_MS).toISOString();
    const repo = new InMemoryRepo(primaryRow({ lastHeartbeatAt: lastAt }));
    const scheduler = makeScheduler(repo, makeAnthropic({ enabled: false }));

    await scheduler.tick();

    expect(repo.runs).toHaveLength(1);
    expect(repo.runs[0]!.status).toBe('skipped');
    expect(repo.runs[0]!.error).toMatch(/AI is disabled/);
    expect(repo.primary!.lastHeartbeatAt).not.toBe(lastAt); // advanced so we don't spam
  });

  it('records a failed run when the API throws', async () => {
    const repo = new InMemoryRepo(primaryRow({ lastHeartbeatAt: null }));
    const scheduler = makeScheduler(
      repo,
      makeAnthropic({
        enabled: true,
        create: async () => {
          throw new Error('rate limited');
        },
      }),
    );

    const run = await scheduler.executeHeartbeat('manual');
    expect(run.status).toBe('failed');
    expect(run.error).toMatch(/rate limited/);
  });

  it('manual runs ignore the due check and the enabled flag', async () => {
    // Disabled + not due, but a manual run still fires.
    const repo = new InMemoryRepo(
      primaryRow({ heartbeatEnabled: 0, lastHeartbeatAt: new Date().toISOString() }),
    );
    const scheduler = makeScheduler(repo, makeAnthropic({ enabled: true }));

    const run = await scheduler.executeHeartbeat('manual');
    expect(run.status).toBe('succeeded');
    expect(run.triggerSource).toBe('manual');
  });

  it('records a skipped run for a manual run with a blank prompt', async () => {
    const repo = new InMemoryRepo(primaryRow({ heartbeatPrompt: '' }));
    const scheduler = makeScheduler(repo, makeAnthropic({ enabled: true }));
    const run = await scheduler.executeHeartbeat('manual');
    expect(run.status).toBe('skipped');
    expect(run.error).toMatch(/prompt is empty/);
  });

  it('refuses to run two heartbeats at once', async () => {
    const deferred = makeDeferred<unknown>();
    const repo = new InMemoryRepo(primaryRow({ lastHeartbeatAt: null }));
    const scheduler = makeScheduler(
      repo,
      makeAnthropic({ enabled: true, create: () => deferred.promise }),
    );

    const first = scheduler.executeHeartbeat('manual'); // starts, blocks on the API
    const second = await scheduler.executeHeartbeat('manual'); // sees running → skipped
    expect(second.status).toBe('skipped');
    expect(second.error).toMatch(/already in progress/);

    deferred.resolve({ content: [{ type: 'text', text: 'beat' }], stop_reason: 'end_turn' });
    const firstRun = await first;
    expect(firstRun.status).toBe('succeeded');
  });
});
