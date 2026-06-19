import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useLocalStorage } from './use-local-storage';

describe('useLocalStorage', () => {
  beforeEach(() => localStorage.clear());

  it('persists a set value and reads it back', () => {
    const { result } = renderHook(() => useLocalStorage('k', 0));
    act(() => result.current[1](5));
    expect(result.current[0]).toBe(5);
    expect(JSON.parse(localStorage.getItem('k')!)).toBe(5);
  });

  it('supports functional updates', () => {
    const { result } = renderHook(() => useLocalStorage('counter', 1));
    act(() => result.current[1]((prev) => prev + 1));
    act(() => result.current[1]((prev) => prev + 1));
    expect(result.current[0]).toBe(3);
    expect(JSON.parse(localStorage.getItem('counter')!)).toBe(3);
  });

  it('hydrates an existing stored value', () => {
    localStorage.setItem('greeting', JSON.stringify('hi'));
    const { result } = renderHook(() => useLocalStorage('greeting', 'default'));
    expect(result.current[0]).toBe('hi');
  });
});
