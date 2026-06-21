import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Newspaper, RefreshCw } from 'lucide-react';

import { WidgetCard } from './widget-card';

const meta = {
  title: 'Components/WidgetCard',
  component: WidgetCard,
  decorators: [
    (Story) => (
      <div className="h-48 max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WidgetCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Latest news',
    icon: Newspaper,
    children: <p className="p-4 text-sm text-muted-foreground">Three new headlines.</p>,
  },
};

/** A widget with a header action (e.g. a refresh button). */
export const WithActions: Story = {
  args: {
    title: 'Latest news',
    icon: Newspaper,
    actions: (
      <button type="button" aria-label="Refresh" className="text-muted-foreground hover:text-foreground">
        <RefreshCw className="h-3.5 w-3.5" />
      </button>
    ),
    children: <p className="p-4 text-sm text-muted-foreground">Three new headlines.</p>,
  },
};
