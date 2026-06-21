import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { FolderOpen } from 'lucide-react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { EmptyState } from './empty-state';

const meta = {
  title: 'Components/EmptyState',
  component: EmptyState,
  args: { onAction: fn() },
  decorators: [
    (Story) => (
      <div className="max-w-lg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Icon + heading + hint + the prominent pill CTA. */
export const WithAction: Story = {
  args: {
    Icon: FolderOpen,
    title: 'No projects yet',
    description: 'Group related tasks under a project to plan and track them together.',
    actionLabel: 'New project',
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'New project' }));
    await expect(args.onAction).toHaveBeenCalledOnce();
  },
};

/** No icon, no CTA — the barest form. */
export const Minimal: Story = {
  args: { title: 'Nothing here' },
};
