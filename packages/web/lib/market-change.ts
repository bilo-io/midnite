import type { MarketHistoryResponse } from '@midnite/shared';

export type SeriesChange = {
  first: number;
  last: number;
  change: number;
  changePct: number;
};

/**
 * The move across the *plotted* window, derived from the series itself.
 *
 * A quote's `changePct` is always a 24-hour number, so showing it beside a 1Y
 * chart states one window's move under another window's label
 * (bilo-io/midnite-app#10). Both market widgets read the change from here so the
 * headline figure and the line underneath it can never disagree.
 *
 * Returns null when there is nothing to measure — no points yet, or a zero
 * opening price that would make the percentage meaningless.
 */
export function seriesChange(points: MarketHistoryResponse['points'] | undefined): SeriesChange | null {
  const first = points?.[0]?.c;
  const last = points?.at(-1)?.c;
  if (first == null || last == null || first === 0) return null;
  const change = last - first;
  return { first, last, change, changePct: (change / first) * 100 };
}
