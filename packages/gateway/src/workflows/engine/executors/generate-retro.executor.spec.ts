import { describe, expect, it, vi } from 'vitest';
import type { TaskRetro } from '@midnite/shared';
import type { NodeRunContext } from '../node-executor';
import type { RetroAccessor, RetroForNarrative } from '../../../retro/retro-accessor';
import type { LlmService } from '../../../agent/llm/llm.service';
import { GenerateRetroExecutor } from './generate-retro.executor';

function ctx(params: Record<string, unknown>, input: unknown = {}): NodeRunContext {
  return {
    workflowId: 'w1',
    workflowCreatedBy: 'user-1',
    input,
    params,
    signal: new AbortController().signal,
    log: () => {},
  };
}

const skeleton = {
  outcome: 'done',
  durations: { waitMs: null, workMs: null, totalMs: null },
  attempts: [],
  failures: [],
  narrative: null,
  createdAt: 'now',
  taskId: 't1',
  timeline: [],
} as unknown as TaskRetro;

function make(over: {
  loaded?: RetroForNarrative | undefined;
  enabled?: boolean;
  generateStructured?: ReturnType<typeof vi.fn>;
} = {}) {
  const loadForNarrative = vi.fn(async () =>
    over.loaded === undefined && !('loaded' in over)
      ? ({ retro: skeleton, transcriptExcerpt: 'user: hi' } as RetroForNarrative)
      : over.loaded,
  );
  const storeNarrative = vi.fn();
  const retro: RetroAccessor = { loadForNarrative, storeNarrative };
  const llm = {
    enabled: over.enabled ?? true,
    getPlanModel: () => 'plan',
    generateStructured:
      over.generateStructured ??
      vi.fn().mockResolvedValue({ data: { whatHappened: 'did work', whatTrippedIt: null, notable: ['x'] }, model: 'plan' }),
  } as unknown as LlmService;
  return { exec: new GenerateRetroExecutor(retro, llm), loadForNarrative, storeNarrative, llm };
}

describe('GenerateRetroExecutor', () => {
  it('declares the type id', () => {
    expect(make().exec.typeId).toBe('midnite.generate-retro');
  });

  it('generates + stores a narrative when the LLM is available', async () => {
    const { exec, storeNarrative } = make();
    const out = (await exec.execute(ctx({ taskId: 't1' }))) as { generated: boolean; narrative: unknown };
    expect(out.generated).toBe(true);
    expect(storeNarrative).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({ whatHappened: 'did work', generatedBy: 'llm', notable: ['x'] }),
    );
  });

  it('resolves the taskId from upstream input when the param is blank', async () => {
    const { exec, loadForNarrative } = make();
    await exec.execute(ctx({}, { taskId: 't-from-input' }));
    expect(loadForNarrative).toHaveBeenCalledWith('t-from-input');
  });

  it('throws when no taskId can be resolved', async () => {
    const { exec } = make();
    await expect(exec.execute(ctx({}, {}))).rejects.toThrow(/taskId/);
  });

  it('fails soft (narrative null) when the LLM is off', async () => {
    const { exec, storeNarrative } = make({ enabled: false });
    const out = (await exec.execute(ctx({ taskId: 't1' }))) as { generated: boolean; narrative: null };
    expect(out.generated).toBe(false);
    expect(out.narrative).toBeNull();
    expect(storeNarrative).not.toHaveBeenCalled();
  });

  it('fails soft when the LLM throws', async () => {
    const { exec, storeNarrative } = make({ generateStructured: vi.fn().mockRejectedValue(new Error('boom')) });
    const out = (await exec.execute(ctx({ taskId: 't1' }))) as { generated: boolean };
    expect(out.generated).toBe(false);
    expect(storeNarrative).not.toHaveBeenCalled();
  });

  it('succeeds with narrative null when no terminal retro exists', async () => {
    const { exec } = make({ loaded: undefined });
    const out = (await exec.execute(ctx({ taskId: 't1' }))) as { generated: boolean; narrative: null };
    expect(out.generated).toBe(false);
    expect(out.narrative).toBeNull();
  });
});
