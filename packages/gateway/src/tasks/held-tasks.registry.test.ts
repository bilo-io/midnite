import { describe, expect, it } from 'vitest';
import type { TaskHeldReason } from '@midnite/shared';
import { HeldTasksRegistry } from './held-tasks.registry';

describe('HeldTasksRegistry (Phase 50 B)', () => {
  it('returns undefined for an unheld task', () => {
    expect(new HeldTasksRegistry().get('t1')).toBeUndefined();
  });

  it('replace() swaps the whole held set (a dropped id is no longer held)', () => {
    const reg = new HeldTasksRegistry();
    reg.replace(new Map([['t1', 'over-budget'], ['t2', 'rate-limited']]));
    expect(reg.get('t1')).toBe('over-budget');
    expect(reg.get('t2')).toBe('rate-limited');

    reg.replace(new Map([['t2', 'over-budget']]));
    expect(reg.get('t1')).toBeUndefined(); // dropped from the new set
    expect(reg.get('t2')).toBe('over-budget'); // reason updated

    reg.replace(new Map());
    expect(reg.snapshot().size).toBe(0);
  });

  it('snapshot is a copy — mutating the source map does not leak in', () => {
    const reg = new HeldTasksRegistry();
    const source = new Map<string, TaskHeldReason>([['t1', 'over-budget']]);
    reg.replace(source);
    source.set('t2', 'rate-limited');
    expect(reg.get('t2')).toBeUndefined();
  });
});
