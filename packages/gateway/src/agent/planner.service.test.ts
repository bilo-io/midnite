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
