'use client';

import { MARKET_TIMEFRAMES, type MarketTimeframe } from '@midnite/shared';
import { useLocalStorage } from './use-local-storage';

/** Shared by every market card on the dashboard so one picker drives them all. */
const STORAGE_KEY = 'midnite.dashboard.timeframe';
const DEFAULT_TIMEFRAME: MarketTimeframe = '7D';

/** Human labels for the segmented control, in {@link MARKET_TIMEFRAMES} order. */
export const TIMEFRAME_LABELS: Record<MarketTimeframe, string> = {
  '24H': '24H',
  '7D': '7D',
  '1M': '1M',
  '3M': '3M',
  '1Y': '1Y',
};

export { MARKET_TIMEFRAMES };

/**
 * The dashboard-wide market timeframe, persisted on this device and synced across
 * tabs (via {@link useLocalStorage}). Every market widget reads it directly, so
 * the picker needs no prop drilling.
 */
export function useGlobalTimeframe(): [MarketTimeframe, (next: MarketTimeframe) => void] {
  const [timeframe, setTimeframe] = useLocalStorage<MarketTimeframe>(STORAGE_KEY, DEFAULT_TIMEFRAME);
  return [timeframe, setTimeframe];
}
