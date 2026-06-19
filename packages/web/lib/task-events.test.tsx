import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { TaskBoardEvent } from '@midnite/shared';
import { emitTaskEvent, useTaskEventListener } from './task-events';

const deleted = (id: string): TaskBoardEvent => ({ type: 'task.deleted', at: 'now', id });

describe('task-events pub/sub', () => {
  it('delivers events to a mounted listener and stops after unmount', () => {
    const seen: TaskBoardEvent[] = [];
    const { unmount } = renderHook(() => useTaskEventListener((e) => seen.push(e)));

    emitTaskEvent(deleted('t1'));
    expect(seen).toHaveLength(1);

    unmount();
    emitTaskEvent(deleted('t2'));
    expect(seen).toHaveLength(1); // no delivery after unmount
  });

  it('fans out to multiple listeners and isolates a throwing one', () => {
    const seen: string[] = [];
    renderHook(() => useTaskEventListener(() => {
      throw new Error('boom');
    }));
    renderHook(() => useTaskEventListener((e) => {
      if (e.type === 'task.deleted') seen.push(e.id);
    }));

    expect(() => emitTaskEvent(deleted('t3'))).not.toThrow();
    expect(seen).toContain('t3');
  });
});
