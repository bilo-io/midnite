import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Button } from './button';
import { Tooltip } from './tooltip';

const meta = {
  title: 'Primitives/Tooltip',
  component: Tooltip,
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Hover (or focus) an icon-only button to reveal its label. */
export const Default: Story = {
  args: { label: 'Build Atlas', children: null },
  render: () => (
    <div style={{ padding: 80 }}>
      <Tooltip label="Build Atlas" delayMs={0}>
        <Button variant="ghost" size="icon" aria-label="Build Atlas">
          ⚒
        </Button>
      </Tooltip>
    </div>
  ),
  // The bubble is portaled to <body>, so query the whole document rather than the
  // canvas subtree. It is aria-hidden by design (the button already carries the
  // name), which is why this looks it up by role from the DOM directly.
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('button', { name: 'Build Atlas' });
    await expect(document.querySelector('[role="tooltip"]')).toBeNull();

    await userEvent.hover(trigger);
    await waitFor(() => expect(document.querySelector('[role="tooltip"]')).not.toBeNull());
    await expect(document.querySelector('[role="tooltip"]')).toHaveTextContent('Build Atlas');

    await userEvent.unhover(trigger);
    await waitFor(() => expect(document.querySelector('[role="tooltip"]')).toBeNull());
  },
};

/** Keyboard focus opens it immediately; Escape dismisses. */
export const FocusAndEscape: Story = {
  args: { label: 'Launch Atlas', children: null },
  render: () => (
    <div style={{ padding: 80 }}>
      <Tooltip label="Launch Atlas" delayMs={0}>
        <Button variant="ghost" size="icon" aria-label="Launch Atlas">
          🚀
        </Button>
      </Tooltip>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('button', { name: 'Launch Atlas' });
    trigger.focus();
    await waitFor(() => expect(document.querySelector('[role="tooltip"]')).not.toBeNull());

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(document.querySelector('[role="tooltip"]')).toBeNull());
  },
};
