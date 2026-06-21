import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { LibraryModal } from './library-modal';

// The modal is `absolute inset-0`, so it needs a positioned, sized parent to lay
// out against — the office stage in the app.
const meta = {
  title: 'Office/LibraryModal',
  component: LibraryModal,
  args: { onClose: fn() },
  decorators: [
    (Story) => (
      <div className="relative h-[600px] w-full overflow-hidden rounded-lg border border-border">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LibraryModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', { name: 'Library' });
    await expect(within(dialog).getByRole('heading', { name: 'Library' })).toBeInTheDocument();
  },
};

/** Searching narrows the shelf; a non-matching query shows the empty state. */
export const SearchFilters: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const search = canvas.getByRole('searchbox', { name: 'Search books' });

    await userEvent.type(search, 'zzzzznotabook');
    await expect(canvas.getByText('No books match your search.')).toBeInTheDocument();

    await userEvent.clear(search);
    await expect(canvas.queryByText('No books match your search.')).not.toBeInTheDocument();
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
