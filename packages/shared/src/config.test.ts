import { describe, expect, it } from 'vitest';
import { enabledSsoProviders, isOperatorEmail, parseConfig } from './config.js';

describe('retro config (Phase 62)', () => {
  it('defaults auto-skeleton ON with a 700-token narrative cap', () => {
    const { retro } = parseConfig({ agent: {}, terminal: {}, gateway: {} });
    expect(retro.autoSkeleton).toBe(true);
    expect(retro.narrativeMaxTokens).toBe(700);
  });

  it('accepts overrides', () => {
    const { retro } = parseConfig({
      agent: {},
      terminal: {},
      gateway: {},
      retro: { autoSkeleton: false, narrativeMaxTokens: 1200 },
    });
    expect(retro.autoSkeleton).toBe(false);
    expect(retro.narrativeMaxTokens).toBe(1200);
  });
});

describe('backup config (Phase 49 F)', () => {
  it('ships auto-backup OFF by default with sane knobs', () => {
    const { backup } = parseConfig({ agent: {}, terminal: {}, gateway: {} });
    expect(backup.enabled).toBe(false);
    expect(backup.intervalHours).toBe(24);
    expect(backup.retention).toBe(7);
    expect(backup.destinationDir).toContain('backups');
  });

  it('honours explicit overrides', () => {
    const { backup } = parseConfig({
      agent: {},
      terminal: {},
      gateway: {},
      backup: { enabled: true, intervalHours: 6, destinationDir: '/backups', retention: 30 },
    });
    expect(backup).toMatchObject({ enabled: true, intervalHours: 6, destinationDir: '/backups', retention: 30 });
  });

  it('rejects a non-positive retention / interval', () => {
    expect(() => parseConfig({ agent: {}, terminal: {}, gateway: {}, backup: { retention: 0 } })).toThrow();
    expect(() => parseConfig({ agent: {}, terminal: {}, gateway: {}, backup: { intervalHours: 0 } })).toThrow();
  });
});

describe('guardrails config (Phase 50 C)', () => {
  it('enables the blast-radius floor by default with sane protected lists', () => {
    const { guardrails } = parseConfig({ agent: {}, terminal: {}, gateway: {} });
    expect(guardrails.blastRadius.enabled).toBe(true);
    expect(guardrails.blastRadius.protectedBranches).toEqual(['main', 'master']);
    expect(guardrails.blastRadius.protectedPathGlobs).toContain('**/.env');
    // The spawn-env scrub is opt-in (preserves today's full-env spawn).
    expect(guardrails.scrubSpawnEnv).toBe(false);
  });

  it('honours explicit overrides', () => {
    const { guardrails } = parseConfig({
      agent: {},
      terminal: {},
      gateway: {},
      guardrails: { blastRadius: { enabled: false, protectedBranches: ['release'] }, scrubSpawnEnv: true },
    });
    expect(guardrails.blastRadius.enabled).toBe(false);
    expect(guardrails.blastRadius.protectedBranches).toEqual(['release']);
    expect(guardrails.scrubSpawnEnv).toBe(true);
  });
});

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

describe('gateway.shutdownGraceMs (Phase 54 E)', () => {
  it('defaults to 10s and accepts an override (0 = drain immediately)', () => {
    expect(parseConfig({ agent: {}, terminal: {}, gateway: {} }).gateway.shutdownGraceMs).toBe(10000);
    expect(parseConfig({ agent: {}, terminal: {}, gateway: { shutdownGraceMs: 0 } }).gateway.shutdownGraceMs).toBe(0);
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

describe('login SSO config (Phase 70 E)', () => {
  it('is absent by default — no sso block, no behaviour change', () => {
    const config = parseConfig({ agent: {}, terminal: {}, gateway: {} });
    expect(config.gateway.auth.sso).toBeUndefined();
    expect(enabledSsoProviders(config)).toEqual([]);
  });

  it('parses a google + github block, env-name-only secrets', () => {
    const config = parseConfig({
      agent: {},
      terminal: {},
      gateway: {
        auth: {
          sso: {
            google: {
              clientId: 'g-id',
              clientSecretEnv: 'MIDNITE_SSO_GOOGLE_SECRET',
              redirectUri: 'https://midnite.example.com/auth/sso/google/callback',
            },
            github: { clientId: 'gh-id', clientSecretEnv: 'MIDNITE_SSO_GITHUB_SECRET' },
            webBaseUrl: 'https://midnite.example.com',
          },
        },
      },
    });
    expect(config.gateway.auth.sso?.google?.clientSecretEnv).toBe('MIDNITE_SSO_GOOGLE_SECRET');
    // scopes default to [] (reused OAuthClientConfigSchema); redirectUri optional.
    expect(config.gateway.auth.sso?.github?.scopes).toEqual([]);
    expect(config.gateway.auth.sso?.github?.redirectUri).toBeUndefined();
    expect(config.gateway.auth.sso?.webBaseUrl).toBe('https://midnite.example.com');
  });

  it('rejects a non-URL redirectUri / webBaseUrl', () => {
    expect(() =>
      parseConfig({
        agent: {},
        terminal: {},
        gateway: {
          auth: { sso: { google: { clientId: 'x', clientSecretEnv: 'E', redirectUri: 'not-a-url' } } },
        },
      }),
    ).toThrow();
  });

  it('enabledSsoProviders lists only configured providers, stable order', () => {
    const config = parseConfig({
      agent: {},
      terminal: {},
      gateway: {
        auth: {
          sso: { github: { clientId: 'gh', clientSecretEnv: 'E' } },
        },
      },
    });
    // github-only configured → github alone; google omitted.
    expect(enabledSsoProviders(config)).toEqual(['github']);
  });
});

describe('isOperatorEmail (Phase 73 D)', () => {
  const withOperators = (operators: string[]) =>
    parseConfig({ agent: {}, terminal: {}, gateway: { auth: { operators } } });

  it('is fail-closed: empty operators list ⇒ nobody is an operator', () => {
    const config = parseConfig({ agent: {}, terminal: {}, gateway: {} });
    expect(config.gateway.auth.operators).toEqual([]);
    expect(isOperatorEmail(config, 'anyone@example.com')).toBe(false);
  });

  it('matches an allowlisted email case-insensitively', () => {
    const config = withOperators(['Ops@Example.COM']);
    expect(isOperatorEmail(config, 'ops@example.com')).toBe(true);
    expect(isOperatorEmail(config, 'OPS@EXAMPLE.COM')).toBe(true);
  });

  it('rejects a non-listed email, and a null/empty email', () => {
    const config = withOperators(['ops@example.com']);
    expect(isOperatorEmail(config, 'intruder@example.com')).toBe(false);
    expect(isOperatorEmail(config, null)).toBe(false);
    expect(isOperatorEmail(config, '')).toBe(false);
  });
});
