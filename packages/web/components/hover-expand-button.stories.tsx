import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { OctagonX, Pause, Workflow } from 'lucide-react';
import { expect, within } from 'storybook/test';

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

/**
 * Collapsed by default: the control is icon-only, its label present in the DOM
 * (so it keeps an accessible name) but clipped to zero width. The label reveals on
 * hover / keyboard focus via CSS — a pointer-driven behavior best verified visually
 * (see the Playwright screenshots in the PR), not through synthetic events, which
 * don't engage `:hover`.
 */
export const CollapsedByDefault: Story = {
  args: { icon: <Pause className="h-3.5 w-3.5" />, label: 'Pause scheduling', variant: 'ghost' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Reachable by its label as accessible name even while collapsed…
    expect(canvas.getByRole('button', { name: 'Pause scheduling' })).toBeTruthy();
    // …and the visible label is clipped to zero width until revealed.
    expect(canvas.getByText('Pause scheduling').getBoundingClientRect().width).toBe(0);
  },
};
