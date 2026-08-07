import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { SystemStats } from '@midnite/shared';
import { expect, within } from 'storybook/test';

import { installMockFetch } from '@/stories/mock-fetch';

import { SystemMetricDialWidget } from './system-metric-dial-widget';

const GB = 1024 ** 3;
const STATS: SystemStats = {
  cpu: { usagePct: 37, cores: 8, loadAvg1: 1.24, model: 'Test CPU' },
  memory: { totalBytes: 16 * GB, usedBytes: 9 * GB, freeBytes: 7 * GB, usagePct: 56 },
  gpu: { usagePct: 74, name: 'Apple M2 Pro', memoryUsedBytes: 0.8 * GB, source: 'ioreg' },
  disks: [{ path: '/', totalBytes: 500 * GB, usedBytes: 300 * GB, freeBytes: 200 * GB, usagePct: 60 }],
  platform: 'darwin',
  hostname: 'test-host',
  uptimeSec: 123_456,
  sampledAt: '2026-06-23T12:00:00.000Z',
};

const STATS_NO_GPU: SystemStats = { ...STATS, gpu: undefined };

const meta = {
  title: 'Widgets/SystemMetricDialWidget',
  component: SystemMetricDialWidget,
  decorators: [
    (Story) => (
      <div className="h-72 w-64">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SystemMetricDialWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

/** CPU, with the core count as the supporting sublabel. */
export const Cpu: Story = {
  args: { metric: 'cpu', widget: 'cpu-dial' },
  beforeEach: () => installMockFetch([{ match: '/system/stats', json: STATS }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('37%')).toBeInTheDocument();
    await expect(await canvas.findByText('8 cores')).toBeInTheDocument();
  },
};

/** RAM, with used-of-total underneath. */
export const Ram: Story = {
  args: { metric: 'ram', widget: 'ram-dial' },
  beforeEach: () => installMockFetch([{ match: '/system/stats', json: STATS }]),
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText('56%')).toBeInTheDocument();
  },
};

/** GPU, with the adapter name underneath. */
export const Gpu: Story = {
  args: { metric: 'gpu', widget: 'gpu-dial' },
  beforeEach: () => installMockFetch([{ match: '/system/stats', json: STATS }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('74%')).toBeInTheDocument();
    await expect(await canvas.findByText('Apple M2 Pro')).toBeInTheDocument();
  },
};

/** No readable GPU → say so, rather than showing an empty ring reading 0%. */
export const GpuUnavailable: Story = {
  args: { metric: 'gpu', widget: 'gpu-dial' },
  beforeEach: () => installMockFetch([{ match: '/system/stats', json: STATS_NO_GPU }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/does not report GPU/i)).toBeInTheDocument();
    expect(canvas.queryByText('0%')).toBeNull();
  },
};
