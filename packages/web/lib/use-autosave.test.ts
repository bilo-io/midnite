import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { WorkflowSchema, type Workflow } from '@midnite/shared';

import { AUTOSAVE_DELAY_MS, useAutosave } from './use-autosave';
import { createWorkflowStore } from './workflow-store';

function makeStore() {
  const workflow: Workflow = WorkflowSchema.parse({
    id: 'wf-1',
    name: 'Test',
    trigger: { type: 'manual' },
    nodes: [{ id: 'n1', type: 'http.request', position: { x: 0, y: 0 }, label: 'Fetch', params: {} }],
    edges: [],
    createdAt: '2026-06-21T00:00:00.000Z',
    updatedAt: '2026-06-21T00:00:00.000Z',
  });
  return createWorkflowStore(workflow);
}

describe('useAutosave', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('saves once a quiet interval after a dirty edit', () => {
    const store = makeStore();
    const save = vi.fn();
    renderHook(() => useAutosave(store, save, () => false));

    act(() => store.getState().setName('Renamed'));
    expect(save).not.toHaveBeenCalled(); // still within the debounce window
    act(() => vi.advanceTimersByTime(AUTOSAVE_DELAY_MS));
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('debounces rapid edits into a single save', () => {
    const store = makeStore();
    const save = vi.fn();
    renderHook(() => useAutosave(store, save, () => false));

    act(() => store.getState().setName('a'));
    act(() => vi.advanceTimersByTime(AUTOSAVE_DELAY_MS - 200));
    act(() => store.getState().setName('ab')); // resets the timer
    act(() => vi.advanceTimersByTime(AUTOSAVE_DELAY_MS - 200));
    expect(save).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(200));
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('does not save when paused (save in flight or run active)', () => {
    const store = makeStore();
    const save = vi.fn();
    renderHook(() => useAutosave(store, save, () => true));

    act(() => store.getState().setName('Renamed'));
    act(() => vi.advanceTimersByTime(AUTOSAVE_DELAY_MS));
    expect(save).not.toHaveBeenCalled();
  });

  it('ignores selection-only changes', () => {
    const store = makeStore();
    const save = vi.fn();
    renderHook(() => useAutosave(store, save, () => false));

    act(() => store.getState().select('n1'));
    act(() => vi.advanceTimersByTime(AUTOSAVE_DELAY_MS));
    expect(save).not.toHaveBeenCalled();
  });

  it('does not save again once marked saved', () => {
    const store = makeStore();
    const save = vi.fn(() => store.getState().markSaved());
    renderHook(() => useAutosave(store, save, () => false));

    act(() => store.getState().setName('Renamed'));
    act(() => vi.advanceTimersByTime(AUTOSAVE_DELAY_MS));
    expect(save).toHaveBeenCalledTimes(1);
    // No further edits → the dirty flag is clear → no second save.
    act(() => vi.advanceTimersByTime(AUTOSAVE_DELAY_MS * 2));
    expect(save).toHaveBeenCalledTimes(1);
  });
});
