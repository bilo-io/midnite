import { describe, expect, it, vi } from 'vitest';
import type { TaskRetro, TaskSummary } from '@midnite/shared';

import { DigestBuilderService } from './digest-builder.service';
import type { DigestRepository } from './digest.repository';
import type { RetroBuilderService } from '../retro/retro-builder.service';
import type { TasksService } from '../tasks/tasks.service';
import type { UsageService } from '../usage/usage.service';
import type { MetricsService } from '../metrics/metrics.service';
import type { LlmService } from '../agent/llm/llm.service';

function summary(over: Partial<TaskSummary>): TaskSummary {
  return {
    id: 't1',
    title: 'A task',
    status: 'done',
    priority: 1,
    retryCount: 0,
    tags: [],
    ...over,
  } as TaskSummary;
}

type Deps = {
  repo: { insert: ReturnType<typeof vi.fn> };
  retros: { getByTaskId: ReturnType<typeof vi.fn> };
  tasks: { listTerminalSummaries: ReturnType<typeof vi.fn> };
  usage: { attribution: ReturnType<typeof vi.fn> };
  metrics: { getCycleTime: ReturnType<typeof vi.fn> };
  llm: { enabled: boolean; getPlanModel: ReturnType<typeof vi.fn>; generateStructured: ReturnType<typeof vi.fn> };
};

function make(over: Partial<Deps> = {}): { svc: DigestBuilderService; deps: Deps } {
  const deps: Deps = {
    repo: { insert: vi.fn((r) => r) },
    retros: { getByTaskId: vi.fn().mockReturnValue(undefined) },
    tasks: { listTerminalSummaries: vi.fn().mockReturnValue([]) },
    usage: {
      attribution: vi.fn().mockReturnValue({
        totals: { estCostUsd: 0, measuredCostUsd: 0, sessions: 0 },
        buckets: [],
      }),
    },
    metrics: {
      getCycleTime: vi.fn().mockReturnValue({ groups: [{ taskCount: 0, endToEnd: { p50Ms: null, p90Ms: null } }] }),
    },
    llm: { enabled: false, getPlanModel: vi.fn().mockReturnValue('plan'), generateStructured: vi.fn() },
    ...over,
  };
  const svc = new DigestBuilderService(
    deps.repo as unknown as DigestRepository,
    deps.retros as unknown as RetroBuilderService,
    deps.tasks as unknown as TasksService,
    deps.usage as unknown as UsageService,
    deps.metrics as unknown as MetricsService,
    deps.llm as unknown as LlmService,
  );
  return { svc, deps };
}

const WINDOW = { from: '2026-07-01T00:00:00.000Z', to: '2026-07-02T00:00:00.000Z' };

describe('DigestBuilderService', () => {
  it('aggregates counts + sections from the provided task list', async () => {
    const tasks = [
      summary({ id: 'a', status: 'done', repo: 'midnite' }),
      summary({ id: 'b', status: 'done', repo: 'midnite' }),
      summary({ id: 'c', status: 'abandoned', repo: 'other' }),
    ];
    const { svc, deps } = make();
    const res = await svc.build({ ...WINDOW, tasks });

    const stored = JSON.parse(deps.repo.insert.mock.calls[0]![0].digest);
    expect(stored.counts).toEqual({ shipped: 2, failed: 1, needsAttention: 1 });
    expect(stored.sections).toContainEqual({ name: 'midnite', shipped: 2, failed: 0 });
    expect(stored.sections).toContainEqual({ name: 'other', shipped: 0, failed: 1 });
    expect(res.markdown).toContain('shipped');
    // LLM off → deterministic headline.
    expect(res.headline).toBe(stored.headline);
    expect(deps.tasks.listTerminalSummaries).not.toHaveBeenCalled();
  });

  it('queries the window when no task list is supplied', async () => {
    const { svc, deps } = make({
      tasks: { listTerminalSummaries: vi.fn().mockReturnValue([summary({ id: 'x', status: 'done' })]) },
    });
    await svc.build({ ...WINDOW, repo: 'midnite' });
    expect(deps.tasks.listTerminalSummaries).toHaveBeenCalledWith({
      from: WINDOW.from,
      to: WINDOW.to,
      repo: 'midnite',
      projectId: undefined,
    });
  });

  it('surfaces a notable-retro highlight', async () => {
    const retro = { narrative: { notable: ['flaky test'] } } as unknown as TaskRetro;
    const { svc, deps } = make({ retros: { getByTaskId: vi.fn().mockReturnValue(retro) } });
    await svc.build({ ...WINDOW, tasks: [summary({ id: 'a', status: 'done', title: 'Ship it' })] });
    const stored = JSON.parse(deps.repo.insert.mock.calls[0]![0].digest);
    expect(stored.highlights[0]).toMatchObject({ taskId: 'a', note: 'flaky test' });
  });

  it('folds in best-effort spend + cycle when available', async () => {
    const { svc, deps } = make({
      usage: {
        attribution: vi.fn().mockReturnValue({
          totals: { estCostUsd: 12.5, measuredCostUsd: 10, sessions: 4 },
          buckets: [],
        }),
      },
      metrics: {
        getCycleTime: vi.fn().mockReturnValue({ groups: [{ taskCount: 3, endToEnd: { p50Ms: 120000, p90Ms: 300000 } }] }),
      },
    });
    await svc.build({ ...WINDOW, tasks: [summary({ id: 'a' })] });
    const stored = JSON.parse(deps.repo.insert.mock.calls[0]![0].digest);
    expect(stored.spend).toEqual({ totalUsd: 12.5, measuredUsd: 10, sessions: 4 });
    expect(stored.cycle).toEqual({ tasks: 3, p50Ms: 120000, p90Ms: 300000 });
  });

  it('degrades spend + cycle to null when their sources throw', async () => {
    const { svc, deps } = make({
      usage: { attribution: vi.fn(() => { throw new Error('usage down'); }) },
      metrics: { getCycleTime: vi.fn(() => { throw new Error('metrics down'); }) },
    });
    await svc.build({ ...WINDOW, tasks: [summary({ id: 'a' })] });
    const stored = JSON.parse(deps.repo.insert.mock.calls[0]![0].digest);
    expect(stored.spend).toBeNull();
    expect(stored.cycle).toBeNull();
  });

  it('uses the LLM headline when enabled', async () => {
    const { svc } = make({
      llm: {
        enabled: true,
        getPlanModel: vi.fn().mockReturnValue('plan'),
        generateStructured: vi.fn().mockResolvedValue({ data: { headline: 'Big week for midnite' }, model: 'plan' }),
      },
    });
    const res = await svc.build({ ...WINDOW, tasks: [summary({ id: 'a', status: 'done' })] });
    expect(res.headline).toBe('Big week for midnite');
  });

  it('fails soft to a deterministic headline when the LLM throws', async () => {
    const { svc } = make({
      llm: {
        enabled: true,
        getPlanModel: vi.fn().mockReturnValue('plan'),
        generateStructured: vi.fn().mockRejectedValue(new Error('boom')),
      },
    });
    const res = await svc.build({ ...WINDOW, tasks: [summary({ id: 'a', status: 'done' })] });
    expect(res.headline).toMatch(/shipped/);
  });
});
