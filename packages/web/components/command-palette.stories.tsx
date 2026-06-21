import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import { CommandPalette } from './command-palette';

// The palette mounts invisibly and opens on ⌘K / Ctrl+K, so every story drives
// it through that shortcut in `play` rather than rendering an always-open state.
const meta = {
  title: 'Components/CommandPalette',
  component: CommandPalette,
} satisfies Meta<typeof CommandPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Ctrl+K opens the palette; the always-on destinations are listed. */
export const Opens: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.keyboard('{Control>}k{/Control}');
    const dialog = await canvas.findByRole('dialog', { name: 'Command palette' });
    await expect(within(dialog).getByText('Settings')).toBeInTheDocument();
  },
};

/** Typing filters the list; a non-matching query shows the empty state. */
export const Filters: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.keyboard('{Control>}k{/Control}');
    const dialog = await canvas.findByRole('dialog', { name: 'Command palette' });
    const input = within(dialog).getByRole('textbox', { name: 'Search commands' });

    await userEvent.type(input, 'profile');
    await expect(within(dialog).getByText('Profile')).toBeInTheDocument();
    await expect(within(dialog).queryByText('Settings')).not.toBeInTheDocument();

    await userEvent.clear(input);
    await userEvent.type(input, 'zzzzz');
    await expect(within(dialog).getByText('No matches.')).toBeInTheDocument();
  },
};
