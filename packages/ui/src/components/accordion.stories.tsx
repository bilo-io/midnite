import type { Meta, StoryObj } from '@storybook/react-vite';

import { Accordion } from './accordion';

const meta = {
  title: 'Primitives/Accordion',
  component: Accordion,
  decorators: [
    (Story) => (
      <div className="max-w-md space-y-2">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A single section, open by default. */
export const Open: Story = {
  args: {
    title: 'General',
    defaultOpen: true,
    count: 3,
    children: <div className="p-3 text-sm text-muted-foreground">Section body content.</div>,
  },
};

/** Two stacked sections — one open, one collapsed. `args` only satisfies the
 * required-props type; the composed sections live in `render`. */
export const Stacked: Story = {
  args: { title: 'Sub agents', children: null },
  render: () => (
    <>
      <Accordion title="Sub agents" count={2} defaultOpen>
        <div className="p-3 text-sm text-muted-foreground">Two sub-agents configured.</div>
      </Accordion>
      <Accordion title="Advanced">
        <div className="p-3 text-sm text-muted-foreground">Collapsed by default.</div>
      </Accordion>
    </>
  ),
};
