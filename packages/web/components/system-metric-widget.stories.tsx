import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { SystemStats } from '@midnite/shared';
import { expect, within } from 'storybook/test';

import { installMockFetch } from '@/stories/mock-fetch';

import { SystemMetricWidget } from './system-metric-widget';

// The widget polls real host telemetry from `GET /system/stats`; we stub that
// endpoint so each metric's legend + area chart render deterministically offline.
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

/** The same host with no GPU interface — the field is absent, not zero. */
const STATS_NO_GPU: SystemStats = { ...STATS, gpu: undefined };

const meta = {
  title: 'Widgets/SystemMetricWidget',
  component: SystemMetricWidget,
  decorators: [
    (Story) => (
      <div className="h-64 w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SystemMetricWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Cpu: Story = {
  args: { metric: 'cpu', widget: 'cpu-monitor' },
  beforeEach: () => installMockFetch([{ match: '/system/stats', json: STATS }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(await canvas.findAllByText(/CPU/)).not.toHaveLength(0);
    expect(canvasElement.querySelector('svg')).toBeTruthy();
  },
};

export const Ram: Story = {
  args: { metric: 'ram', widget: 'ram-monitor' },
  beforeEach: () => installMockFetch([{ match: '/system/stats', json: STATS }]),
  play: async ({ canvasElement }) => {
    expect(await within(canvasElement).findAllByText(/RAM/)).not.toHaveLength(0);
  },
};

/** A host that reports GPU load — the adapter name renders under the chart. */
export const Gpu: Story = {
  args: { metric: 'gpu', widget: 'gpu-monitor' },
  beforeEach: () => installMockFetch([{ match: '/system/stats', json: STATS }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(await canvas.findAllByText(/GPU/)).not.toHaveLength(0);
    await expect(await canvas.findByText('Apple M2 Pro')).toBeInTheDocument();
  },
};

/**
 * A host with no readable GPU. The distinction that matters: this says so
 * explicitly rather than drawing a flat line at 0%, which would claim an idle
 * GPU nobody measured.
 */
export const GpuUnavailable: Story = {
  args: { metric: 'gpu', widget: 'gpu-monitor' },
  beforeEach: () => installMockFetch([{ match: '/system/stats', json: STATS_NO_GPU }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/does not report GPU/i)).toBeInTheDocument();
    // Match the chart by its intrinsic viewBox rather than by `svg` — the card
    // header's own icon is an SVG too, so a bare `querySelector('svg')` would
    // pass whether or not the chart rendered.
    expect(canvasElement.querySelector('svg[viewBox="0 0 184 52"]')).toBeNull();
  },
};

/** Gateway unreachable → the "unavailable" message rather than a fake chart. */
export const Unavailable: Story = {
  args: { metric: 'cpu', widget: 'cpu-monitor' },
  beforeEach: () => installMockFetch([{ match: '/system/stats', status: 503 }]),
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText(/unavailable/i)).toBeInTheDocument();
  },
};
