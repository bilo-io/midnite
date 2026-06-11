import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { TriggerBadge } from './trigger-badge';

const meta = {
  title: 'Components/TriggerBadge',
  component: TriggerBadge,
} satisfies Meta<typeof TriggerBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Manual: Story = { args: { type: 'manual' } };
export const Schedule: Story = { args: { type: 'schedule' } };
export const Webhook: Story = { args: { type: 'webhook' } };

export const AllTriggers: Story = {
  args: { type: 'manual' },
  render: () => (
    <div className="flex items-center gap-3">
      <TriggerBadge type="manual" />
      <TriggerBadge type="schedule" />
      <TriggerBadge type="webhook" />
    </div>
  ),
};
