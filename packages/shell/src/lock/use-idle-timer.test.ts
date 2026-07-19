import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useIdleTimer } from './use-idle-timer';

describe('useIdleTimer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fires onIdle after the timeout with no activity', () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimer(1000, onIdle));
    expect(onIdle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('resets the countdown on user activity', () => {
    const onIdle = vi.fn();
    renderHook(() => useIdleTimer(1000, onIdle));
    vi.advanceTimersByTime(800);
    window.dispatchEvent(new Event('keydown'));
    vi.advanceTimersByTime(800);
    expect(onIdle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('does nothing when disabled or the timeout is non-positive', () => {
    const onIdle = vi.fn();
    const disabled = renderHook(() => useIdleTimer(1000, onIdle, false));
    vi.advanceTimersByTime(5000);
    expect(onIdle).not.toHaveBeenCalled();
    disabled.unmount();

    renderHook(() => useIdleTimer(0, onIdle));
    vi.advanceTimersByTime(5000);
    expect(onIdle).not.toHaveBeenCalled();
  });
});
