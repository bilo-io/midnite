import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { GradientGlow } from './gradient-glow';

const meta = {
  title: 'Primitives/GradientGlow',
  component: GradientGlow,
  decorators: [
    (Story) => (
      <div className="max-w-sm p-10">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GradientGlow>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default `focus` trigger — glows while a descendant input is focused (the composer aesthetic). */
export const FocusTrigger: Story = {
  render: () => (
    <GradientGlow className="rounded-xl" data-testid="glow">
      <div className="rounded-xl bg-card p-4">
        <input className="w-full bg-transparent outline-none" placeholder="Focus me to light the glow" />
      </div>
    </GradientGlow>
  ),
  play: async ({ canvasElement }) => {
    const glow = within(canvasElement).getByTestId('glow');
    // Behaviour-preserving: the primitive applies the raw class the composers used.
    await expect(glow).toHaveClass('gradient-border');
    await expect(glow).not.toHaveClass('gradient-border--hover');
    await expect(glow).not.toHaveClass('gradient-border--always');
  },
};

/** `hover` trigger — lights on pointer hover (the assistant FAB at rest). */
export const HoverTrigger: Story = {
  render: () => (
    <GradientGlow trigger="hover" className="inline-flex rounded-full" data-testid="glow">
      <button className="rounded-full bg-card px-4 py-2">Hover me</button>
    </GradientGlow>
  ),
  play: async ({ canvasElement }) => {
    const glow = within(canvasElement).getByTestId('glow');
    await expect(glow).toHaveClass('gradient-border--hover');
  },
};

/** `always` trigger — glows unconditionally (the expanded assistant panel). */
export const AlwaysTrigger: Story = {
  render: () => (
    <GradientGlow trigger="always" className="rounded-xl" data-testid="glow">
      <div className="rounded-xl bg-card p-4 text-sm text-muted-foreground">Always glowing panel.</div>
    </GradientGlow>
  ),
  play: async ({ canvasElement }) => {
    const glow = within(canvasElement).getByTestId('glow');
    await expect(glow).toHaveClass('gradient-border--always');
  },
};
