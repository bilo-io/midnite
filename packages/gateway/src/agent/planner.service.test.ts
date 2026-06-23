import { describe, expect, it, vi } from 'vitest';
import type { LlmService } from './llm/llm.service';
import { PlannerService } from './planner.service';

describe('PlannerService.triage', () => {
  it('defaults to ready when AI is disabled (no API call)', async () => {
    const generateStructured = vi.fn();
    const planner = new PlannerService({
      enabled: false,
      generateStructured,
    } as unknown as LlmService);
    expect(await planner.triage('anything')).toEqual({ ready: true });
    expect(generateStructured).not.toHaveBeenCalled();
  });

  it('returns the model triage decision', async () => {
    const llm = {
      enabled: true,
      getPlanModel: () => 'claude-opus-4-8',
      generateStructured: async () => ({ data: { ready: false }, model: 'claude-opus-4-8' }),
    } as unknown as LlmService;
    const planner = new PlannerService(llm);
    expect(await planner.triage('vague idea')).toEqual({ ready: false });
  });

  it('falls back to ready when the model call throws', async () => {
    const llm = {
      enabled: true,
      getPlanModel: () => 'claude-opus-4-8',
      generateStructured: async () => {
        throw new Error('rate limited');
      },
    } as unknown as LlmService;
    const planner = new PlannerService(llm);
    expect(await planner.triage('x')).toEqual({ ready: true });
  });
});

describe('PlannerService.answer', () => {
  it('returns null when AI is disabled (no API call)', async () => {
    const generateText = vi.fn();
    const planner = new PlannerService({ enabled: false, generateText } as unknown as LlmService);
    expect(await planner.answer('what is a closure?')).toBeNull();
    expect(generateText).not.toHaveBeenCalled();
  });

  it('returns the trimmed model answer on the plan model', async () => {
    const generateText = vi.fn(async (_req: { model: string }, _feature: string) => ({
      text: '  A closure is …  ',
      model: 'claude-opus-4-8',
    }));
    const llm = {
      enabled: true,
      getPlanModel: () => 'claude-opus-4-8',
      generateText,
    } as unknown as LlmService;
    const planner = new PlannerService(llm);
    expect(await planner.answer('what is a closure?')).toBe('A closure is …');
    expect(generateText.mock.calls[0]![0]).toMatchObject({ model: 'claude-opus-4-8' });
    expect(generateText.mock.calls[0]![1]).toBe('planner'); // usage feature tag
  });

  it('returns null for an empty answer and when the call throws', async () => {
    const empty = {
      enabled: true,
      getPlanModel: () => 'm',
      generateText: async () => ({ text: '   ', model: 'm' }),
    } as unknown as LlmService;
    expect(await new PlannerService(empty).answer('x')).toBeNull();

    const boom = {
      enabled: true,
      getPlanModel: () => 'm',
      generateText: async () => {
        throw new Error('rate limited');
      },
    } as unknown as LlmService;
    expect(await new PlannerService(boom).answer('x')).toBeNull();
  });
});

describe('PlannerService.guessRepo', () => {
  const repos = [
    { name: 'web', path: '~/repos/web' },
    { name: 'api', path: '~/repos/api' },
  ];

  it('returns null when AI is disabled (no API call)', async () => {
    const generateStructured = vi.fn();
    const planner = new PlannerService({
      enabled: false,
      generateStructured,
    } as unknown as LlmService);
    expect(await planner.guessRepo('fix the nav', repos)).toBeNull();
    expect(generateStructured).not.toHaveBeenCalled();
  });

  it('returns null for an empty registry (no API call)', async () => {
    const generateStructured = vi.fn();
    const planner = new PlannerService({
      enabled: true,
      getPlanModel: () => 'm',
      generateStructured,
    } as unknown as LlmService);
    expect(await planner.guessRepo('anything', [])).toBeNull();
    expect(generateStructured).not.toHaveBeenCalled();
  });

  it('returns the sole repo without an API call when exactly one is registered', async () => {
    const generateStructured = vi.fn();
    const planner = new PlannerService({
      enabled: true,
      getPlanModel: () => 'm',
      generateStructured,
    } as unknown as LlmService);
    expect(await planner.guessRepo('whatever', [{ name: 'only', path: '/p' }])).toBe('only');
    expect(generateStructured).not.toHaveBeenCalled();
  });

  it("returns the model's pick when it names a known repo", async () => {
    const generateStructured = vi.fn(
      async (_req: { messages: Array<{ text: string }> }, _feature: string) => ({
        data: { repo: 'api' },
        model: 'm',
      }),
    );
    const planner = new PlannerService({
      enabled: true,
      getPlanModel: () => 'm',
      generateStructured,
    } as unknown as LlmService);
    expect(await planner.guessRepo('add an endpoint', repos)).toBe('api');
    // the prompt carries the repo manifest (names + paths)
    expect(generateStructured.mock.calls[0]![0].messages[0]!.text).toContain('~/repos/api');
  });

  it('returns null when the model picks an off-list (hallucinated) name', async () => {
    const llm = {
      enabled: true,
      getPlanModel: () => 'm',
      generateStructured: async () => ({ data: { repo: 'ghost' }, model: 'm' }),
    } as unknown as LlmService;
    expect(await new PlannerService(llm).guessRepo('x', repos)).toBeNull();
  });

  it('returns null when the model returns an empty string (no clear match)', async () => {
    const llm = {
      enabled: true,
      getPlanModel: () => 'm',
      generateStructured: async () => ({ data: { repo: '' }, model: 'm' }),
    } as unknown as LlmService;
    expect(await new PlannerService(llm).guessRepo('generic task', repos)).toBeNull();
  });

  it('returns null (fail-soft) when the model call throws', async () => {
    const llm = {
      enabled: true,
      getPlanModel: () => 'm',
      generateStructured: async () => {
        throw new Error('rate limited');
      },
    } as unknown as LlmService;
    expect(await new PlannerService(llm).guessRepo('x', repos)).toBeNull();
  });
});
