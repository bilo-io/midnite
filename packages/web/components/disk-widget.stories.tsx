import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { SystemStats } from '@midnite/shared';
import { expect, within } from 'storybook/test';

import { installMockFetch } from '@/stories/mock-fetch';

import { DiskWidget } from './disk-widget';

// The widget reads real disk capacity from `GET /system/stats` (gateway
// fs.statfs); we stub the endpoint so the radial gauge is deterministic offline.
const GB = 1024 ** 3;
const STATS: SystemStats = {
  cpu: { usagePct: 12, cores: 8, loadAvg1: 0.5 },
  memory: { totalBytes: 16 * GB, usedBytes: 8 * GB, freeBytes: 8 * GB, usagePct: 50 },
  disks: [{ path: '/', totalBytes: 500 * GB, usedBytes: 300 * GB, freeBytes: 200 * GB, usagePct: 60 }],
  platform: 'darwin',
  uptimeSec: 42_000,
  sampledAt: '2026-06-23T12:00:00.000Z',
};

const meta = {
  title: 'Widgets/DiskWidget',
  component: DiskWidget,
  decorators: [
    (Story) => (
      <div className="h-80 w-72">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DiskWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 300 GB of 500 GB used → 60%, with the mount path shown below. */
export const Default: Story = {
  beforeEach: () => installMockFetch([{ match: '/system/stats', json: STATS }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Disk')).toBeInTheDocument();
    await expect(await canvas.findByText(/60% used/)).toBeInTheDocument();
    await expect(canvas.getByText('/')).toBeInTheDocument();
    // The gauge renders as an inline SVG with a track + progress ring.
    expect(canvasElement.querySelectorAll('circle')).toHaveLength(2);
  },
};

/** Gateway unreachable → the "unavailable" message. */
export const Unavailable: Story = {
  beforeEach: () => installMockFetch([{ match: '/system/stats', status: 503 }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/unavailable/i)).toBeInTheDocument();
  },
};
