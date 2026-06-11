import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Spinner } from './spinner';

const meta = {
  title: 'Components/Spinner',
  component: Spinner,
  argTypes: {
    variant: { control: 'select', options: ['orbit', 'breathe', 'jitter', 'tumble'] },
  },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The rAF-driven three-dot animation that morphs through phases. */
export const Orbit: Story = { args: { variant: 'orbit' } };
export const Breathe: Story = { args: { variant: 'breathe' } };
export const Jitter: Story = { args: { variant: 'jitter' } };
export const Tumble: Story = { args: { variant: 'tumble' } };

export const AllVariants: Story = {
  args: {},
  render: () => (
    <div className="flex items-center gap-12">
      {(['orbit', 'breathe', 'jitter', 'tumble'] as const).map((variant) => (
        <div key={variant} className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center">
            <Spinner variant={variant} />
          </div>
          <span className="text-xs text-muted-foreground">{variant}</span>
        </div>
      ))}
    </div>
  ),
};
