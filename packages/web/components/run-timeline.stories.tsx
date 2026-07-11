import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { RunTimelineEntry, RunTimelineResponse } from '@midnite/shared';
import { expect, within } from 'storybook/test';

import { installMockFetch } from '@/stories/mock-fetch';

import { RunTimeline } from './run-timeline';

// Timestamps relative to render-time so the live-run bar extends to "now"
// sensibly instead of dwarfing the strip with a months-long span.
const NOW = Date.now();
const min = (n: number) => 60_000 * n;

function run(over: Partial<RunTimelineEntry>): RunTimelineEntry {
  return {
    id: 'r',
    taskId: 't1',
    startedAt: new Date(NOW).toISOString(),
    endedAt: null,
    durationMs: null,
    outcome: null,
    retryCount: 0,
    repo: 'web',
    ...over,
  };
}

const DATA: RunTimelineResponse = {
  taskId: 't1',
  runs: [
    run({
      id: 'r1',
      startedAt: new Date(NOW - min(30)).toISOString(),
      endedAt: new Date(NOW - min(28)).toISOString(),
      durationMs: min(2),
      outcome: 'failed',
      retryCount: 0,
    }),
    run({
      id: 'r2',
      startedAt: new Date(NOW - min(20)).toISOString(),
      endedAt: new Date(NOW - min(16)).toISOString(),
      durationMs: min(4),
      outcome: 'abandoned',
      retryCount: 1,
    }),
    run({
      id: 'r3',
      startedAt: new Date(NOW - min(10)).toISOString(),
      endedAt: new Date(NOW - min(7)).toISOString(),
      durationMs: min(3),
      outcome: 'done',
      retryCount: 2,
    }),
  ],
};

const WITH_LIVE: RunTimelineResponse = {
  taskId: 't1',
  runs: [
    run({
      id: 'r1',
      startedAt: new Date(NOW - min(12)).toISOString(),
      endedAt: new Date(NOW - min(9)).toISOString(),
      durationMs: min(3),
      outcome: 'failed',
      retryCount: 0,
    }),
    run({
      id: 'r2',
      startedAt: new Date(NOW - min(4)).toISOString(),
      endedAt: null,
      durationMs: null,
      outcome: null,
      retryCount: 1,
    }),
  ],
};

const EMPTY: RunTimelineResponse = { taskId: 't1', runs: [] };

const meta = {
  title: 'Widgets/RunTimeline',
  component: RunTimeline,
  args: { taskId: 't1' },
  decorators: [
    (Story) => (
      <div className="w-[32rem] rounded-xl border bg-card p-5">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RunTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  beforeEach: () => installMockFetch([{ match: '/metrics/runs', json: DATA }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByLabelText('Run timeline chart')).toBeInTheDocument();
    await expect(canvas.getByText('Done')).toBeInTheDocument();
    await expect(canvas.getByText('Failed')).toBeInTheDocument();
  },
};

export const Empty: Story = {
  beforeEach: () => installMockFetch([{ match: '/metrics/runs', json: EMPTY }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('No agent runs recorded yet.')).toBeInTheDocument();
  },
};

export const WithLiveRun: Story = {
  beforeEach: () => installMockFetch([{ match: '/metrics/runs', json: WITH_LIVE }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Running')).toBeInTheDocument();
    await expect(canvas.getByLabelText('Run timeline chart')).toBeInTheDocument();
  },
};
