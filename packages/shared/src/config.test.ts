import { describe, expect, it } from 'vitest';
import { parseConfig } from './config.js';

describe('agent pool config defaults', () => {
  it('ships the pool scheduler off by default with sane cadence', () => {
    const config = parseConfig({
      agent: {},
      terminal: {},
      knowledge: {},
      gateway: {},
    });
    expect(config.agent.poolEnabled).toBe(false);
    expect(config.agent.schedulerTickMs).toBe(5000);
    expect(config.agent.waitingHoldsSlot).toBe(true);
    expect(config.agent.runTimeoutMs).toBeGreaterThan(0);
    expect(config.agent.pool).toBe(4);
  });

  it('honours explicit overrides', () => {
    const config = parseConfig({
      agent: { pool: 8, poolEnabled: true, waitingHoldsSlot: false, schedulerTickMs: 2000 },
      terminal: {},
      knowledge: {},
      gateway: {},
    });
    expect(config.agent.pool).toBe(8);
    expect(config.agent.poolEnabled).toBe(true);
    expect(config.agent.waitingHoldsSlot).toBe(false);
    expect(config.agent.schedulerTickMs).toBe(2000);
  });
});

describe('agent.provider (LLM provider) normalisation', () => {
  it('defaults to anthropic', () => {
    const config = parseConfig({ agent: {}, terminal: {}, knowledge: {}, gateway: {} });
    expect(config.agent.provider).toBe('anthropic');
  });

  it('normalises the legacy "claude" value to "anthropic"', () => {
    const config = parseConfig({
      agent: { provider: 'claude' },
      terminal: {},
      knowledge: {},
      gateway: {},
    });
    expect(config.agent.provider).toBe('anthropic');
  });

  it('accepts the other providers verbatim', () => {
    for (const p of ['openai', 'google', 'openai-compatible'] as const) {
      const config = parseConfig({ agent: { provider: p }, terminal: {}, knowledge: {}, gateway: {} });
      expect(config.agent.provider).toBe(p);
    }
  });
});
