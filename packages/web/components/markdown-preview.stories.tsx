import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { TEMPLATES } from '@/app/(main)/projects/templates';
import { markdownKitchenSink } from '@/stories/fixtures';

import { MarkdownPreview } from './markdown-preview';

const meta = {
  title: 'Components/MarkdownPreview',
  component: MarkdownPreview,
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MarkdownPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Headings, lists, task lists, tables, code, quotes — the full GFM surface. */
export const KitchenSink: Story = {
  args: { content: markdownKitchenSink },
};

/** A real document: the built-in PRD template body. */
export const PrdTemplate: Story = {
  args: { content: TEMPLATES[0]!.content },
};
