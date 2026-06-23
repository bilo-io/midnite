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
