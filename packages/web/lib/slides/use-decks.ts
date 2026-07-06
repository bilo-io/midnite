'use client';

import { useCallback, useEffect, useState } from 'react';
import { getAllDecks, type DeckSummary } from './store';

/**
 * Read the localStorage-backed deck list. SSR-safe (empty until mounted), with a
 * manual `refresh()` to re-read after a mutation — the store is synchronous
 * localStorage, so there's no need for TanStack Query here.
 */
export function useDecks(): { decks: DeckSummary[]; hydrated: boolean; refresh: () => void } {
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(() => setDecks(getAllDecks()), []);

  useEffect(() => {
    refresh();
    setHydrated(true);
  }, [refresh]);

  return { decks, hydrated, refresh };
}
