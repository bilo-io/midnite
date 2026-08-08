import { afterEach, describe, expect, it, vi } from 'vitest';
import { installProcessGuards, resetProcessGuardsForTest } from './process-guards';

/** Remove listeners this suite added so it can't leak into other files. */
function cleanup(): void {
  process.removeAllListeners('unhandledRejection');
  process.removeAllListeners('uncaughtException');
  resetProcessGuardsForTest();
}

afterEach(cleanup);

describe('installProcessGuards', () => {
  it('registers handlers for both failure modes', () => {
    installProcessGuards({ log: vi.fn(), onExit: vi.fn() });
    expect(process.listenerCount('unhandledRejection')).toBeGreaterThan(0);
    expect(process.listenerCount('uncaughtException')).toBeGreaterThan(0);
  });

  it('is idempotent so an embedded double-boot cannot stack listeners', () => {
    expect(installProcessGuards({ log: vi.fn(), onExit: vi.fn() })).toBe(true);
    expect(installProcessGuards({ log: vi.fn(), onExit: vi.fn() })).toBe(false);
    expect(process.listenerCount('unhandledRejection')).toBe(1);
  });

  it('logs an unhandled rejection instead of letting the process die', () => {
    // Node >=15 terminates on an unhandled rejection. The gateway surviving in a
    // logged, degraded state beats the desktop app's window pointing at a corpse.
    const log = vi.fn();
    const onExit = vi.fn();
    installProcessGuards({ log, onExit });

    process.emit('unhandledRejection', new Error('boom'), Promise.resolve());

    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0]?.[0]).toContain('unhandled promise rejection');
    expect(onExit).not.toHaveBeenCalled();
  });

  it('exits non-zero on an uncaught exception', () => {
    // Different from a rejection: the throwing stack is gone and state may be
    // mid-mutation, so exiting for a supervisor to restart is the safe move.
    const log = vi.fn();
    const onExit = vi.fn();
    installProcessGuards({ log, onExit });

    process.emit('uncaughtException', new Error('fatal'));

    expect(log.mock.calls[0]?.[0]).toContain('uncaught exception');
    expect(onExit).toHaveBeenCalledWith(1);
  });

  it('can be told not to exit, for an embedded host that owns the lifecycle', () => {
    const onExit = vi.fn();
    installProcessGuards({ log: vi.fn(), onExit, exitOnUncaught: false });

    process.emit('uncaughtException', new Error('fatal'));

    expect(onExit).not.toHaveBeenCalled();
  });

  it('passes the reason through so the log carries a stack', () => {
    const log = vi.fn();
    const err = new Error('with-stack');
    installProcessGuards({ log, onExit: vi.fn() });

    process.emit('unhandledRejection', err, Promise.resolve());

    expect(log.mock.calls[0]?.[1]).toBe(err);
  });
});
