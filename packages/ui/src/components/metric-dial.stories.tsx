import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { MetricDial } from './metric-dial';

const meta = {
  title: 'Components/MetricDial',
  component: MetricDial,
} satisfies Meta<typeof MetricDial>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The CPU dial, in the amber the CPU series uses on the area chart. */
export const Cpu: Story = {
  args: { pct: 42, label: 'CPU', hueVar: '--status-wip' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('img', { name: 'CPU 42%' })).toBeInTheDocument();
    await expect(canvas.getByText('42%')).toBeInTheDocument();
  },
};

/** RAM, with a used/total figure as the supporting sublabel. */
export const Ram: Story = {
  args: { pct: 78.4, label: 'RAM', hueVar: '--status-todo', sublabel: '25.1 GB of 32 GB' },
  play: async ({ canvasElement }) => {
    // The centre figure rounds for display; the ring keeps the precise fraction.
    await expect(within(canvasElement).getByText('78%')).toBeInTheDocument();
  },
};

/** GPU, with the adapter name underneath. */
export const Gpu: Story = {
  args: { pct: 74, label: 'GPU', hueVar: '--status-done', sublabel: 'Apple M2 Pro' },
};

/** Idle — the ring is empty but the dial still reads as a measurement. */
export const Idle: Story = {
  args: { pct: 0, label: 'GPU', hueVar: '--status-done' },
};

/** Saturated. */
export const Full: Story = {
  args: { pct: 100, label: 'CPU', hueVar: '--status-wip' },
};

/**
 * Out-of-range input is clamped rather than allowed to overdraw the ring — a
 * driver that reports 137% shouldn't sweep past the full circle.
 */
export const Clamped: Story = {
  args: { pct: 137, label: 'GPU', hueVar: '--status-done' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('100%')).toBeInTheDocument();
  },
};

/** The three dials side by side, as a dashboard row. */
export const Row: Story = {
  args: { pct: 42, label: 'CPU', hueVar: '--status-wip' },
  render: () => (
    <div className="flex gap-8">
      <MetricDial pct={42} label="CPU" hueVar="--status-wip" />
      <MetricDial pct={78} label="RAM" hueVar="--status-todo" />
      <MetricDial pct={74} label="GPU" hueVar="--status-done" />
    </div>
  ),
};
