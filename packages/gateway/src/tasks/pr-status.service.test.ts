import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { parseConfig, type MidniteConfig, type Task } from '@midnite/shared';
import type { PrStatusInsert, PrStatusRow, TaskRow } from '../db/schema';
import type { PrStatusCore } from './lib/pr-status-map';
import { PrStatusService } from './pr-status.service';
import type { TasksRepository } from './tasks.repository';
import type { TaskEventBus } from './task-event-bus';

const config: MidniteConfig = parseConfig({ agent: {}, terminal: {}, gateway: {} });

/** Minimal in-memory stand-in for the repository methods the service touches. */
class FakeRepo {
  tasks = new Map<string, TaskRow>();
  pr = new Map<string, PrStatusRow>();

  addTask(id: string, prUrl: string | null): void {
    this.tasks.set(id, { id, prUrl } as TaskRow);
  }
  getTask(id: string): TaskRow | undefined {
    return this.tasks.get(id);
  }
  getPrStatusRow(id: string): PrStatusRow | undefined {
    return this.pr.get(id);
  }
  upsertPrStatus(row: PrStatusInsert): void {
    this.pr.set(row.taskId, { reviewDecision: null, ...row } as PrStatusRow);
  }
  listTasksWithUnmergedPr(): TaskRow[] {
    return [...this.tasks.values()].filter(
      (t) => t.prUrl && !['merged', 'closed'].includes(this.pr.get(t.id)?.state ?? ''),
    );
  }
  hydrate(row: TaskRow): Task {
    return { id: row.id } as Task;
  }
}

/** Service with the two network primitives replaced by canned responses. */
class TestService extends PrStatusService {
  gh: PrStatusCore | null = null;
  rest: PrStatusCore | null = null;
  ghCalls = 0;
  restCalls = 0;
  protected override async ghView(): Promise<PrStatusCore | null> {
    this.ghCalls++;
    return this.gh;
  }
  protected override async ghRest(): Promise<PrStatusCore | null> {
    this.restCalls++;
    return this.rest;
  }
}

function build() {
  const repo = new FakeRepo();
  const bus = { emit: vi.fn() } as unknown as TaskEventBus;
  const service = new TestService(config, repo as unknown as TasksRepository, bus);
  return { service, repo, bus };
}

const PR = 'https://github.com/bilo-io/midnite/pull/7';

describe('PrStatusService.fetchStatus', () => {
  it('uses the gh result and stamps url/number/fetchedAt', async () => {
    const { service } = build();
    service.gh = { state: 'open', checks: 'passing', reviewDecision: 'approved' };
    const status = await service.fetchStatus(PR, 'bilo-io/midnite', 7);
    expect(status).toMatchObject({ state: 'open', checks: 'passing', url: PR, number: 7 });
    expect(typeof status?.fetchedAt).toBe('string');
    expect(service.restCalls).toBe(0); // gh-first: REST not consulted
  });

  it('falls back to REST when gh returns null', async () => {
    const { service } = build();
    service.gh = null;
    service.rest = { state: 'merged', checks: 'none' };
    const status = await service.fetchStatus(PR, 'bilo-io/midnite', 7);
    expect(status?.state).toBe('merged');
    expect(service.ghCalls).toBe(1);
    expect(service.restCalls).toBe(1);
  });

  it('fails open (returns null) when both gh and REST fail', async () => {
    const { service } = build();
    service.gh = null;
    service.rest = null;
    expect(await service.fetchStatus(PR, 'bilo-io/midnite', 7)).toBeNull();
  });
});

describe('PrStatusService.refresh', () => {
  it('404s an unknown task', async () => {
    const { service } = build();
    await expect(service.refresh('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('persists the status and broadcasts task.updated only on a change', async () => {
    const { service, repo, bus } = build();
    repo.addTask('t1', PR);
    service.gh = { state: 'open', checks: 'pending' };

    await service.refresh('t1');
    expect(repo.getPrStatusRow('t1')).toMatchObject({ state: 'open', checks: 'pending' });
    expect(bus.emit).toHaveBeenCalledTimes(1);

    // Same status again → upsert happens but no new broadcast.
    await service.refresh('t1');
    expect(bus.emit).toHaveBeenCalledTimes(1);

    // A visible change re-broadcasts.
    service.gh = { state: 'merged', checks: 'passing' };
    await service.refresh('t1');
    expect(bus.emit).toHaveBeenCalledTimes(2);
  });

  it('is a no-op for a task without a parseable PR URL', async () => {
    const { service, repo, bus } = build();
    repo.addTask('t1', null);
    service.gh = { state: 'open', checks: 'none' };
    await service.refresh('t1');
    expect(repo.getPrStatusRow('t1')).toBeUndefined();
    expect(bus.emit).not.toHaveBeenCalled();
  });
});

describe('PrStatusService.poll', () => {
  it('refreshes only tasks whose PR is not terminal', async () => {
    const { service, repo } = build();
    repo.addTask('open', PR);
    repo.addTask('merged', 'https://github.com/bilo-io/midnite/pull/8');
    repo.upsertPrStatus({
      taskId: 'merged',
      url: 'https://github.com/bilo-io/midnite/pull/8',
      number: 8,
      state: 'merged',
      checks: 'passing',
      fetchedAt: 'z',
    });
    repo.addTask('no-pr', null);
    service.gh = { state: 'open', checks: 'passing' };

    await service.poll();
    // Only the single open-PR task was fetched.
    expect(service.ghCalls).toBe(1);
    expect(repo.getPrStatusRow('open')?.state).toBe('open');
  });
});
