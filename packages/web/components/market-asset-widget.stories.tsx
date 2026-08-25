import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { MarketHistoryResponse, MarketQuote } from '@midnite/shared';
import { expect, fn, within } from 'storybook/test';

import { installMockFetch } from '@/stories/mock-fetch';

import { MarketAssetWidget } from './market-asset-widget';

const CONFIG = { kind: 'crypto', symbol: 'bitcoin', name: 'Bitcoin' } as const;

const QUOTE: MarketQuote = {
  kind: 'crypto',
  symbol: 'bitcoin',
  name: 'Bitcoin',
  price: 65_000,
  open: 63_000,
  high: 66_000,
  low: 62_500,
  close: 64_800,
  change: 2_000,
  changePct: 2.5,
  currency: 'USD',
  at: '2026-06-23T12:00:00.000Z',
};

const HISTORY: MarketHistoryResponse = {
  kind: 'crypto',
  symbol: 'bitcoin',
  timeframe: '7D',
  points: Array.from({ length: 12 }, (_, i) => ({ t: 1_718_000_000_000 + i * 3_600_000, c: 60_000 + i * 500 })),
};

/** The global timeframe is persisted in localStorage, so each story pins its own
 *  rather than inheriting whichever one ran before it. */
function pinTimeframe(tf: string): void {
  try {
    localStorage.setItem('midnite.dashboard.timeframe', JSON.stringify(tf));
  } catch {
    // storage unavailable — the story still renders, at the default window
  }
}

const meta = {
  title: 'Widgets/MarketAssetWidget',
  component: MarketAssetWidget,
  args: { onConfigChange: fn() },
  decorators: [
    (Story) => (
      <div className="h-80 w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MarketAssetWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A configured asset: quote headline, % change, and OHLC from the gateway. */
export const Default: Story = {
  args: { config: CONFIG },
  beforeEach: () => {
    pinTimeframe('7D');
    return installMockFetch([
      { match: '/market/quote', json: QUOTE },
      { match: '/market/history', json: HISTORY },
    ]);
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('$65,000.00')).toBeInTheDocument();
    // The move across the charted week (60,000 → 65,500), not the quote's 24h figure.
    await expect(canvas.getByText('+9.17%')).toBeInTheDocument();
  },
};

/** Quote + history both fail → the error fallback. */
export const Error: Story = {
  args: { config: CONFIG },
  beforeEach: () => {
    pinTimeframe('7D');
    return installMockFetch([
      { match: '/market/quote', status: 500 },
      { match: '/market/history', status: 500 },
    ]);
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Couldn’t load market data.')).toBeInTheDocument();
  },
};

/**
 * The reported failure (bilo-io/midnite-app#10): the quote loads but the series
 * is rate-limited by the provider. Before the fix this drew an empty rectangle
 * with no explanation and no way to ask again.
 */
export const HistoryUnavailable: Story = {
  args: { config: CONFIG },
  beforeEach: () => {
    pinTimeframe('1M');
    return installMockFetch([
      { match: '/market/quote', json: QUOTE },
      { match: '/market/history', status: 429 },
    ]);
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('button', { name: 'Retry' })).toBeInTheDocument();
  },
};

/**
 * A long window whose move is nothing like the last 24 hours. The headline must
 * describe the charted window, not the quote's fixed 24-hour change.
 */
export const LongWindow: Story = {
  args: { config: CONFIG },
  beforeEach: () => {
    pinTimeframe('1Y');
    return installMockFetch([
      { match: '/market/quote', json: QUOTE },
      {
        match: '/market/history',
        json: {
          ...HISTORY,
          timeframe: '1Y',
          points: Array.from({ length: 24 }, (_, i) => ({
            t: 1_718_000_000_000 + i * 86_400_000,
            c: 20_000 + i * 1_950,
          })),
        } satisfies MarketHistoryResponse,
      },
    ]);
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // +224.25% across the year — not the quote's +2.50%.
    await expect(await canvas.findByText(/\+224\.\d\d%/)).toBeInTheDocument();
  },
};
