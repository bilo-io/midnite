import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { WorkflowSummary } from '@midnite/shared';
import { expect, within } from 'storybook/test';

import { installMockFetch } from '@/stories/mock-fetch';

import { WorkflowsWidget } from './workflows-widget';

// `listWorkflows` returns `z.array(WorkflowSummarySchema)` directly — no envelope.
const WORKFLOWS: WorkflowSummary[] = [
  {
    id: 'wf1',
    name: 'Nightly repo digest',
    enabled: true,
    triggerType: 'schedule',
    cron: '0 9 * * *',
    nodeCount: 2,
    steps: [
      { type: 'http.request', label: 'Fetch issues' },
      { type: 'ai.claude', label: 'Summarise' },
    ],
    lastRunStatus: 'succeeded',
    createdAt: '2026-06-01T09:00:00.000Z',
    updatedAt: '2026-06-21T09:00:00.000Z',
  },
  {
    id: 'wf2',
    name: 'PR triage bot',
    enabled: false,
    triggerType: 'webhook',
    nodeCount: 0,
    steps: [],
    createdAt: '2026-06-02T09:00:00.000Z',
    updatedAt: '2026-06-20T09:00:00.000Z',
  },
];

const meta = {
  title: 'Widgets/WorkflowsWidget',
  component: WorkflowsWidget,
  decorators: [
    (Story) => (
      <div className="h-80 w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WorkflowsWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Active workflows loaded from the gateway, newest first. */
export const Default: Story = {
  beforeEach: () => installMockFetch([{ match: '/workflows', json: WORKFLOWS }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(WORKFLOWS[0]!.name)).toBeInTheDocument();
    await expect(canvas.getByText(WORKFLOWS[1]!.name)).toBeInTheDocument();
    // The last-run badge renders capitalized from the run status.
    await expect(canvas.getByText('succeeded')).toBeInTheDocument();
  },
};

/** No workflows yet → the empty-state message. */
export const Empty: Story = {
  beforeEach: () => installMockFetch([{ match: '/workflows', json: [] }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('No workflows yet.')).toBeInTheDocument();
  },
};

/** Gateway workflows endpoint fails → the error fallback. */
export const Error: Story = {
  beforeEach: () => installMockFetch([{ match: '/workflows', status: 500 }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Couldn’t load workflows.')).toBeInTheDocument();
  },
};
