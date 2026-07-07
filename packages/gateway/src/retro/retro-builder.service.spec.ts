import { describe, expect, it, vi } from 'vitest';
import type { Task } from '@midnite/shared';

import { RetroBuilderService } from './retro-builder.service';
import type { RetroRepository } from './retro.repository';

function task(over: Partial<Task> = {}): Task {
  return { id: 't1', title: 'x', status: 'done', createdAt: '2026-07-07T09:00:00.000Z', ...over } as unknown as Task;
}

function build(over: Partial<RetroRepository> = {}) {
  const repo = {
    events: vi.fn().mockReturnValue([]),
    runStats: vi.fn().mockReturnValue([]),
    failures: vi.fn().mockReturnValue([]),
    checkRuns: vi.fn().mockReturnValue([]),
    getByTaskId: vi.fn().mockReturnValue(undefined),
    upsert: vi.fn(),
    ...over,
  } as unknown as RetroRepository;
  return { svc: new RetroBuilderService(repo), repo };
}

describe('RetroBuilderService', () => {
  it('buildAndStore upserts a serialized skeleton (hasNarrative 0)', () => {
    const { svc, repo } = build();
    const retro = svc.buildAndStore(task());
    expect(retro.outcome).toBe('done');
    expect(repo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: 't1', outcome: 'done', hasNarrative: 0, retro: expect.any(String) }),
    );
    // The stored blob round-trips to the same retro.
    const stored = (repo.upsert as unknown as { mock: { calls: [{ retro: string }][] } }).mock.calls[0]![0];
    expect(JSON.parse(stored.retro).taskId).toBe('t1');
  });

  it('getByTaskId parses the stored blob', () => {
    const stored = { retro: JSON.stringify({ taskId: 't1', outcome: 'done', timeline: [], attempts: [], failures: [], durations: { waitMs: null, workMs: null, totalMs: null }, narrative: null, createdAt: 'now' }) };
    const { svc } = build({ getByTaskId: vi.fn().mockReturnValue(stored) as never });
    expect(svc.getByTaskId('t1')?.outcome).toBe('done');
  });

  it('getByTaskId returns undefined when absent', () => {
    const { svc } = build({ getByTaskId: vi.fn().mockReturnValue(undefined) as never });
    expect(svc.getByTaskId('t1')).toBeUndefined();
  });

  it('getByTaskId returns undefined on a corrupt blob (fail-soft)', () => {
    const { svc } = build({ getByTaskId: vi.fn().mockReturnValue({ retro: '{not valid' }) as never });
    expect(svc.getByTaskId('t1')).toBeUndefined();
  });
});
