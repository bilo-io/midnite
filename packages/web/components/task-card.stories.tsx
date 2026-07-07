import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import {
  projectTagInfo,
  taskAnsweredQuestion,
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
  // With `onSelect` set the card is a button — clicking it selects the task.
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText(taskFeature.title));
    await expect(args.onSelect).toHaveBeenCalledOnce();
  },
};

export const Bug: Story = {
  args: { task: taskBug, project: projectTagInfo },
};

/** Phase 58 F — a task assigned to a milestone shows a milestone chip (name joined
 *  onto the summary server-side). */
export const WithMilestone: Story = {
  args: {
    task: { ...taskFeature, milestoneId: 'ms-1', milestoneName: 'Public launch' },
    project: projectTagInfo,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Public launch')).toBeInTheDocument();
  },
};

export const Question: Story = {
  args: { task: taskQuestion },
};

/** A question answered inline at intake — resolved to Done with an "Answered" badge. */
export const AnsweredQuestion: Story = {
  // The card reads the server-derived `answered` summary field (Phase 57 C).
  args: { task: { ...taskAnsweredQuestion, answered: true } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Answered')).toBeInTheDocument();
  },
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

/** A task assigned to a repo shows the repo chip alongside the project tag. */
export const WithRepo: Story = {
  args: { task: { ...taskFeature, repo: 'acme/api' }, project: projectTagInfo },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('acme/api')).toBeInTheDocument();
  },
};

/** Phase 50 B — a ready `todo` task the scheduler is holding because the hard
 *  daily/monthly spend cap is exceeded. New agents won't spawn until it clears. */
export const HeldOverBudget: Story = {
  args: { task: { ...taskFeature, status: 'todo', heldReason: 'over-budget' }, project: projectTagInfo },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Held: over budget')).toBeInTheDocument();
  },
};

/** Phase 50 B — held because the per-hour spawn-rate cap is full. */
export const HeldRateLimited: Story = {
  args: { task: { ...taskFeature, status: 'todo', heldReason: 'rate-limited' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Held: rate-limited')).toBeInTheDocument();
  },
};
