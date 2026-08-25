import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithIntl as render } from '@/vitest.render-intl';
import type { MarketAssetConfig } from '@/lib/dashboard-widgets';
import { withQueryClient } from '@/lib/test-query-wrapper';

// Pin the global timeframe so the widget renders deterministically, keeping the
// module's other exports (used by the in-card timeframe picker) real. `current`
// is mutable so a spec can assert how the headline reacts to the window.
const timeframe = vi.hoisted(() => ({ current: '7D' as string }));
vi.mock('@/lib/use-global-timeframe', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/use-global-timeframe')>()),
  useGlobalTimeframe: () => [timeframe.current, vi.fn()],
}));

const getMarketQuote = vi.fn();
const getMarketHistory = vi.fn();
vi.mock('@/lib/api', () => ({
  searchAssets: vi.fn(async () => []),
  getMarketQuote: (...args: unknown[]) => getMarketQuote(...args),
  getMarketHistory: (...args: unknown[]) => getMarketHistory(...args),
}));

import { MarketAssetWidget } from './market-asset-widget';

const QUOTE = {
  kind: 'crypto' as const,
  symbol: 'bitcoin',
  name: 'Bitcoin',
  price: 60000,
  open: 58800,
  high: 61000,
  low: 59000,
  close: 60000,
  change: 1200,
  changePct: 2.04,
  currency: 'USD',
  at: '2026-06-20T00:00:00.000Z',
};

/** A history response whose closes are `closes`, oldest first. */
function history(closes: number[]) {
  return {
    kind: 'crypto' as const,
    symbol: 'bitcoin',
    timeframe: timeframe.current,
    points: closes.map((c, i) => ({ t: i * 1000, c })),
  };
}

describe('MarketAssetWidget', () => {
  beforeEach(() => {
    timeframe.current = '7D';
    getMarketQuote.mockReset();
    getMarketHistory.mockReset();
  });

  it('shows the asset picker when unconfigured', () => {
    const config: MarketAssetConfig = { kind: 'crypto', symbol: '', name: '' };
    render(withQueryClient(<MarketAssetWidget config={config} onConfigChange={vi.fn()} />));

    // The kind toggle is present; data fetchers are never called without a symbol.
    expect(screen.getByRole('button', { name: 'Crypto' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stocks' })).toBeInTheDocument();
    expect(getMarketQuote).not.toHaveBeenCalled();
  });

  it('renders price, change and OHLC once a quote loads', async () => {
    getMarketQuote.mockResolvedValue(QUOTE);
    getMarketHistory.mockResolvedValue(history([50000, 55000, 60000]));
    const config: MarketAssetConfig = { kind: 'crypto', symbol: 'bitcoin', name: 'Bitcoin' };

    render(withQueryClient(<MarketAssetWidget config={config} onConfigChange={vi.fn()} />));

    // Price shows in the headline and again as the close in the OHLC readout.
    expect((await screen.findAllByText('$60,000.00')).length).toBeGreaterThan(0);
    // OHLC readout labels.
    for (const label of ['O', 'H', 'L', 'C']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(getMarketQuote).toHaveBeenCalledWith('crypto', 'bitcoin');
  });

  // bilo-io/midnite-app#10: the headline used the quote's 24-hour change under
  // every timeframe label, so a 1Y chart was captioned with a one-day move.
  it('derives the headline change from the charted window, not the 24h quote', async () => {
    timeframe.current = '1Y';
    getMarketQuote.mockResolvedValue(QUOTE); // quote says +2.04% (24h)
    getMarketHistory.mockResolvedValue(history([50000, 60000])); // the year says +20%
    const config: MarketAssetConfig = { kind: 'crypto', symbol: 'bitcoin', name: 'Bitcoin' };

    render(withQueryClient(<MarketAssetWidget config={config} onConfigChange={vi.fn()} />));

    expect(await screen.findByText('+20.00%')).toBeInTheDocument();
    expect(screen.queryByText('+2.04%')).not.toBeInTheDocument();
  });

  it('keeps the quote change on 24H, where the two windows agree', async () => {
    timeframe.current = '24H';
    getMarketQuote.mockResolvedValue(QUOTE);
    getMarketHistory.mockResolvedValue({ kind: 'crypto', symbol: 'bitcoin', timeframe: '24H', points: [] });
    const config: MarketAssetConfig = { kind: 'crypto', symbol: 'bitcoin', name: 'Bitcoin' };

    render(withQueryClient(<MarketAssetWidget config={config} onConfigChange={vi.fn()} />));

    expect(await screen.findByText('+2.04%')).toBeInTheDocument();
  });

  it('offers a retry instead of a blank chart when the series fails to load', async () => {
    timeframe.current = '1M';
    getMarketQuote.mockResolvedValue(QUOTE);
    getMarketHistory.mockRejectedValue(new Error('failed to load market history'));
    const config: MarketAssetConfig = { kind: 'crypto', symbol: 'bitcoin', name: 'Bitcoin' };

    render(withQueryClient(<MarketAssetWidget config={config} onConfigChange={vi.fn()} />));

    const retry = await screen.findByRole('button', { name: 'Retry' });
    expect(screen.getByText('Couldn’t load market data.')).toBeInTheDocument();

    // Retrying re-asks the gateway — the recovery path a rate-limited user needs.
    getMarketHistory.mockResolvedValue(history([50000, 60000]));
    fireEvent.click(retry);
    await waitFor(() => expect(screen.getByText('+20.00%')).toBeInTheDocument());
  });
});
