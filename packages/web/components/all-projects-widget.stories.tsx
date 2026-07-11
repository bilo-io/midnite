import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { installMockFetch } from '@/stories/mock-fetch';
import { project, projectMinimal, tasks } from '@/stories/fixtures';

import { AllProjectsWidget } from './all-projects-widget';

const meta = {
  title: 'Widgets/AllProjectsWidget',
  component: AllProjectsWidget,
  decorators: [
    (Story) => (
      <div className="h-96 w-[40rem]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AllProjectsWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Projects + tasks loaded from the gateway, newest first. */
export const Default: Story = {
  beforeEach: () =>
    installMockFetch([
      { match: '/projects', json: { items: [project, projectMinimal], total: 2 } },
      { match: '/tasks', json: tasks },
    ]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(project.name)).toBeInTheDocument();
    await expect(canvas.getByText(projectMinimal.name)).toBeInTheDocument();
  },
};

/** No projects → the empty-state message. */
export const Empty: Story = {
  beforeEach: () =>
    installMockFetch([
      { match: '/projects', json: { items: [], total: 0 } },
      { match: '/tasks', json: [] },
    ]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('No projects yet.')).toBeInTheDocument();
  },
};

/** Gateway `/projects` fails → the error fallback. */
export const Error: Story = {
  beforeEach: () =>
    installMockFetch([
      { match: '/projects', status: 500 },
      { match: '/tasks', json: [] },
    ]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Couldn’t load projects.')).toBeInTheDocument();
  },
};
