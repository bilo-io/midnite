import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { memoryArchived, memoryGlobal, memoryProjectScoped, project } from '@/stories/fixtures';

import { MemoryCard } from './memory-card';

const meta = {
  title: 'Components/MemoryCard',
  component: MemoryCard,
  args: { onOpen: fn(), onToggleSelect: fn() },
} satisfies Meta<typeof MemoryCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Global memory (the violet "Global" scope chip) in the grid layout. */
export const Global: Story = {
  args: { memory: memoryGlobal, layout: 'grid' },
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText(memoryGlobal.title));
    await expect(args.onOpen).toHaveBeenCalledOnce();
  },
};

/** Project-scoped memory (shows the project tag) in the list layout. */
export const ProjectScoped: Story = {
  args: { memory: memoryProjectScoped, project, layout: 'list' },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
};

/** Archived memory — dimmed, with the "Archived" badge. */
export const Archived: Story = {
  args: { memory: memoryArchived, project, layout: 'grid', selected: true },
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
};
