import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { Task } from '@midnite/shared';
import { expect, within } from 'storybook/test';

import { installMockFetch } from '@/stories/mock-fetch';

import { ActivityWidget } from './activity-widget';

// The widget flattens each task's `events` into a feed, newest first.
const TASKS: Task[] = [
  {
    id: 't1',
    title: 'Wire up the scheduler tick metric',
    status: 'wip',
    priority: 1,
    retryCount: 0,
    fixAttempts: 0,
    tags: [],
    events: [
      { at: '2026-06-21T09:00:00.000Z', kind: 'agent.started' },
      { at: '2026-06-21T08:30:00.000Z', kind: 'task.created' },
    ],
  },
  {
    id: 't2',
    title: 'Review the repo registry migration',
    status: 'done',
    priority: 2,
    retryCount: 0,
    fixAttempts: 0,
    tags: [],
    events: [{ at: '2026-06-21T07:00:00.000Z', kind: 'pr.merged' }],
  },
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

/** Task events flattened into a newest-first feed. */
export const Default: Story = {
  beforeEach: () => installMockFetch([{ match: '/tasks', json: TASKS }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Kind is humanized (`agent.started` → `Agent started`).
    await expect(await canvas.findByText('Agent started')).toBeInTheDocument();
    await expect(canvas.getByText('Pr merged')).toBeInTheDocument();
    await expect(canvas.getAllByText('Wire up the scheduler tick metric').length).toBeGreaterThan(0);
  },
};

/** Tasks exist but none have events → the empty-state message. */
export const Empty: Story = {
  beforeEach: () =>
    installMockFetch([
      {
        match: '/tasks',
        json: [
          {
            id: 't0',
            title: 'Untouched task',
            status: 'todo',
            priority: 1,
            retryCount: 0,
            fixAttempts: 0,
            tags: [],
            events: [],
          } satisfies Task,
        ],
      },
    ]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('No activity yet.')).toBeInTheDocument();
  },
};

/** Gateway tasks endpoint fails → the error fallback. */
export const Error: Story = {
  beforeEach: () => installMockFetch([{ match: '/tasks', status: 500 }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Couldn’t load activity.')).toBeInTheDocument();
  },
};
