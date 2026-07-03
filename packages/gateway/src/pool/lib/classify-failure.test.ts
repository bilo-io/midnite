import { describe, expect, it } from 'vitest';
import { isRetryableFailure } from '@midnite/shared';
import { classifyFailure } from './classify-failure';

describe('classifyFailure', () => {
  it('maps a non-zero exit to a retryable crash with the code', () => {
    const f = classifyFailure({ site: 'exit', exitCode: 137 });
    expect(f.class).toBe('crash');
    expect(f.exitCode).toBe(137);
    expect(f.detail).toContain('137');
    expect(isRetryableFailure(f.class)).toBe(true);
  });

  it('maps a timeout to a retryable timeout with the window in minutes', () => {
    const f = classifyFailure({ site: 'timeout', timeoutMs: 1_800_000 });
    expect(f.class).toBe('timeout');
    expect(f.detail).toContain('30m');
    expect(f.exitCode).toBeUndefined();
    expect(isRetryableFailure(f.class)).toBe(true);
  });

  it('maps a gate failure to a non-retryable gate-failed', () => {
    const f = classifyFailure({ site: 'gate' });
    expect(f.class).toBe('gate-failed');
    expect(isRetryableFailure(f.class)).toBe(false);
  });

  it('maps a watchdog-lost session to a retryable crash', () => {
    const f = classifyFailure({ site: 'lost' });
    expect(f.class).toBe('crash');
    expect(f.detail).toContain('watchdog');
    expect(isRetryableFailure(f.class)).toBe(true);
  });

  it('maps a watchdog inactivity reclaim to a retryable inactivity with minutes', () => {
    const f = classifyFailure({ site: 'inactivity', idleMs: 600_000 });
    expect(f.class).toBe('inactivity');
    expect(f.detail).toContain('10m');
    expect(isRetryableFailure(f.class)).toBe(true);
  });
});
