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

  it('defaults the spawn-rate cap off (unlimited) and accepts an override (Phase 50 B)', () => {
    expect(parseConfig({ agent: {}, terminal: {}, gateway: {} }).agent.maxSpawnsPerHour).toBe(0);
    const capped = parseConfig({ agent: { maxSpawnsPerHour: 10 }, terminal: {}, gateway: {} });
    expect(capped.agent.maxSpawnsPerHour).toBe(10);
  });

  it('defaults readiness backoff to 1s..30s and accepts overrides (Phase 54 D)', () => {
    const { readinessBackoff } = parseConfig({ agent: {}, terminal: {}, gateway: {} }).agent;
    expect(readinessBackoff).toEqual({ baseMs: 1000, maxMs: 30000 });
    const custom = parseConfig({
      agent: { readinessBackoff: { baseMs: 500, maxMs: 5000 } },
      terminal: {},
      gateway: {},
    });
    expect(custom.agent.readinessBackoff).toEqual({ baseMs: 500, maxMs: 5000 });
  });
});

describe('usage hard spend caps (Phase 50 B)', () => {
  it('are absent by default (feature off)', () => {
    const { usage } = parseConfig({ agent: {}, terminal: {}, gateway: {} });
    expect(usage.hardDailyCapUsd).toBeUndefined();
    expect(usage.hardMonthlyCapUsd).toBeUndefined();
  });

  it('accepts positive hard caps', () => {
    const { usage } = parseConfig({
      agent: {},
      terminal: {},
      gateway: {},
      usage: { hardDailyCapUsd: 25, hardMonthlyCapUsd: 500 },
    });
    expect(usage.hardDailyCapUsd).toBe(25);
    expect(usage.hardMonthlyCapUsd).toBe(500);
  });

  it('rejects a non-positive hard cap', () => {
    expect(() =>
      parseConfig({ agent: {}, terminal: {}, gateway: {}, usage: { hardDailyCapUsd: 0 } }),
    ).toThrow();
  });
});

describe('gateway.auth defaults (Phase 7 A5)', () => {
  it('is off by default — env-named token, fail-closed on non-loopback, no rate limit', () => {
    const config = parseConfig({ agent: {}, terminal: {}, gateway: {} });
    expect(config.gateway.auth.tokenEnv).toBe('MIDNITE_AUTH_TOKEN');
    expect(config.gateway.auth.requireOnNonLoopback).toBe(true);
    expect(config.gateway.auth.rateLimit.max).toBe(0);
    expect(config.gateway.auth.rateLimit.windowMs).toBe(60000);
  });

  it('honours explicit overrides', () => {
    const config = parseConfig({
      agent: {},
      terminal: {},
      gateway: {
        auth: { tokenEnv: 'MY_TOKEN', requireOnNonLoopback: false, rateLimit: { max: 120, windowMs: 1000 } },
      },
    });
    expect(config.gateway.auth.tokenEnv).toBe('MY_TOKEN');
    expect(config.gateway.auth.requireOnNonLoopback).toBe(false);
    expect(config.gateway.auth.rateLimit).toEqual({ max: 120, windowMs: 1000 });
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

describe('knowledge config defaults', () => {
  it('defaults the knowledge block off with a byte cap, no dir', () => {
    const config = parseConfig({ agent: {}, terminal: {}, knowledge: {}, gateway: {} });
    expect(config.knowledge.enabled).toBe(false);
    expect(config.knowledge.dir).toBeUndefined();
    expect(config.knowledge.maxBytes).toBeGreaterThan(0);
  });

  it('defaults knowledge even when the block is omitted entirely', () => {
    const config = parseConfig({ agent: {}, terminal: {}, gateway: {} });
    expect(config.knowledge.enabled).toBe(false);
  });

  it('accepts an explicit knowledge folder + cap', () => {
    const config = parseConfig({
      agent: {},
      terminal: {},
      knowledge: { enabled: true, dir: '~/notes', maxBytes: 4096 },
      gateway: {},
    });
    expect(config.knowledge).toEqual({ enabled: true, dir: '~/notes', maxBytes: 4096 });
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
