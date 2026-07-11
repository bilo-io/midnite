import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { workflowManual, workflowTaskEvent, workflowWebhook } from '@/stories/fixtures';

import { WorkflowCard } from './workflow-card';

const meta = {
  title: 'Components/WorkflowCard',
  component: WorkflowCard,
  // The embedded enabled-switch calls the real API on toggle; with no gateway
  // running the call fails and the switch reverts — links/router are mocked.
} satisfies Meta<typeof WorkflowCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Task-event triggered, enabled, last run succeeded. */
export const TaskEvent: Story = {
  args: { workflow: workflowTaskEvent, layout: 'grid' },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
};

/** Webhook-triggered with a failed last run. */
export const FailedRun: Story = {
  args: { workflow: workflowWebhook, layout: 'grid' },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
};

/** Disabled manual workflow that has never run. */
export const NeverRun: Story = {
  args: { workflow: workflowManual, layout: 'grid' },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
};

export const ListLayout: Story = {
  args: { workflow: workflowTaskEvent, layout: 'list' },
  render: (args) => (
    <div className="flex max-w-2xl flex-col gap-2">
      <WorkflowCard {...args} />
      <WorkflowCard workflow={workflowWebhook} layout="list" />
      <WorkflowCard workflow={workflowManual} layout="list" />
    </div>
  ),
};
