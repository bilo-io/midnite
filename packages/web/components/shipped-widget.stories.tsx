import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { Task } from '@midnite/shared';
import { expect, within } from 'storybook/test';

import { installMockFetch } from '@/stories/mock-fetch';

import { ShippedWidget } from './shipped-widget';

// `getTasks` returns `z.array(TaskSchema)` directly — no envelope. The widget
// keeps only `done`, non-archived tasks, newest first.
const TASKS: Task[] = [
  {
    id: 't1',
    title: 'Wire up the scheduler tick metric',
    status: 'done',
    priority: 1,
    retryCount: 0,
    tags: [],
    prUrl: 'https://github.com/midnite/midnite/pull/45',
    createdAt: '2026-06-20T08:00:00.000Z',
    updatedAt: '2026-06-21T09:00:00.000Z',
    events: [],
  },
  {
    id: 't2',
    title: 'Ship the repo registry migration',
    status: 'done',
    priority: 2,
    retryCount: 0,
    tags: [],
    createdAt: '2026-06-19T08:00:00.000Z',
    updatedAt: '2026-06-20T09:00:00.000Z',
    events: [],
  },
  // Filtered out — not done.
  {
    id: 't3',
    title: 'Draft the Phase 26 plan',
    status: 'wip',
    priority: 1,
    retryCount: 0,
    tags: [],
    events: [],
  },
];

const meta = {
  title: 'Widgets/ShippedWidget',
  component: ShippedWidget,
  decorators: [
    (Story) => (
      <div className="h-80 w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ShippedWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Completed work loaded from the gateway, newest first, with PR labels. */
export const Default: Story = {
  beforeEach: () => installMockFetch([{ match: '/tasks', json: TASKS }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(TASKS[0]!.title)).toBeInTheDocument();
    // The GitHub PR url collapses to an "owner/repo#number" label.
    await expect(canvas.getByText('midnite/midnite#45')).toBeInTheDocument();
    // A done task with no PR shows the "no PR linked" note.
    await expect(canvas.getByText('no PR linked')).toBeInTheDocument();
  },
};

/** Tasks exist but none are shipped → the empty-state message. */
export const Empty: Story = {
  beforeEach: () =>
    installMockFetch([
      {
        match: '/tasks',
        json: [
          {
            id: 't0',
            title: 'Still in progress',
            status: 'wip',
            priority: 1,
            retryCount: 0,
            tags: [],
            events: [],
          } satisfies Task,
        ],
      },
    ]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Nothing shipped yet.')).toBeInTheDocument();
  },
};

/** Gateway tasks endpoint fails → the error fallback. */
export const Error: Story = {
  beforeEach: () => installMockFetch([{ match: '/tasks', status: 500 }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Couldn’t load shipped work.')).toBeInTheDocument();
  },
};
