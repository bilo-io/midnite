'use client';

import { useCallback, useEffect, useState } from 'react';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

// Merge a stored value over the defaults so fields added after a value was first
// persisted still get their default (rather than coming back `undefined`).
function reconcile<T>(initial: T, stored: unknown): T {
  if (isPlainObject(initial) && isPlainObject(stored)) {
    return { ...initial, ...stored } as T;
  }
  return stored as T;
}

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
      if (raw !== null) setValue(reconcile(initial, JSON.parse(raw)));
    } catch {
      // ignore malformed/unavailable storage
    }
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key || e.newValue === null) return;
      try {
        setValue(reconcile(initial, JSON.parse(e.newValue)));
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
