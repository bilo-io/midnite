import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { GaugeHistoryResponse, GaugeSample } from '@midnite/shared';
import { expect, within } from 'storybook/test';

import { installMockFetch } from '@/stories/mock-fetch';

import { FleetTrendWidget } from './fleet-trend-widget';

function sample(minute: number, queueDepth: number): GaugeSample {
  return {
    at: `2026-07-01T10:${String(minute).padStart(2, '0')}:00.000Z`,
    queueDepth,
    slotsUsed: (queueDepth % 4) as number,
    slotsTotal: 4,
    tickLatencyMs: 3 + queueDepth,
  };
}

const DATA: GaugeHistoryResponse = {
  samples: [sample(0, 1), sample(5, 3), sample(10, 2), sample(15, 4), sample(20, 1)],
  truncated: false,
};

const EMPTY: GaugeHistoryResponse = { samples: [], truncated: false };

const meta = {
  title: 'Widgets/FleetTrendWidget',
  component: FleetTrendWidget,
  args: { config: { series: 'queueDepth' as const }, onConfigChange: () => {} },
  decorators: [
    (Story) => (
      <div className="h-80 w-96">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FleetTrendWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  beforeEach: () => installMockFetch([{ match: '/metrics/gauges/history', json: DATA }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByLabelText('Queue depth chart')).toBeInTheDocument();
  },
};

export const Empty: Story = {
  beforeEach: () => installMockFetch([{ match: '/metrics/gauges/history', json: EMPTY }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/No gauge history yet/)).toBeInTheDocument();
  },
};
