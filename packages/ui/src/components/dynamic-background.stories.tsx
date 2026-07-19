import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { DynamicBackground } from './dynamic-background';

/**
 * The cursor-reactive canvas backdrop. It's a decorative, `aria-hidden`
 * full-bleed `<canvas>` (absolute inset-0), so the decorator gives it a sized,
 * relative frame to fill. Pixels can't be asserted meaningfully — the play
 * function is a smoke check that the canvas mounts and its rAF loop starts
 * without throwing.
 */
const meta = {
  title: 'Components/DynamicBackground',
  component: DynamicBackground,
  decorators: [
    (Story) => (
      <div className="relative h-[320px] w-[560px] overflow-hidden rounded-lg border border-border/60 bg-background">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DynamicBackground>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Dots lattice — mounts and animates without throwing. */
export const Dots: Story = {
  args: { pattern: 'dots' },
  play: async ({ canvasElement }) => {
    // The backdrop canvas is aria-hidden, so query the node directly.
    const canvas = canvasElement.querySelector('canvas');
    await expect(canvas).toBeInTheDocument();
    await expect(canvas).toHaveAttribute('aria-hidden');
  },
};

/** Drifting colour clouds — the gradient renderer path. */
export const Gradient: Story = { args: { pattern: 'gradient' } };
