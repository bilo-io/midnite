import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import {
  projectTagInfo,
  taskBug,
  taskChore,
  taskFeature,
  taskQuestion,
  taskUnknown,
} from '@/stories/fixtures';

import { TaskCard } from './task-card';

const meta = {
  title: 'Components/TaskCard',
  component: TaskCard,
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
  args: { onSelect: fn() },
} satisfies Meta<typeof TaskCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A feature with a project tag and source links. */
export const Feature: Story = {
  args: { task: taskFeature, project: projectTagInfo },
};

export const Bug: Story = {
  args: { task: taskBug, project: projectTagInfo },
};

export const Question: Story = {
  args: { task: taskQuestion },
};

export const Chore: Story = {
  args: { task: taskChore, project: { tag: 'GATEWAY', color: '#0ea5e9' } },
};

/** No `kind` set — falls back to the neutral "Task" badge. */
export const UnknownKind: Story = {
  args: { task: taskUnknown },
};

/** Without `onSelect` the card renders as a static div instead of a button. */
export const NonInteractive: Story = {
  args: { task: taskFeature, project: projectTagInfo, onSelect: undefined },
};
