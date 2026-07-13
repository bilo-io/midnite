import type { AgentPoolSnapshot, CycleTimeResponse, OpsSummary, SessionSummary, TaskCounts, TaskGraph } from '@midnite/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LlmService } from '../agent/llm/llm.service';
import type { MetricsService } from '../metrics/metrics.service';
import type { AgentPoolService } from '../pool/agent-pool.service';
import type { SessionsService } from '../sessions/sessions.service';
import type { TasksService } from '../tasks/tasks.service';
import { AssistantService } from './assistant.service';

const COUNTS: TaskCounts = { backlog: 1, todo: 3, inProgress: 2, done: 5 };

const GRAPH: TaskGraph = {
  nodes: [
    { id: 't1', title: 'Fix login', status: 'todo', priority: 2, ready: true, unmetBlockerCount: 0, foreign: false, dependsOn: [], dependedOnBy: [] },
    { id: 't2', title: 'Payments', status: 'todo', priority: 1, ready: false, unmetBlockerCount: 1, foreign: false, dependsOn: ['t1'], dependedOnBy: [] },
    { id: 'tf', title: 'Foreign', status: 'done', priority: 1, ready: false, unmetBlockerCount: 0, foreign: true, dependsOn: [], dependedOnBy: [] },
  ],
  truncated: false,
  totalCount: 3,
} as unknown as TaskGraph;

const POOL: AgentPoolSnapshot = { slots: [], capacity: 4, busy: 2, queuedTodo: 3 };

const SESSIONS: SessionSummary[] = [
  { id: 's1', projectSlug: 'p', projectDisplay: 'P', title: 'Session 1', subtitle: '', status: 'active', lastActivity: 0 },
  { id: 's2', projectSlug: 'p', projectDisplay: 'P', title: 'Archived', subtitle: '', status: 'active', lastActivity: 0, archivedAt: '2026-01-01T00:00:00Z' },
];

const OPS: OpsSummary = {
  gauges: { queueDepth: 3, slotsUsed: 2, slotsTotal: 4, lastTickLatencyMs: 5, updatedAt: '2026-07-13T00:00:00Z' },
  throughputByDay: [],
  durationBuckets: {} as OpsSummary['durationBuckets'],
  outcomeCounts: {} as OpsSummary['outcomeCounts'],
};

const CYCLE: CycleTimeResponse = {
  from: '', to: '', groupBy: 'none',
  groups: [{ key: 'all', taskCount: 5, wait: { p50Ms: 0, p90Ms: 0, count: 5 }, work: { p50Ms: 0, p90Ms: 0, count: 5 }, endToEnd: { p50Ms: 42_000, p90Ms: 0, count: 5 }, retryOverheadMsTotal: 0, tasksWithRetries: 0 }],
};

function makeTasks(): TasksService {
  return {
    getCounts: vi.fn(() => COUNTS),
    buildGraph: vi.fn(() => GRAPH),
    recentActivity: vi.fn(() => [{ taskId: 't1', title: 'Fix login', kind: 'created', at: '2026-07-13T00:00:00Z' }]),
  } as unknown as TasksService;
}

function makeDeps(llm: Partial<LlmService>) {
  return {
    tasks: makeTasks(),
    sessions: { list: vi.fn(async () => SESSIONS) } as unknown as SessionsService,
    pool: { snapshot: vi.fn(() => POOL) } as unknown as AgentPoolService,
    metrics: { getOpsSummary: vi.fn(() => OPS), getCycleTime: vi.fn(() => CYCLE) } as unknown as MetricsService,
    llm: llm as LlmService,
  };
}

function build(llm: Partial<LlmService>): AssistantService {
  const d = makeDeps(llm);
  return new AssistantService(d.tasks, d.sessions, d.pool, d.metrics, d.llm);
}

describe('AssistantService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fails soft to a deterministic overview when the LLM is disabled', async () => {
    const svc = build({ enabled: false } as Partial<LlmService>);
    const res = await svc.answer('how are we doing?');
    expect(res.inferencePath).toBe('deterministic');
    expect(res.blocks).toHaveLength(1);
    expect(res.blocks[0]).toMatchObject({ kind: 'markdown' });
    // Overview mentions the real counts + excludes the foreign node from the task total.
    const text = (res.blocks[0] as { text: string }).text;
    expect(text).toContain('2 tasks'); // t1 + t2 (foreign excluded)
    expect(text).toContain('1 ready');
    expect(text).toContain('2/4 agent slots');
    expect(text).toContain('1 active session');
  });

  it('returns coerced blocks from the provider on success', async () => {
    const generateStructured = vi.fn(async () => ({
      data: {
        blocks: [
          { kind: 'markdown', text: 'One ready task, one blocked.' },
          { kind: 'component', name: 'task-card', props: { taskId: 't1' } },
          { kind: 'component', name: 'fleet-gauge' },
        ],
      },
      model: 'm', usage: {},
    }));
    const svc = build({ enabled: true, getActModel: () => 'm', generateStructured } as unknown as Partial<LlmService>);
    const res = await svc.answer('what should I focus on?');
    expect(res.inferencePath).toBe('provider');
    expect(res.blocks).toHaveLength(3);
    expect(res.blocks[1]).toEqual({ kind: 'component', name: 'task-card', props: { taskId: 't1' } });
    expect(res.blocks[2]).toEqual({ kind: 'component', name: 'fleet-gauge', props: {} });
    // Feature-tagged 'assistant' for cost attribution.
    expect(generateStructured).toHaveBeenCalledWith(expect.anything(), 'assistant');
  });

  it('downgrades an invalid component block to markdown', async () => {
    const generateStructured = vi.fn(async () => ({
      data: { blocks: [{ kind: 'component', name: 'ghost', props: {} }] },
      model: 'm', usage: {},
    }));
    const svc = build({ enabled: true, getActModel: () => 'm', generateStructured } as unknown as Partial<LlmService>);
    const res = await svc.answer('x');
    expect(res.blocks[0]).toEqual({ kind: 'markdown', text: '_(could not render `ghost`)_' });
  });

  it('falls back to the overview when the model returns no usable blocks', async () => {
    const generateStructured = vi.fn(async () => ({ data: { blocks: [] }, model: 'm', usage: {} }));
    const svc = build({ enabled: true, getActModel: () => 'm', generateStructured } as unknown as Partial<LlmService>);
    const res = await svc.answer('x');
    expect(res.inferencePath).toBe('deterministic');
    expect(res.blocks[0]).toMatchObject({ kind: 'markdown' });
  });

  it('fails soft when the LLM call throws', async () => {
    const generateStructured = vi.fn(async () => { throw new Error('provider down'); });
    const svc = build({ enabled: true, getActModel: () => 'm', generateStructured } as unknown as Partial<LlmService>);
    const res = await svc.answer('x');
    expect(res.inferencePath).toBe('deterministic');
    expect(res.blocks[0]).toMatchObject({ kind: 'markdown' });
  });

  it('never mutates — only read methods are exercised', async () => {
    const d = makeDeps({ enabled: false } as Partial<LlmService>);
    const svc = new AssistantService(d.tasks, d.sessions, d.pool, d.metrics, d.llm);
    await svc.answer('status?');
    expect(d.tasks.getCounts).toHaveBeenCalled();
    expect(d.tasks.buildGraph).toHaveBeenCalled();
    expect(d.sessions.list).toHaveBeenCalled();
  });
});
