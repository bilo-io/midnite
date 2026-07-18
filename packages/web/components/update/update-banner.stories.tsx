import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { UpdateBannerView } from './update-banner-view';

/**
 * The banner reads as an *inverted* surface (dark chrome in light mode, light in
 * dark) for contrast, sits at the top of the app, and animates its height in/out.
 * Stories drive the presentational view directly (the container wires context).
 */
const meta = {
  title: 'Components/UpdateBanner',
  component: UpdateBannerView,
  parameters: { layout: 'fullscreen' },
  args: {
    visible: true,
    belowFloor: false,
    latest: '0.2.0',
    onUpdate: () => {},
    onDismiss: () => {},
  },
} satisfies Meta<typeof UpdateBannerView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithReleaseNotes: Story = {
  args: { notesUrl: 'https://example.com/notes' },
};

export const ForceUpdateFloor: Story = {
  args: { belowFloor: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // No dismiss affordance below the floor.
    expect(canvas.queryByRole('button', { name: /dismiss update notice/i })).toBeNull();
    expect(canvas.getByText(/required update is available/i)).toBeInTheDocument();
  },
};

/** Interactive: clicking × collapses the banner (its height animates to 0). */
export const DismissCollapses: Story = {
  render: (args) => {
    function Harness() {
      const [visible, setVisible] = useState(true);
      return <UpdateBannerView {...args} visible={visible} onDismiss={() => setVisible(false)} />;
    }
    return <Harness />;
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const wrapper = canvasElement.querySelector('[aria-hidden]') as HTMLElement;
    expect(wrapper).toHaveAttribute('aria-hidden', 'false');
    await userEvent.click(canvas.getByRole('button', { name: /dismiss update notice/i }));
    await step('banner collapses', async () => {
      await expect(canvasElement.querySelector('[aria-hidden="true"]')).toBeTruthy();
    });
  },
};

/**
 * Desktop (electron-updater) states — the container maps the update phase to these
 * props. Downloading shows a progress bar + a disabled action.
 */
export const Downloading: Story = {
  args: {
    headline: 'Downloading update…',
    actionLabel: 'Downloading 42%',
    actionDisabled: true,
    downloadPercent: 42,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole('progressbar', { name: /downloading update/i })).toHaveAttribute(
      'aria-valuenow',
      '42',
    );
    expect(canvas.getByRole('button', { name: 'Downloading 42%' })).toBeDisabled();
  },
};

/** Desktop: the update is downloaded and a restart installs it. */
export const ReadyToRestart: Story = {
  args: {
    headline: 'An update is ready to install',
    actionLabel: 'Restart to install',
    downloadPercent: 100,
  },
};

/** Desktop: the update failed — fail-soft, the action becomes Retry. */
export const Failed: Story = {
  args: { headline: 'Update failed', actionLabel: 'Retry' },
};
