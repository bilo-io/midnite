import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, within } from 'storybook/test';

import { installMockFetch } from '@/stories/mock-fetch';
import { project, projectMinimal, tasks } from '@/stories/fixtures';

import { BoardroomPanel } from './boardroom-panel';

// The board room loads projects + tasks + memories in one Promise.all (useApiData),
// so all three endpoints are mocked; the panel lists the non-archived projects.
const meta = {
  title: 'Office/BoardroomPanel',
  component: BoardroomPanel,
  args: { onClose: fn() },
  decorators: [
    (Story) => (
      <div className="relative h-[34rem] w-full max-w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BoardroomPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The projects hub: a row per active project, with its task count. */
export const Default: Story = {
  beforeEach: () =>
    installMockFetch([
      { match: '/projects', json: [project, projectMinimal] },
      { match: '/tasks', json: tasks },
      { match: '/memories', json: [] },
    ]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('heading', { name: 'Board Room' })).toBeInTheDocument();
    await expect(canvas.getByText(project.name)).toBeInTheDocument();
    await expect(canvas.getByText(projectMinimal.name)).toBeInTheDocument();
  },
};

/** No projects → the empty-state message. */
export const Empty: Story = {
  beforeEach: () =>
    installMockFetch([
      { match: '/projects', json: [] },
      { match: '/tasks', json: [] },
      { match: '/memories', json: [] },
    ]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('No projects yet.')).toBeInTheDocument();
  },
};

/** A failed load (the combined fetch rejects) → the error fallback. */
export const Error: Story = {
  beforeEach: () =>
    installMockFetch([
      { match: '/projects', status: 500 },
      { match: '/tasks', json: [] },
      { match: '/memories', json: [] },
    ]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/Couldn’t load projects/)).toBeInTheDocument();
  },
};
