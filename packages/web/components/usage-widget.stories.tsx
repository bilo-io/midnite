import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { UsageSummaryResponse } from '@midnite/shared';
import { expect, within } from 'storybook/test';

import { installMockFetch } from '@/stories/mock-fetch';

import { UsageWidget } from './usage-widget';

// The widget renders its bars from this mocked server payload (not the wall
// clock — the only Date use is computing the `from` query param, which the mock
// ignores), so these stories are deterministic without pinning time.
const SUMMARY: UsageSummaryResponse = {
  from: '2026-05-25T00:00:00.000Z',
  to: '2026-06-23T00:00:00.000Z',
  groupBy: 'day',
  totals: { calls: 42, inputTokens: 1_200_000, outputTokens: 240_000, estCostUsd: 12.34 },
  buckets: [],
  byProvider: [
    { key: 'anthropic', calls: 30, inputTokens: 900_000, outputTokens: 180_000, estCostUsd: 9.1 },
    { key: 'openai', calls: 12, inputTokens: 300_000, outputTokens: 60_000, estCostUsd: 3.24 },
  ],
  byFeature: [
    { key: 'plan', calls: 20, inputTokens: 700_000, outputTokens: 120_000, estCostUsd: 7.0 },
    { key: 'act', calls: 22, inputTokens: 500_000, outputTokens: 120_000, estCostUsd: 5.34 },
  ],
  byDay: [
    { key: '2026-06-21', calls: 10, inputTokens: 300_000, outputTokens: 60_000, estCostUsd: 3.1 },
    { key: '2026-06-22', calls: 14, inputTokens: 400_000, outputTokens: 80_000, estCostUsd: 4.2 },
    { key: '2026-06-23', calls: 18, inputTokens: 500_000, outputTokens: 100_000, estCostUsd: 5.04 },
  ],
  warnings: [],
  costIsEstimate: true,
};

const meta = {
  title: 'Widgets/UsageWidget',
  component: UsageWidget,
  decorators: [
    (Story) => (
      <div className="h-[28rem] w-96">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof UsageWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Spend, daily bars, and the provider/feature breakdowns from the gateway. */
export const Default: Story = {
  beforeEach: () => installMockFetch([{ match: '/usage/summary', json: SUMMARY }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('$12.34')).toBeInTheDocument();
    await expect(canvas.getByText(/42 calls/)).toBeInTheDocument();
    await expect(canvas.getByText('By provider')).toBeInTheDocument();
    await expect(canvas.getByText('By feature')).toBeInTheDocument();
  },
};

/** A breached budget surfaces the warning banner. */
export const OverBudget: Story = {
  beforeEach: () =>
    installMockFetch([
      {
        match: '/usage/summary',
        json: {
          ...SUMMARY,
          warnings: [
            {
              period: 'month',
              budgetUsd: 10,
              spentUsd: 12.34,
              ratio: 1.234,
              exceeded: true,
              message: 'Monthly LLM spend $12.34 is over the $10.00 budget.',
            },
          ],
        },
      },
    ]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/over the \$10\.00 budget/)).toBeInTheDocument();
  },
};

/** No calls recorded → the explanatory empty copy instead of breakdowns. */
export const NoCalls: Story = {
  beforeEach: () =>
    installMockFetch([
      {
        match: '/usage/summary',
        json: {
          ...SUMMARY,
          totals: { calls: 0, inputTokens: 0, outputTokens: 0, estCostUsd: 0 },
          byProvider: [],
          byFeature: [],
          byDay: [],
        },
      },
    ]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/No LLM calls recorded yet/)).toBeInTheDocument();
  },
};

/** Gateway `/usage/summary` fails → the error fallback. */
export const Error: Story = {
  beforeEach: () => installMockFetch([{ match: '/usage/summary', status: 500 }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Couldn’t load usage.')).toBeInTheDocument();
  },
};
