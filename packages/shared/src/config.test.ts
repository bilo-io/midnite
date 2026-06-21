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

describe('terminal.mode backend', () => {
  it('defaults to pty', () => {
    const config = parseConfig({ agent: {}, terminal: {}, knowledge: {}, gateway: {} });
    expect(config.terminal.mode).toBe('pty');
  });

  it('accepts the durable tmux backend', () => {
    const config = parseConfig({ agent: {}, terminal: { mode: 'tmux' }, knowledge: {}, gateway: {} });
    expect(config.terminal.mode).toBe('tmux');
  });

  it('rejects the dropped warp/iterm backends (Phase 17 §C1)', () => {
    expect(() =>
      parseConfig({ agent: {}, terminal: { mode: 'warp' }, knowledge: {}, gateway: {} }),
    ).toThrow();
    expect(() =>
      parseConfig({ agent: {}, terminal: { mode: 'iterm' }, knowledge: {}, gateway: {} }),
    ).toThrow();
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

describe('usage config defaults', () => {
  it('defaults the usage block so existing configs stay valid', () => {
    const config = parseConfig({ agent: {}, terminal: {}, knowledge: {}, gateway: {} });
    expect(config.usage.dailyBudgetUsd).toBeUndefined();
    expect(config.usage.monthlyBudgetUsd).toBeUndefined();
    expect(config.usage.warnAtRatio).toBe(0.8);
  });

  it('accepts explicit soft budgets', () => {
    const config = parseConfig({
      agent: {},
      terminal: {},
      knowledge: {},
      gateway: {},
      usage: { dailyBudgetUsd: 5, monthlyBudgetUsd: 100, warnAtRatio: 0.5 },
    });
    expect(config.usage.dailyBudgetUsd).toBe(5);
    expect(config.usage.monthlyBudgetUsd).toBe(100);
    expect(config.usage.warnAtRatio).toBe(0.5);
  });
});
