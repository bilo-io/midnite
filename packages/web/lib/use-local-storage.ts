'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * A localStorage-backed piece of state. Reads on mount (never during SSR, to
 * avoid hydration mismatches), writes through on every change, and syncs across
 * tabs via the `storage` event. `hydrated` flips true once the stored value has
 * been read, letting callers avoid flashing the default.
 */
export function useLocalStorage<T>(
  key: string,
  initial: T,
): [T, (next: T | ((prev: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      // ignore malformed/unavailable storage
    }
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key || e.newValue === null) return;
      try {
        setValue(JSON.parse(e.newValue) as T);
      } catch {
        // ignore
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        try {
          localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // ignore write failures (private mode, quota)
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, set, hydrated];
}
