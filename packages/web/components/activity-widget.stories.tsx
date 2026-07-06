import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { TaskActivityEntry } from '@midnite/shared';
import { expect, within } from 'storybook/test';

import { installMockFetch } from '@/stories/mock-fetch';

import { ActivityWidget } from './activity-widget';

// Phase 57 C: the widget reads GET /tasks/activity (recent events, newest first)
// rather than hydrating every task's event thread. The feed rows are lean.
const ACTIVITY: TaskActivityEntry[] = [
  { taskId: 't1', title: 'Wire up the scheduler tick metric', kind: 'agent.started', at: '2026-06-21T09:00:00.000Z' },
  { taskId: 't1', title: 'Wire up the scheduler tick metric', kind: 'task.created', at: '2026-06-21T08:30:00.000Z' },
  { taskId: 't2', title: 'Review the repo registry migration', kind: 'pr.merged', at: '2026-06-21T07:00:00.000Z' },
];

const meta = {
  title: 'Widgets/ActivityWidget',
  component: ActivityWidget,
  decorators: [
    (Story) => (
      <div className="h-80 w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ActivityWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Recent events rendered newest-first, kinds humanized. */
export const Default: Story = {
  beforeEach: () => installMockFetch([{ match: '/tasks/activity', json: ACTIVITY }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Kind is humanized (`agent.started` → `Agent started`).
    await expect(await canvas.findByText('Agent started')).toBeInTheDocument();
    await expect(canvas.getByText('Pr merged')).toBeInTheDocument();
    await expect(canvas.getAllByText('Wire up the scheduler tick metric').length).toBeGreaterThan(0);
  },
};

/** No recent events → the empty-state message. */
export const Empty: Story = {
  beforeEach: () => installMockFetch([{ match: '/tasks/activity', json: [] }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('No activity yet.')).toBeInTheDocument();
  },
};

/** Gateway activity endpoint fails → the error fallback. */
export const Error: Story = {
  beforeEach: () => installMockFetch([{ match: '/tasks/activity', status: 500 }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Couldn’t load activity.')).toBeInTheDocument();
  },
};
