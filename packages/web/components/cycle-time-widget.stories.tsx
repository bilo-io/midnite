import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { CycleTimeGroupBy, CycleTimeResponse } from '@midnite/shared';
import { expect, within } from 'storybook/test';

import { installMockFetch } from '@/stories/mock-fetch';

import { CycleTimeWidget } from './cycle-time-widget';

const stat = (p50: number | null, p90: number | null, count: number) => ({ p50Ms: p50, p90Ms: p90, count });

const DATA: CycleTimeResponse = {
  from: '2026-06-01T00:00:00.000Z',
  to: '2026-07-01T00:00:00.000Z',
  groupBy: 'none',
  groups: [
    {
      key: 'all',
      taskCount: 12,
      wait: stat(60_000, 180_000, 12),
      work: stat(600_000, 1_800_000, 12),
      endToEnd: stat(900_000, 2_400_000, 12),
      retryOverheadMsTotal: 120_000,
      tasksWithRetries: 2,
    },
  ],
};

const EMPTY: CycleTimeResponse = {
  from: '2026-06-01T00:00:00.000Z',
  to: '2026-07-01T00:00:00.000Z',
  groupBy: 'none',
  groups: [],
};

const meta = {
  title: 'Widgets/CycleTimeWidget',
  component: CycleTimeWidget,
  args: { config: { windowDays: 30, groupBy: 'none' as CycleTimeGroupBy }, onConfigChange: () => {} },
  decorators: [
    (Story) => (
      <div className="h-96 w-96">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CycleTimeWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  beforeEach: () => installMockFetch([{ match: '/metrics/cycle-time', json: DATA }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByLabelText('Cycle-time chart')).toBeInTheDocument();
    await expect(canvas.getByText('12')).toBeInTheDocument();
  },
};

export const Empty: Story = {
  beforeEach: () => installMockFetch([{ match: '/metrics/cycle-time', json: EMPTY }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/No completed tasks in this window yet/)).toBeInTheDocument();
  },
};
