import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { memoryProjectScoped, project, taskBug, taskFeature } from '@/stories/fixtures';

import { ConfirmProvider } from './confirm-dialog';
import { ProjectModal } from './project-modal';
import { ToastProvider } from './toast';

// ProjectModal calls `useConfirm()` (delete flow), `useRouter()`, and now
// `useToast()` (via ExportMenu in the edit header). ConfirmProvider + ToastProvider
// wrap the story; the router is satisfied by the global nextjs.appDirectory mock.
const meta = {
  title: 'Components/ProjectModal',
  component: ProjectModal,
  args: { onClose: fn(), onSaved: fn() },
  decorators: [
    (Story) => (
      <ToastProvider>
        <ConfirmProvider>
          <Story />
        </ConfirmProvider>
      </ToastProvider>
    ),
  ],
} satisfies Meta<typeof ProjectModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Creating a project — empty form under the Details tab. */
export const New: Story = {
  args: { project: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', { name: 'New project' });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue('');
  },
};

/** Editing a project — fields pre-filled, with tasks + a scoped memory surfaced. */
export const Edit: Story = {
  args: {
    project,
    tasks: [taskFeature, taskBug],
    memories: [memoryProjectScoped],
    onSelectTask: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', { name: 'Edit project' });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue(project.name);
  },
};

/** The tablist switches sections; selecting Sources marks that tab selected. */
export const SwitchTab: Story = {
  args: { project, tasks: [taskFeature, taskBug] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', { name: 'Edit project' });
    const sourcesTab = within(dialog).getByRole('tab', { name: /sources/i });
    await userEvent.click(sourcesTab);
    await expect(sourcesTab).toHaveAttribute('aria-selected', 'true');
  },
};
