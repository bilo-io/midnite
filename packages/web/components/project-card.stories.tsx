import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { project, projectMinimal } from '@/stories/fixtures';

import { ProjectCard } from './project-card';

const meta = {
  title: 'Components/ProjectCard',
  component: ProjectCard,
  args: { onOpen: fn(), onPlan: fn() },
} satisfies Meta<typeof ProjectCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Grid: Story = {
  args: { project, layout: 'grid' },
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
};

export const List: Story = {
  args: { project, layout: 'list' },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
};

/** No description, no sources, no plan — exercises every empty-state branch. */
export const Minimal: Story = {
  args: { project: projectMinimal, layout: 'grid' },
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
};
