import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { SystemMonitorWidget } from './system-monitor-widget';

// This widget has no gateway endpoint — it renders simulated CPU/RAM telemetry
// (random-walk series from useSystemTelemetry). The sample values are
// intentionally non-deterministic, so the story asserts structure (the card, the
// CPU/RAM legend, and the area chart) rather than specific readings.
const meta = {
  title: 'Widgets/SystemMonitorWidget',
  component: SystemMonitorWidget,
  decorators: [
    (Story) => (
      <div className="h-64 w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SystemMonitorWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Renders the simulated CPU/RAM monitor with its legend and area chart. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('System monitor')).toBeInTheDocument();
    expect(await canvas.findAllByText(/CPU/)).not.toHaveLength(0);
    expect(canvas.getAllByText(/RAM/)).not.toHaveLength(0);
    // The area chart renders as an inline SVG.
    expect(canvasElement.querySelector('svg')).toBeTruthy();
  },
};
