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
  close: 65_000,
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
  beforeEach: () =>
    installMockFetch([
      { match: '/market/quote', json: QUOTE },
      { match: '/market/history', json: HISTORY },
    ]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('$65,000.00')).toBeInTheDocument();
    await expect(canvas.getByText('+2.50%')).toBeInTheDocument();
  },
};

/** Quote + history both fail → the error fallback. */
export const Error: Story = {
  args: { config: CONFIG },
  beforeEach: () =>
    installMockFetch([
      { match: '/market/quote', status: 500 },
      { match: '/market/history', status: 500 },
    ]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Couldn’t load market data.')).toBeInTheDocument();
  },
};
