import { describe, expect, it } from 'vitest';
import { RateLimitedError, RateLimiter } from './rate-limiter';

/**
 * A deterministic clock: `sleep` advances virtual time instead of waiting, so a
 * spec can assert on pacing without spending it.
 */
function fakeClock() {
  let t = 0;
  return {
    now: () => t,
    sleep: async (ms: number) => {
      t += Math.max(0, ms);
      // Yield so other queued microtasks interleave the way real awaits would.
      await Promise.resolve();
    },
    advance: (ms: number) => {
      t += ms;
    },
  };
}

function limiter(overrides: Partial<ConstructorParameters<typeof RateLimiter>[0]> = {}) {
  const clock = fakeClock();
  return {
    clock,
    rl: new RateLimiter({
      minIntervalMs: 100,
      maxRetries: 3,
      backoffBaseMs: 1000,
      random: () => 1, // no jitter under test — full backoff every time
      now: clock.now,
      sleep: clock.sleep,
      ...overrides,
    }),
  };
}

describe('RateLimiter — single-flight', () => {
  it('collapses concurrent callers on the same key into one execution', async () => {
    const { rl } = limiter();
    let runs = 0;
    const task = async () => {
      runs++;
      return 'value';
    };

    const [a, b, c] = await Promise.all([rl.run('k', task), rl.run('k', task), rl.run('k', task)]);

    expect(runs).toBe(1);
    expect([a, b, c]).toEqual(['value', 'value', 'value']);
  });

  it('runs a key again once the previous execution has settled', async () => {
    const { rl } = limiter();
    let runs = 0;
    const task = async () => ++runs;

    await rl.run('k', task);
    await rl.run('k', task);

    expect(runs).toBe(2);
  });

  it('does not coalesce different keys', async () => {
    const { rl } = limiter();
    let runs = 0;
    const task = async () => ++runs;

    await Promise.all([rl.run('a', task), rl.run('b', task)]);

    expect(runs).toBe(2);
  });
});

describe('RateLimiter — spacing', () => {
  it('serialises a burst with at least minIntervalMs between starts', async () => {
    const { rl, clock } = limiter({ minIntervalMs: 100 });
    const starts: number[] = [];
    const task = async () => {
      starts.push(clock.now());
    };

    await Promise.all(['a', 'b', 'c', 'd', 'e'].map((k) => rl.run(k, task)));

    expect(starts).toHaveLength(5);
    for (let i = 1; i < starts.length; i++) {
      expect(starts[i]! - starts[i - 1]!).toBeGreaterThanOrEqual(100);
    }
  });

  it('does not delay a call that arrives after the interval has already elapsed', async () => {
    const { rl, clock } = limiter({ minIntervalMs: 100 });
    const starts: number[] = [];
    const task = async () => {
      starts.push(clock.now());
    };

    await rl.run('a', task);
    clock.advance(500); // idle longer than the interval
    await rl.run('b', task);

    expect(starts[1]! - starts[0]!).toBe(500); // no extra wait was added
  });
});

describe('RateLimiter — retry', () => {
  it('retries a rate-limited task with exponential backoff and resolves', async () => {
    const { rl, clock } = limiter({ minIntervalMs: 0, backoffBaseMs: 1000 });
    let attempts = 0;
    const task = async () => {
      attempts++;
      if (attempts < 3) throw new RateLimitedError('429 Too Many Requests');
      return 'ok';
    };

    const result = await rl.run('k', task);

    expect(result).toBe('ok');
    expect(attempts).toBe(3);
    // Backoff doubles: 1000 after the first failure, 2000 after the second.
    expect(clock.now()).toBe(3000);
  });

  it('gives up after maxRetries and rejects with the upstream error', async () => {
    const { rl } = limiter({ minIntervalMs: 0, maxRetries: 2 });
    let attempts = 0;
    const task = async () => {
      attempts++;
      throw new RateLimitedError('429 Too Many Requests');
    };

    await expect(rl.run('k', task)).rejects.toThrow('429 Too Many Requests');
    expect(attempts).toBe(3); // the original try plus two retries
  });

  it('does not retry a non-rate-limit failure', async () => {
    const { rl } = limiter({ minIntervalMs: 0 });
    let attempts = 0;
    const task = async () => {
      attempts++;
      throw new Error('symbol not found');
    };

    await expect(rl.run('k', task)).rejects.toThrow('symbol not found');
    expect(attempts).toBe(1);
  });

  it('keeps serving the queue after a task fails', async () => {
    const { rl } = limiter({ minIntervalMs: 0 });
    const failing = rl.run('bad', async () => {
      throw new Error('boom');
    });
    const following = rl.run('good', async () => 'still works');

    await expect(failing).rejects.toThrow('boom');
    await expect(following).resolves.toBe('still works');
  });
});
