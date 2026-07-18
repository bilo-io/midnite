import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { OctagonX, Pause, Workflow } from 'lucide-react';
import { expect, userEvent, within } from 'storybook/test';

import { HoverExpandButton } from './hover-expand-button';

/**
 * A control-bar action that shows only its icon and expands to reveal its label on
 * hover or keyboard focus. The label stays in the DOM (clipped) so the control keeps
 * an accessible name even while collapsed.
 */
const meta = {
  title: 'Components/HoverExpandButton',
  component: HoverExpandButton,
  parameters: { layout: 'centered' },
  args: {
    icon: <Workflow className="h-3.5 w-3.5" />,
    label: 'Graph',
    variant: 'outline',
  },
} satisfies Meta<typeof HoverExpandButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Graph: Story = {};

export const Pause_: Story = {
  args: { icon: <Pause className="h-3.5 w-3.5" />, label: 'Pause scheduling', variant: 'ghost' },
};

export const EmergencyStop: Story = {
  args: {
    icon: <OctagonX className="h-3.5 w-3.5" />,
    label: 'Emergency stop',
    variant: 'ghost',
    className: 'text-red-600 dark:text-red-400',
  },
};

/** Collapsed the label is zero-width; hovering reveals it (the control widens). */
export const RevealsOnHover: Story = {
  args: { icon: <Pause className="h-3.5 w-3.5" />, label: 'Pause scheduling', variant: 'ghost' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    // The control is reachable by its label as its accessible name even collapsed.
    const btn = canvas.getByRole('button', { name: 'Pause scheduling' });
    const label = canvas.getByText('Pause scheduling');
    await step('collapsed: label is clipped to zero width', async () => {
      await expect(label.getBoundingClientRect().width).toBe(0);
    });
    await step('hover: label reveals (control widens)', async () => {
      await userEvent.hover(btn);
      // Wait past the 200ms width transition.
      await new Promise((r) => setTimeout(r, 350));
      await expect(label.getBoundingClientRect().width).toBeGreaterThan(0);
    });
  },
};
