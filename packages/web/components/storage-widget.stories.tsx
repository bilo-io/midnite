import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { StorageWidget } from './storage-widget';

// Stub the Storage Manager estimate so the radial gauge is deterministic. The
// real widget reads `navigator.storage.estimate()` (the origin's quota/usage).
function stubEstimate(estimate: { usage: number; quota: number } | undefined) {
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: estimate ? { estimate: async () => estimate } : undefined,
  });
}

const GB = 1024 ** 3;

const meta = {
  title: 'Widgets/StorageWidget',
  component: StorageWidget,
  decorators: [
    (Story) => (
      <div className="h-80 w-72">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StorageWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A partly-full device: ~42 GB of 128 GB used → 33%. */
export const Default: Story = {
  beforeEach: () => stubEstimate({ usage: 42 * GB, quota: 128 * GB }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Storage')).toBeInTheDocument();
    await expect(await canvas.findByText(/33% used/)).toBeInTheDocument();
    // The gauge renders as an inline SVG with a track + progress ring.
    expect(canvasElement.querySelectorAll('circle')).toHaveLength(2);
  },
};

/** Nearly full: 120 GB of 128 GB → 94%. */
export const NearlyFull: Story = {
  beforeEach: () => stubEstimate({ usage: 120 * GB, quota: 128 * GB }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/94% used/)).toBeInTheDocument();
  },
};

/** No Storage Manager API → the unsupported message. */
export const Unsupported: Story = {
  beforeEach: () => stubEstimate(undefined),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/aren’t available/)).toBeInTheDocument();
  },
};
