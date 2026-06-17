import { describe, expect, it, vi } from 'vitest';
import type { AnthropicService } from './anthropic.service';
import { PlannerService } from './planner.service';

describe('PlannerService.triage', () => {
  it('defaults to ready when AI is disabled (no API call)', async () => {
    const getClient = vi.fn();
    const planner = new PlannerService({ enabled: false, getClient } as unknown as AnthropicService);
    expect(await planner.triage('anything')).toEqual({ ready: true });
    expect(getClient).not.toHaveBeenCalled();
  });

  it('returns the model triage decision', async () => {
    const anthropic = {
      enabled: true,
      getPlanModel: () => 'claude-opus-4-8',
      getClient: () => ({
        messages: {
          create: async () => ({
            content: [{ type: 'tool_use', name: 'triage', input: { ready: false } }],
          }),
        },
      }),
    } as unknown as AnthropicService;
    const planner = new PlannerService(anthropic);
    expect(await planner.triage('vague idea')).toEqual({ ready: false });
  });

  it('falls back to ready when the model call throws', async () => {
    const anthropic = {
      enabled: true,
      getPlanModel: () => 'claude-opus-4-8',
      getClient: () => ({
        messages: {
          create: async () => {
            throw new Error('rate limited');
          },
        },
      }),
    } as unknown as AnthropicService;
    const planner = new PlannerService(anthropic);
    expect(await planner.triage('x')).toEqual({ ready: true });
  });
});
