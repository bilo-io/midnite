import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Brain } from 'lucide-react';
import { expect, userEvent, within } from 'storybook/test';

import { RailShell } from './rail-shell';

/**
 * Interactive harness: RailShell owns nothing, so the story holds the open state
 * and lets the play function drive the content-layer toggles.
 */
function Harness({ startLeft = true, startRight = true }: { startLeft?: boolean; startRight?: boolean }) {
  const [leftOpen, setLeftOpen] = useState(startLeft);
  const [rightOpen, setRightOpen] = useState(startRight);
  return (
    <RailShell
      isMobile={false}
      left={{
        title: 'Sources',
        icon: <Brain className="h-4 w-4" />,
        open: leftOpen,
        onToggle: () => setLeftOpen((o) => !o),
        content: <p className="text-sm text-muted-foreground">Left rail body</p>,
      }}
      right={{
        title: 'Studio',
        open: rightOpen,
        onToggle: () => setRightOpen((o) => !o),
        content: <p className="text-sm text-muted-foreground">Right rail body</p>,
      }}
    >
      <div className="rounded-lg border border-border/60 bg-card/40 p-4">Center content</div>
    </RailShell>
  );
}

const meta = {
  title: 'Components/RailShell',
  component: Harness,
  decorators: [
    (Story) => (
      <div className="w-[900px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Harness>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Both rails open, no interaction — a stable baseline (used for screenshots). */
export const Open: Story = {};

/** Both rails open; the toggles live in the content layer, not the rails. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The toggle is a content-layer control naming the rail — reflecting open state.
    const leftToggle = canvas.getByRole('button', { name: 'Collapse Sources' });
    await expect(leftToggle).toHaveAttribute('aria-pressed', 'true');
    await expect(canvas.getByText('Left rail body')).toBeInTheDocument();

    // Collapsing flips the control's label + pressed state (the rail animates to 0).
    await userEvent.click(leftToggle);
    await expect(canvas.getByRole('button', { name: 'Expand Sources' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    // The right rail toggles independently.
    await userEvent.click(canvas.getByRole('button', { name: 'Collapse Studio' }));
    await expect(canvas.getByRole('button', { name: 'Expand Studio' })).toBeInTheDocument();
  },
};
