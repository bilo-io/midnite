import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { projectsById, tasks } from '@/stories/fixtures';

import { BoardView } from './board-view';
import { COLUMNS } from './task-columns';

const meta = {
  title: 'Components/BoardView',
  component: BoardView,
  parameters: { layout: 'fullscreen' },
  decorators: [
    // The board fills its parent's height; give it a viewport-like frame.
    (Story) => (
      <div className="flex h-[640px] flex-col p-4">
        <Story />
      </div>
    ),
  ],
  args: { onSelect: fn() },
} satisfies Meta<typeof BoardView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The full board: every status column plus the tucked-away Abandoned section. */
export const Populated: Story = {
  args: {
    tasks,
    columns: COLUMNS,
    projectsById,
    showAbandoned: true,
  },
};

export const Empty: Story = {
  args: {
    tasks: [],
    columns: COLUMNS,
    projectsById,
    showAbandoned: false,
  },
};

/** A filtered board: only the WIP and Waiting columns visible. */
export const FilteredColumns: Story = {
  args: {
    tasks,
    columns: COLUMNS.filter((c) => c.status === 'wip' || c.status === 'waiting'),
    projectsById,
    showAbandoned: false,
  },
};
