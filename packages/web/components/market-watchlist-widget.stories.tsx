import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { MarketHistoryResponse } from '@midnite/shared';
import { expect, fn, within } from 'storybook/test';

import { installMockFetch } from '@/stories/mock-fetch';

import { MarketWatchlistWidget } from './market-watchlist-widget';

// Every row fetches /market/history; the mock matches the path (ignoring the
// query), so both rows resolve from this one canned series — fine for asserting
// the rows render with a price + change.
const HISTORY: MarketHistoryResponse = {
  kind: 'crypto',
  symbol: 'bitcoin',
  timeframe: '7D',
  points: [
    { t: 1_718_000_000_000, c: 90 },
    { t: 1_718_003_600_000, c: 100 },
  ],
};

const meta = {
  title: 'Widgets/MarketWatchlistWidget',
  component: MarketWatchlistWidget,
  args: { onConfigChange: fn() },
  decorators: [
    (Story) => (
      <div className="h-80 w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MarketWatchlistWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A few tracked assets, each with a sparkline-derived last price + change. */
export const Default: Story = {
  args: {
    config: {
      title: 'My coins',
      assets: [
        { kind: 'crypto', symbol: 'bitcoin', name: 'Bitcoin' },
        { kind: 'crypto', symbol: 'ethereum', name: 'Ethereum' },
      ],
    },
  },
  beforeEach: () => installMockFetch([{ match: '/market/history', json: HISTORY }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Bitcoin')).toBeInTheDocument();
    await expect(canvas.getByText('Ethereum')).toBeInTheDocument();
    // last close 100 → +11.11% vs the first point (90).
    expect(canvas.getAllByText('+11.11%').length).toBeGreaterThan(0);
  },
};

/** No assets configured → the empty prompt. */
export const Empty: Story = {
  args: { config: { title: 'Watchlist', assets: [] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/No assets yet/)).toBeInTheDocument();
  },
};
