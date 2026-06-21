import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { memoryGlobal, project, projectMinimal } from '@/stories/fixtures';

import { ConfirmProvider } from './confirm-dialog';
import { MemoryModal } from './memory-modal';

// MemoryModal calls `useConfirm()` for its delete flow, so it must mount inside a
// ConfirmProvider.
const meta = {
  title: 'Components/MemoryModal',
  component: MemoryModal,
  args: { projects: [project, projectMinimal], onClose: fn(), onSaved: fn() },
  decorators: [
    (Story) => (
      <ConfirmProvider>
        <Story />
      </ConfirmProvider>
    ),
  ],
} satisfies Meta<typeof MemoryModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Creating a new memory — title blank, scope defaults to Global, primary button reads "Create". */
export const New: Story = {
  args: { memory: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', { name: 'New memory' });
    await expect(within(dialog).getByRole('button', { name: 'Create' })).toBeInTheDocument();
  },
};

/** Editing an existing memory — title pre-filled, with Save + Delete actions. */
export const Edit: Story = {
  args: { memory: memoryGlobal },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', { name: `${memoryGlobal.title} memory` });
    await expect(within(dialog).getByRole('button', { name: 'Save' })).toBeInTheDocument();
    await expect(within(dialog).getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  },
};

/** The close button invokes onClose. */
export const Closes: Story = {
  args: { memory: null },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Close' }));
    await expect(args.onClose).toHaveBeenCalledOnce();
  },
};
