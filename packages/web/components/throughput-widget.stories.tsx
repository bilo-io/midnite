import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { Task } from '@midnite/shared';
import { expect, within } from 'storybook/test';

import { installMockFetch } from '@/stories/mock-fetch';
import { taskDone, taskFeature } from '@/stories/fixtures';

import { ThroughputWidget } from './throughput-widget';

// The widget buckets completions over a 14-day window ending at `Date.now()`, so
// the chart depends on the wall clock. We pin `Date.now` to a fixed instant and
// place the done tasks at exact day offsets from it, making the "done this week"
// count deterministic. `completedAt()` falls back to `task.updatedAt`, so each
// done task carries one.
const NOW = Date.parse('2026-06-23T12:00:00.000Z');
const DAY = 86_400_000;
const at = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();

const done = (id: string, daysAgo: number): Task => ({ ...taskDone, id, updatedAt: at(daysAgo) });

// Three done within the last 7 days + one older (still in the 14-day window but
// not "this week") + one not-done (filtered out).
const TASKS: Task[] = [done('d0', 0), done('d1', 1), done('d2', 2), done('d9', 9), taskFeature];

// Pin Date.now for the story and restore on teardown (alongside the fetch mock).
function pinNow(handlers: Parameters<typeof installMockFetch>[0]): () => void {
  const realNow = Date.now;
  Date.now = () => NOW;
  const restoreFetch = installMockFetch(handlers);
  return () => {
    Date.now = realNow;
    restoreFetch();
  };
}

const meta = {
  title: 'Widgets/ThroughputWidget',
  component: ThroughputWidget,
  decorators: [
    (Story) => (
      <div className="h-64 w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ThroughputWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Done tasks bucketed by day; the headline counts the last 7 days. */
export const Default: Story = {
  beforeEach: () => pinNow([{ match: '/tasks', json: TASKS }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('done this week')).toBeInTheDocument();
    // d0/d1/d2 are within the last 7 days; d9 is older, taskFeature isn't done.
    await expect(canvas.getByText('3')).toBeInTheDocument();
  },
};

/** No tasks → a zero headline (the chart still renders its flat baseline). */
export const Empty: Story = {
  beforeEach: () => pinNow([{ match: '/tasks', json: [] }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('done this week')).toBeInTheDocument();
    await expect(canvas.getByText('0')).toBeInTheDocument();
  },
};

/** Gateway `/tasks` fails → the error fallback. */
export const Error: Story = {
  beforeEach: () => pinNow([{ match: '/tasks', status: 500 }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Couldn’t load tasks.')).toBeInTheDocument();
  },
};
