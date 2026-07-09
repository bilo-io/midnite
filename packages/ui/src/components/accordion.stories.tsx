import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

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

/**
 * a11y (Phase 60 I): the trigger exposes `aria-expanded` and `aria-controls`
 * pointing at a labelled `region`, and toggling flips the state for assistive tech.
 */
export const DisclosureSemantics: Story = {
  args: {
    title: 'General',
    children: <div className="p-3 text-sm text-muted-foreground">Section body content.</div>,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: /General/i });
    // Collapsed by default: expanded=false + controls a region by id.
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    const controls = trigger.getAttribute('aria-controls');
    await expect(controls).toBeTruthy();
    const region = canvasElement.querySelector(`#${controls}`);
    await expect(region).toHaveAttribute('role', 'region');

    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
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
