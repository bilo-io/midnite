import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Button } from '@/components/ui/button';

import { PageHeader } from './page-header';

const meta = {
  title: 'Components/PageHeader',
  component: PageHeader,
  parameters: {
    // The header is sticky and reacts to scroll; give the story room to scroll.
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div className="min-h-[200vh]">
        <Story />
        <p className="container mt-6 text-sm text-muted-foreground">
          Scroll to see the header condense.
        </p>
      </div>
    ),
  ],
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Tasks',
    description: 'Everything on the board, grouped by status.',
  },
};

/** The dashboard variant: large title and the decorative background grid. */
export const Large: Story = {
  args: {
    title: 'midnite',
    description: 'A multitask orchestrator for Claude Code.',
    size: 'lg',
    showGrid: true,
  },
};

export const WithActions: Story = {
  args: {
    title: 'Projects',
    description: 'Plans, sources, and templates per project.',
    actions: <Button size="sm">New project</Button>,
  },
};
