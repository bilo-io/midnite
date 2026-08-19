import type { ExecutionContext } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseConfig, type MidniteConfig } from '@midnite/shared';
import { RateLimitGuard } from './rate-limit.guard';

function config(rateLimit: Record<string, unknown>): MidniteConfig {
  return parseConfig({ agent: {}, terminal: {}, gateway: { auth: { rateLimit } } });
}

function ctx(ip: string, url = '/tasks'): ExecutionContext {
  return {
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => ({ ip, url }) }),
  } as unknown as ExecutionContext;
}

/** Returns the thrown status code, or null if the call was allowed. */
function statusOf(fn: () => boolean): number | null {
  try {
    fn();
    return null;
  } catch (err) {
    return err instanceof HttpException ? err.getStatus() : -1;
  }
}

describe('RateLimitGuard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('is disabled when max is 0 (the default)', () => {
    const guard = new RateLimitGuard(config({ max: 0 }));
    for (let i = 0; i < 100; i++) expect(guard.canActivate(ctx('1.2.3.4'))).toBe(true);
  });

  it('allows up to max then 429s the same IP within the window', () => {
    const guard = new RateLimitGuard(config({ max: 2, windowMs: 1000 }));
    expect(statusOf(() => guard.canActivate(ctx('1.2.3.4')))).toBeNull();
    expect(statusOf(() => guard.canActivate(ctx('1.2.3.4')))).toBeNull();
    expect(statusOf(() => guard.canActivate(ctx('1.2.3.4')))).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });

  it('tracks each IP independently', () => {
    const guard = new RateLimitGuard(config({ max: 1, windowMs: 1000 }));
    expect(statusOf(() => guard.canActivate(ctx('1.1.1.1')))).toBeNull();
    expect(statusOf(() => guard.canActivate(ctx('2.2.2.2')))).toBeNull();
    expect(statusOf(() => guard.canActivate(ctx('1.1.1.1')))).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });

  it('resets after the window elapses', () => {
    const guard = new RateLimitGuard(config({ max: 1, windowMs: 1000 }));
    expect(statusOf(() => guard.canActivate(ctx('1.2.3.4')))).toBeNull();
    expect(statusOf(() => guard.canActivate(ctx('1.2.3.4')))).toBe(HttpStatus.TOO_MANY_REQUESTS);
    vi.setSystemTime(1000);
    expect(statusOf(() => guard.canActivate(ctx('1.2.3.4')))).toBeNull();
  });

  it('never throttles /health', () => {
    const guard = new RateLimitGuard(config({ max: 1, windowMs: 1000 }));
    for (let i = 0; i < 10; i++) {
      expect(guard.canActivate(ctx('1.2.3.4', '/health'))).toBe(true);
    }
  });
});

describe('RateLimitGuard — credential endpoints', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('throttles repeated login attempts from one IP', () => {
    // Previously exempt: the guard reused the *auth* exemption list, so the
    // endpoint you would actually brute-force skipped the limiter entirely,
    // even with rate limiting explicitly enabled.
    const guard = new RateLimitGuard(config({ max: 3, windowMs: 60_000 }));
    const attempt = () => statusOf(() => guard.canActivate(ctx('1.2.3.4', '/auth/login')));

    expect(attempt()).toBeNull();
    expect(attempt()).toBeNull();
    expect(attempt()).toBeNull();
    expect(attempt()).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });

  it('throttles register and refresh too', () => {
    const guard = new RateLimitGuard(config({ max: 1, windowMs: 60_000 }));
    expect(statusOf(() => guard.canActivate(ctx('5.6.7.8', '/auth/register')))).toBeNull();
    expect(statusOf(() => guard.canActivate(ctx('5.6.7.8', '/auth/refresh')))).toBe(
      HttpStatus.TOO_MANY_REQUESTS,
    );
  });

  it('still never throttles health probes or hook callbacks', () => {
    // Monitors poll /health constantly, and a throttled lifecycle hook would
    // corrupt task state rather than merely slow a client down.
    const guard = new RateLimitGuard(config({ max: 1, windowMs: 60_000 }));
    for (let i = 0; i < 20; i++) {
      expect(statusOf(() => guard.canActivate(ctx('9.9.9.9', '/health')))).toBeNull();
      expect(statusOf(() => guard.canActivate(ctx('9.9.9.9', '/hooks/sessions/a/stop')))).toBeNull();
    }
  });

  it('stays disabled when max is 0 — the local-install default', () => {
    const guard = new RateLimitGuard(config({ max: 0, windowMs: 60_000 }));
    for (let i = 0; i < 50; i++) {
      expect(statusOf(() => guard.canActivate(ctx('1.1.1.1', '/auth/login')))).toBeNull();
    }
  });
});
