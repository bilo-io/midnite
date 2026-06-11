import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ThemeToggle } from './theme-toggle';

const meta = {
  title: 'Components/ThemeToggle',
  component: ThemeToggle,
  decorators: [
    // The menu opens to the right of the trigger; keep it inside the frame.
    (Story) => (
      <div className="flex min-h-[16rem] items-end p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Backed by the real ThemeProvider from the global decorator — picking an option
 * actually flips the `dark` class on the preview document, which is the point.
 * (The toolbar "Theme" global re-seeds it on the next remount.)
 */
export const Default: Story = {};
