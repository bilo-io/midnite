import { describe, expect, it, vi } from 'vitest';
import type { Task, TaskRetro } from '@midnite/shared';
import type { NodeRunContext } from '../node-executor';
import type { RetroPort } from '../../../retro/retro-port';
import type { TaskReader } from '../../../tasks/task-reader';
import type { LlmService } from '../../../agent/llm/llm.service';
import { GenerateRetroExecutor } from './generate-retro.executor';

const skeleton = (taskId: string): TaskRetro => ({
  taskId,
  outcome: 'done',
  timeline: [{ at: '2026-07-11T09:00:00.000Z', kind: 'task.created' }],
  attempts: [],
  failures: [],
  durations: { waitMs: null, workMs: null, totalMs: 60000 },
  narrative: null,
  createdAt: '2026-07-11T10:00:00.000Z',
});

const fakeTask = (id: string): Task => ({ id, status: 'done', priority: 1, prompt: 'p' } as unknown as Task);

function ctx(params: Record<string, unknown>): NodeRunContext {
  return { workflowId: 'w1', workflowCreatedBy: 'u1', input: {}, params, signal: new AbortController().signal, log: () => {} };
}

function make(opts: {
  stored?: TaskRetro;
  task?: Task;
  enabled?: boolean;
  generate?: () => Promise<{ data: unknown }>;
}) {
  const storeNarrative = vi.fn((_id: string, narrative: TaskRetro['narrative']) =>
    opts.stored ? { ...opts.stored, narrative } : undefined,
  );
  const buildAndStore = vi.fn((t: Task) => skeleton(t.id));
  const retro: RetroPort = {
    get: vi.fn(() => opts.stored),
    buildAndStore,
    storeNarrative,
  };
  const tasks: TaskReader = { getTask: vi.fn(() => opts.task), listCompleted: vi.fn(() => []) };
  const generateStructured = vi.fn(opts.generate ?? (async () => ({ data: { whatHappened: 'shipped', whatTrippedIt: '', notable: ['fast'] } })));
  const llm = {
    enabled: opts.enabled ?? true,
    getActModel: () => 'sonnet4.6',
    generateStructured,
  } as unknown as LlmService;
  return { exec: new GenerateRetroExecutor(retro, tasks, llm), storeNarrative, buildAndStore, generateStructured };
}

describe('GenerateRetroExecutor', () => {
  it('generates + stores a narrative when the LLM is on', async () => {
    const { exec, storeNarrative } = make({ stored: skeleton('t1') });
    const out = (await exec.execute(ctx({ taskId: 't1' }))) as { narrativeGenerated: boolean };
    expect(out.narrativeGenerated).toBe(true);
    expect(storeNarrative).toHaveBeenCalledWith('t1', expect.objectContaining({ whatHappened: 'shipped', generatedBy: 'llm', whatTrippedIt: null }));
  });

  it('is fail-soft: skeleton only when the LLM is off', async () => {
    const { exec, generateStructured } = make({ stored: skeleton('t1'), enabled: false });
    const out = (await exec.execute(ctx({ taskId: 't1' }))) as { narrativeGenerated: boolean };
    expect(out.narrativeGenerated).toBe(false);
    expect(generateStructured).not.toHaveBeenCalled();
  });

  it('is fail-soft: skeleton only when the LLM call throws', async () => {
    const { exec, storeNarrative } = make({ stored: skeleton('t1'), generate: async () => { throw new Error('boom'); } });
    const out = (await exec.execute(ctx({ taskId: 't1' }))) as { narrativeGenerated: boolean };
    expect(out.narrativeGenerated).toBe(false);
    expect(storeNarrative).not.toHaveBeenCalled();
  });

  it('builds the skeleton first when none is stored yet', async () => {
    const { exec, buildAndStore } = make({ stored: undefined, task: fakeTask('t9') });
    // No stored skeleton, then storeNarrative returns undefined → falls back to in-memory.
    const out = (await exec.execute(ctx({ taskId: 't9' }))) as { narrativeGenerated: boolean };
    expect(buildAndStore).toHaveBeenCalled();
    expect(out.narrativeGenerated).toBe(true);
  });

  it('throws when the task is unknown and no skeleton exists', async () => {
    const { exec } = make({ stored: undefined, task: undefined });
    await expect(exec.execute(ctx({ taskId: 'ghost' }))).rejects.toThrow(/not found/);
  });
});
