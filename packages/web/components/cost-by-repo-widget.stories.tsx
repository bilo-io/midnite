import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { UsageAttributionResponse } from '@midnite/shared';
import { expect, within } from 'storybook/test';

import { installMockFetch } from '@/stories/mock-fetch';

import { CostByRepoWidget } from './cost-by-repo-widget';

function bucket(key: string, measured: number, estimated: number): UsageAttributionResponse['buckets'][number] {
  return {
    key,
    label: key,
    sessions: 3,
    inputTokens: 1_000,
    outputTokens: 500,
    cachedTokens: 100,
    estCostUsd: measured + estimated,
    measuredCostUsd: measured,
    estimatedCostUsd: estimated,
    unpricedSessions: 0,
  };
}

const DATA: UsageAttributionResponse = {
  from: '2026-06-01T00:00:00.000Z',
  to: '2026-07-01T00:00:00.000Z',
  groupBy: 'repo',
  totals: {
    sessions: 9,
    inputTokens: 3_000,
    outputTokens: 1_500,
    cachedTokens: 300,
    estCostUsd: 5,
    measuredCostUsd: 4,
    estimatedCostUsd: 1,
    unpricedSessions: 0,
  },
  buckets: [bucket('web', 2, 0.5), bucket('gateway', 1.5, 0), bucket('shared', 0.75, 0.25)],
};

const EMPTY: UsageAttributionResponse = {
  from: '2026-06-01T00:00:00.000Z',
  to: '2026-07-01T00:00:00.000Z',
  groupBy: 'repo',
  totals: {
    sessions: 0,
    inputTokens: 0,
    outputTokens: 0,
    cachedTokens: 0,
    estCostUsd: 0,
    measuredCostUsd: 0,
    estimatedCostUsd: 0,
    unpricedSessions: 0,
  },
  buckets: [],
};

const meta = {
  title: 'Widgets/CostByRepoWidget',
  component: CostByRepoWidget,
  args: { config: { windowDays: 30 }, onConfigChange: () => {} },
  decorators: [
    (Story) => (
      <div className="h-96 w-96">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CostByRepoWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  beforeEach: () => installMockFetch([{ match: '/usage/attribution', json: DATA }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('$5.00')).toBeInTheDocument();
    await expect(canvas.getByLabelText('Cost by repo chart')).toBeInTheDocument();
  },
};

export const Empty: Story = {
  beforeEach: () => installMockFetch([{ match: '/usage/attribution', json: EMPTY }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/No session cost recorded yet/)).toBeInTheDocument();
  },
};
