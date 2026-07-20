import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { RadialGauge } from './radial-gauge';

const GB = 1024 ** 3;

const meta = {
  title: 'Components/RadialGauge',
  component: RadialGauge,
} satisfies Meta<typeof RadialGauge>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A little under half used. */
export const Low: Story = { args: { usedBytes: 180 * GB, totalBytes: 512 * GB } };

/** Nearly full — the ring almost closes. */
export const High: Story = {
  args: { usedBytes: 472 * GB, totalBytes: 512 * GB },
  play: async ({ canvasElement }) => {
    // The gauge exposes its fill as an accessible label — 92% of 512 GB.
    const gauge = within(canvasElement).getByRole('img');
    await expect(gauge).toHaveAttribute('aria-label', '92% used');
  },
};

/** Empty disk — no fill. */
export const Empty: Story = { args: { usedBytes: 0, totalBytes: 512 * GB } };

/** A range of fills side by side (App-cache + Disk widgets read identically). */
export const AllLevels: Story = {
  args: { usedBytes: 180 * GB, totalBytes: 512 * GB },
  render: () => (
    <div className="flex items-end gap-8">
      {[0, 96, 256, 472, 512].map((used) => (
        <div key={used} className="flex flex-col items-center gap-1.5">
          <RadialGauge usedBytes={used * GB} totalBytes={512 * GB} />
        </div>
      ))}
    </div>
  ),
};
