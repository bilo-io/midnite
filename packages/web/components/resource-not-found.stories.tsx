import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { ResourceNotFound } from './resource-not-found';

const meta = {
  title: 'Components/ResourceNotFound',
  component: ResourceNotFound,
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ResourceNotFound>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The user's example: a missing council names the resource, shows 404, and
 *  offers both recovery routes. */
export const Council: Story = {
  args: { feature: 'councils', singular: 'council' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Names the resource + still shows 404.
    await expect(canvas.getByRole('heading', { name: 'Council not found' })).toBeInTheDocument();
    await expect(canvas.getByText('This council could not be found.', { exact: false })).toBeInTheDocument();
    // Both recovery links point at the right routes.
    await expect(canvas.getByRole('link', { name: /Go to Dashboard/ })).toHaveAttribute('href', '/dashboard');
    await expect(canvas.getByRole('link', { name: /View Councils/ })).toHaveAttribute('href', '/councils');
  },
};

/** A different collection — the icon, collection name, and link all follow the
 *  FEATURES registry. */
export const Task: Story = {
  args: { feature: 'tasks', singular: 'task' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Task not found' })).toBeInTheDocument();
    await expect(canvas.getByRole('link', { name: /View Tasks/ })).toHaveAttribute('href', '/tasks');
  },
};
