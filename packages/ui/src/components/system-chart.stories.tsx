import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { AreaChart, LegendDot } from './system-chart';

const meta = {
  title: 'Components/AreaChart',
  component: AreaChart,
} satisfies Meta<typeof AreaChart>;

export default meta;
type Story = StoryObj<typeof meta>;

// A pair of smooth-ish sample series (0–100), the shape the screensaver readout
// and the System monitor widget feed in.
const CPU = [12, 18, 24, 20, 32, 45, 40, 55, 48, 60, 52, 68];
const RAM = [40, 42, 44, 46, 45, 48, 50, 52, 51, 54, 56, 58];

/** The default 184×52 intrinsic size. */
export const Default: Story = { args: { cpu: CPU, ram: RAM } };

/** Scales to its container via `className` while keeping the aspect ratio. */
export const FullWidth: Story = {
  args: { cpu: CPU, ram: RAM, className: 'w-full' },
  render: (args) => (
    <div className="w-96">
      <AreaChart {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    // The chart is decorative (aria-hidden), so assert the SVG element mounts.
    const svg = canvasElement.querySelector('svg');
    await expect(svg).not.toBeNull();
  },
};

/** Flat, quiet series — the idle baseline. */
export const Idle: Story = {
  args: { cpu: Array(12).fill(4), ram: Array(12).fill(30) },
};

/** The chart with its legend, as the dashboard widget composes them. */
export const WithLegend: Story = {
  args: { cpu: CPU, ram: RAM },
  render: (args) => (
    <div className="flex flex-col gap-2">
      <div className="flex gap-4 text-xs">
        <LegendDot hueVar="--status-wip" label="CPU" value={68} />
        <LegendDot hueVar="--status-todo" label="RAM" value={58} />
      </div>
      <AreaChart {...args} />
    </div>
  ),
};
