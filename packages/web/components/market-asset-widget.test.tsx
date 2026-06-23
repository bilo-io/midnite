import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { MarketAssetConfig } from '@/lib/dashboard-widgets';
import { withQueryClient } from '@/lib/test-query-wrapper';

// Pin the global timeframe so the widget renders deterministically, keeping the
// module's other exports (used by the in-card timeframe picker) real.
vi.mock('@/lib/use-global-timeframe', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/use-global-timeframe')>()),
  useGlobalTimeframe: () => ['7D', vi.fn()],
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

describe('MarketAssetWidget', () => {
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
    getMarketHistory.mockResolvedValue({ kind: 'crypto', symbol: 'bitcoin', timeframe: '7D', points: [] });
    const config: MarketAssetConfig = { kind: 'crypto', symbol: 'bitcoin', name: 'Bitcoin' };

    render(withQueryClient(<MarketAssetWidget config={config} onConfigChange={vi.fn()} />));

    // Price shows in the headline and again as the close in the OHLC readout.
    expect((await screen.findAllByText('$60,000.00')).length).toBeGreaterThan(0);
    expect(screen.getByText('+2.04%')).toBeInTheDocument();
    // OHLC readout labels.
    for (const label of ['O', 'H', 'L', 'C']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(getMarketQuote).toHaveBeenCalledWith('crypto', 'bitcoin');
  });
});
