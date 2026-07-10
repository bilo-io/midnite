import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { project, projectMinimal } from '@/stories/fixtures';

import { MemoryModal } from './memory-modal';

// The modal is create-only (Phase 65 A): editing an existing memory happens on
// its workspace page. It no longer carries a delete flow, so no ConfirmProvider.
const meta = {
  title: 'Components/MemoryModal',
  component: MemoryModal,
  args: { projects: [project, projectMinimal], onClose: fn(), onSaved: fn() },
} satisfies Meta<typeof MemoryModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Creating a new memory — title blank, scope defaults to Global, primary button reads "Create". */
export const New: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', { name: 'New memory' });
    await expect(within(dialog).getByRole('button', { name: 'Create' })).toBeInTheDocument();
  },
};

/** The close button invokes onClose. */
export const Closes: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Close' }));
    await expect(args.onClose).toHaveBeenCalledOnce();
  },
};
