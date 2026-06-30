import { afterEach, describe, expect, it, vi } from 'vitest';

import { wasReported, withSpinner } from './spinner.js';

/** Run `fn` with stdout pretending to be (or not be) a TTY. */
function withTty(tty: boolean, fn: () => Promise<void>): Promise<void> {
  const desc = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
  const prevNoColor = process.env.NO_COLOR;
  delete process.env.NO_COLOR;
  Object.defineProperty(process.stdout, 'isTTY', { value: tty, configurable: true });
  const restore = (): void => {
    if (desc) Object.defineProperty(process.stdout, 'isTTY', desc);
    else delete (process.stdout as { isTTY?: boolean }).isTTY;
    if (prevNoColor === undefined) delete process.env.NO_COLOR;
    else process.env.NO_COLOR = prevNoColor;
  };
  return fn().finally(restore);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('withSpinner — non-interactive', () => {
  it('returns the result and prints nothing when there is no succeed message', async () => {
    await withTty(false, async () => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      const result = await withSpinner('working', async () => 42);
      expect(result).toBe(42);
      expect(log).not.toHaveBeenCalled();
    });
  });

  it('prints the plain succeed message (so a piped mutation result is not lost)', async () => {
    await withTty(false, async () => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      const result = await withSpinner('moving', async () => ({ id: 'abc' }), {
        succeed: (r) => `moved ${r.id}`,
      });
      expect(result).toEqual({ id: 'abc' });
      expect(log).toHaveBeenCalledWith('moved abc');
    });
  });

  it('propagates the error and does not mark it reported (no spinner ran)', async () => {
    await withTty(false, async () => {
      const boom = new Error('kaboom');
      await expect(withSpinner('x', async () => Promise.reject(boom))).rejects.toBe(boom);
      expect(wasReported(boom)).toBe(false);
    });
  });
});

describe('withSpinner — interactive', () => {
  it('marks a thrown error as reported (spinner.fail printed it)', async () => {
    await withTty(true, async () => {
      const boom = new Error('kaboom');
      await expect(withSpinner('x', async () => Promise.reject(boom))).rejects.toBe(boom);
      expect(wasReported(boom)).toBe(true);
    });
  });
});

describe('wasReported', () => {
  it('is false for non-objects', () => {
    expect(wasReported('a string')).toBe(false);
    expect(wasReported(undefined)).toBe(false);
  });
});
