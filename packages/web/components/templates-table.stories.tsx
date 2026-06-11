import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { TEMPLATES } from '@/app/(main)/projects/templates';

import { TemplatesTable } from './templates-table';

const meta = {
  title: 'Components/TemplatesTable',
  component: TemplatesTable,
  decorators: [
    (Story) => (
      <div className="max-w-3xl">
        <Story />
      </div>
    ),
  ],
  // Static args: edits fire onUpdate (see the Actions panel) but the rows don't
  // re-render with the patch — the real page owns that state.
  args: { onUpdate: fn(), onDelete: fn() },
} satisfies Meta<typeof TemplatesTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Collapsed: Story = {
  args: { templates: TEMPLATES },
};

/** `expandId` pre-opens a row — here the PRD template's accordion. */
export const Expanded: Story = {
  args: { templates: TEMPLATES, expandId: TEMPLATES[0]!.id },
};
