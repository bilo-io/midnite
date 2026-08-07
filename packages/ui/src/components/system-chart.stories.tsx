import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { AreaChart, LegendDot } from './system-chart';

const meta = {
  title: 'Components/AreaChart',
  component: AreaChart,
} satisfies Meta<typeof AreaChart>;

export default meta;
type Story = StoryObj<typeof meta>;

// Smooth-ish sample series (0–100), the shape the screensaver readout and the
// System monitor widgets feed in.
const CPU = [12, 18, 24, 20, 32, 45, 40, 55, 48, 60, 52, 68];
const RAM = [40, 42, 44, 46, 45, 48, 50, 52, 51, 54, 56, 58];
const GPU = [4, 6, 30, 62, 58, 71, 44, 22, 18, 40, 66, 74];

const SERIES = [
  { data: CPU, hueVar: '--status-wip' },
  { data: RAM, hueVar: '--status-todo' },
];

/** The default 184×52 intrinsic size. */
export const Default: Story = { args: { series: SERIES } };

/** Scales to its container via `className` while keeping the aspect ratio. */
export const FullWidth: Story = {
  args: { series: SERIES, className: 'w-full' },
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
  args: {
    series: [
      { data: Array(12).fill(4), hueVar: '--status-wip' },
      { data: Array(12).fill(30), hueVar: '--status-todo' },
    ],
  },
};

/** The chart with its legend, as the dashboard widget composes them. */
export const WithLegend: Story = {
  args: { series: SERIES },
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

/**
 * Three overlapping series — the combined System-monitor widget on a host that
 * reports GPU load. The spikiest series is deliberately last in the list so it
 * paints *underneath*: `series[0]` renders on top, matching the legend order.
 */
export const ThreeSeries: Story = {
  args: {
    series: [
      { data: CPU, hueVar: '--status-wip' },
      { data: RAM, hueVar: '--status-todo' },
      { data: GPU, hueVar: '--status-done' },
    ],
  },
  render: (args) => (
    <div className="flex flex-col gap-2">
      <div className="flex gap-4 text-xs">
        <LegendDot hueVar="--status-wip" label="CPU" value={68} />
        <LegendDot hueVar="--status-todo" label="RAM" value={58} />
        <LegendDot hueVar="--status-done" label="GPU" value={74} />
      </div>
      <AreaChart {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    // Three series → three areas + three lines.
    await expect(canvasElement.querySelectorAll('svg path')).toHaveLength(6);
  },
};
