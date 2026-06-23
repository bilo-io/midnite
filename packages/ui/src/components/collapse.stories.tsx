import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './button';
import { Collapse } from './collapse';

const meta = {
  title: 'Primitives/Collapse',
  component: Collapse,
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Collapse>;

export default meta;
type Story = StoryObj<typeof meta>;

const body = (
  <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
    This body animates open/closed by transitioning a CSS grid track between 0fr and 1fr.
  </div>
);

/** Open. */
export const Open: Story = { args: { open: true, children: body } };

/** Closed (collapsed to zero height). */
export const Closed: Story = { args: { open: false, children: body } };

/** Toggle it live. `args` only satisfies the required-props type; render owns state. */
export const Interactive: Story = {
  args: { open: false, children: body },
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <div className="space-y-2">
        <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)}>
          {open ? 'Collapse' : 'Expand'}
        </Button>
        <Collapse open={open}>{body}</Collapse>
      </div>
    );
  },
};
