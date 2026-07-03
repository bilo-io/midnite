import { describe, expect, it } from 'vitest';
import { isPidAlive } from './pty-spawner';

describe('isPidAlive', () => {
  it('is true for the current process', () => {
    expect(isPidAlive(process.pid)).toBe(true);
  });

  it('is false for a pid that does not exist', () => {
    // Very high pid unlikely to be assigned; ESRCH ⇒ not alive.
    expect(isPidAlive(2 ** 30)).toBe(false);
  });
});
