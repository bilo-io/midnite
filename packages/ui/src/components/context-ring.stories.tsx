import type { Meta, StoryObj } from '@storybook/react-vite';

import { ContextRing } from './context-ring';

const meta = {
  title: 'Components/ContextRing',
  component: ContextRing,
} satisfies Meta<typeof ContextRing>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Under 50% — green. Hover for the tooltip. */
export const Low: Story = { args: { tokens: 42_000, limit: 200_000 } };

/** 50–80% — amber. */
export const Mid: Story = { args: { tokens: 130_000, limit: 200_000 } };

/** Over 80% — red. */
export const High: Story = { args: { tokens: 184_000, limit: 200_000 } };

export const AllLevels: Story = {
  args: { tokens: 42_000, limit: 200_000 },
  render: () => (
    <div className="flex items-center gap-6">
      {[12_000, 42_000, 104_000, 130_000, 168_000, 184_000, 200_000].map((tokens) => (
        <div key={tokens} className="flex flex-col items-center gap-1.5">
          <ContextRing tokens={tokens} limit={200_000} />
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {Math.round((tokens / 200_000) * 100)}%
          </span>
        </div>
      ))}
    </div>
  ),
};
