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
