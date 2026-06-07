'use client';

import { useCallback, useEffect, useState } from 'react';

// The native `storage` event only fires in *other* tabs, so we broadcast our own
// event to keep multiple hooks for the same key in sync within a single tab.
const LOCAL_SYNC_EVENT = 'midnite:local-storage';

type LocalSyncDetail = { key: string; value: unknown };

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
    // Cross-tab updates (native storage event) and same-tab updates (our own
    // broadcast) both land here so every hook for this key tracks the latest.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key || e.newValue === null) return;
      try {
        setValue(reconcile(initial, JSON.parse(e.newValue)));
      } catch {
        // ignore
      }
    };
    const onLocal = (e: Event) => {
      const detail = (e as CustomEvent<LocalSyncDetail>).detail;
      if (!detail || detail.key !== key) return;
      setValue(reconcile(initial, detail.value));
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(LOCAL_SYNC_EVENT, onLocal);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(LOCAL_SYNC_EVENT, onLocal);
    };
  }, [key]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        try {
          localStorage.setItem(key, JSON.stringify(resolved));
          window.dispatchEvent(
            new CustomEvent<LocalSyncDetail>(LOCAL_SYNC_EVENT, {
              detail: { key, value: resolved },
            }),
          );
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
