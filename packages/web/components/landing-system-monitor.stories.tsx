import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { SystemStats } from '@midnite/shared';
import { expect, waitFor, within } from 'storybook/test';

import { installMockFetch } from '@/stories/mock-fetch';

import { LandingSystemMonitor } from './landing-system-monitor';

// Same stubbed `GET /system/stats` the dashboard widget's stories use — the
// landing corner reads the identical hook, so the fixture is deliberately shared
// in shape.
const GB = 1024 ** 3;
const STATS: SystemStats = {
  cpu: { usagePct: 37, cores: 8, loadAvg1: 1.24, model: 'Test CPU' },
  memory: { totalBytes: 16 * GB, usedBytes: 9 * GB, freeBytes: 7 * GB, usagePct: 56 },
  disks: [{ path: '/', totalBytes: 500 * GB, usedBytes: 300 * GB, freeBytes: 200 * GB, usagePct: 60 }],
  platform: 'darwin',
  hostname: 'test-host',
  uptimeSec: 123_456,
  sampledAt: '2026-06-23T12:00:00.000Z',
};

const meta = {
  title: 'Landing/LandingSystemMonitor',
  component: LandingSystemMonitor,
  decorators: [
    // The component positions itself absolutely against the landing page's
    // `relative` root, so the story supplies the same containing block.
    (Story) => (
      <div className="relative h-64 w-[36rem]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LandingSystemMonitor>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The bottom-left readout as it appears on the landing page. */
export const Default: Story = {
  beforeEach: () => installMockFetch([{ match: '/system/stats', json: STATS }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(await canvas.findAllByText(/CPU/)).not.toHaveLength(0);
    expect(canvas.getAllByText(/RAM/)).not.toHaveLength(0);
    // The area chart renders as an inline SVG.
    expect(canvasElement.querySelector('svg')).toBeTruthy();
  },
};

/**
 * Gateway unreachable → the corner renders nothing at all. The landing is a calm
 * surface, so an "unavailable" placeholder would be more noise than the reading
 * is worth (the dashboard widget, which owns a card either way, does show one).
 */
export const Unavailable: Story = {
  beforeEach: () => installMockFetch([{ match: '/system/stats', status: 503 }]),
  play: async ({ canvasElement }) => {
    // `Default` above is the control: the identical harness renders a legend and
    // an SVG once the stub returns stats, so an empty canvas here is the
    // unavailable branch rather than a story that never mounted.
    await waitFor(() => expect(canvasElement.querySelector('svg')).toBeNull());
    expect(within(canvasElement).queryByText(/CPU/)).toBeNull();
  },
};
