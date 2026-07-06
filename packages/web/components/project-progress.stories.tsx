import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { ProjectProgressBar } from './project-progress';

const meta = {
  title: 'Components/ProjectProgressBar',
  component: ProjectProgressBar,
} satisfies Meta<typeof ProjectProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Half done, with the label — from a project's server status breakdown. */
export const HalfDone: Story = {
  args: { project: { taskStatusCounts: { todo: 2, wip: 1, done: 3 }, taskCount: 6 } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bar = canvas.getByRole('progressbar');
    await expect(bar).toHaveAttribute('aria-valuenow', '50');
    await expect(canvas.getByText('3/6 · 50%')).toBeInTheDocument();
  },
};

/** Abandoned tasks count toward the total, so the % is 2/4 not 2/3. */
export const AbandonedCountsInTotal: Story = {
  args: { project: { taskStatusCounts: { done: 2, abandoned: 1, todo: 1 } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  },
};

/** Explicit done/total (page has tasks already), bar-only. */
export const BarOnly: Story = {
  args: { done: 4, total: 5, hideLabel: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '80');
    await expect(canvas.queryByText(/%/)).not.toBeInTheDocument();
  },
};

/** No tasks → the bar renders nothing at all. */
export const NoTasks: Story = {
  args: { project: { taskStatusCounts: {} } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('progressbar')).not.toBeInTheDocument();
  },
};
