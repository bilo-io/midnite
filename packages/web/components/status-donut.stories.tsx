import type { Status } from '@midnite/shared';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { StatusDonut, statusCounts } from './status-donut';

function counts(entries: Array<[Status, number]>) {
  return statusCounts(new Map<Status, number>(entries));
}

const populated = counts([
  ['backlog', 3],
  ['todo', 5],
  ['wip', 2],
  ['waiting', 1],
  ['done', 8],
]);

const meta = {
  title: 'Components/StatusDonut',
  component: StatusDonut,
} satisfies Meta<typeof StatusDonut>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Populated: Story = {
  args: { counts: populated, total: 19 },
};

/** Zero tasks renders an even muted ring so the card still reads as a project. */
export const Empty: Story = {
  args: { counts: counts([]), total: 0 },
};

export const SingleStatus: Story = {
  args: { counts: counts([['done', 7]]), total: 7 },
};

export const Large: Story = {
  args: { counts: populated, total: 19, size: 160 },
};
