import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Tabs, type TabOption } from './tabs';

const meta = {
  title: 'Primitives/Tabs',
  component: Tabs,
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

const options: TabOption<string>[] = [
  { value: 'board', label: 'Board' },
  { value: 'list', label: 'List' },
  { value: 'graph', label: 'Graph' },
];

// `render` drives its own state; `args` only satisfies the required-props type.

/** Controlled segmented control — the caller owns the active value. */
export const Interactive: Story = {
  args: { ariaLabel: 'View', options, value: 'board', onChange: () => {} },
  render: () => {
    const [value, setValue] = useState('board');
    return <Tabs ariaLabel="View" options={options} value={value} onChange={setValue} />;
  },
};

/**
 * a11y (Phase 60 I): the WAI-ARIA tabs keyboard pattern — a single tab stop
 * (roving tabindex), ←/→ move + activate, Home/End jump to the ends.
 */
export const KeyboardNavigation: Story = {
  args: { ariaLabel: 'View', options, value: 'board', onChange: () => {} },
  render: () => {
    const [value, setValue] = useState('board');
    return <Tabs ariaLabel="View" options={options} value={value} onChange={setValue} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const board = canvas.getByRole('tab', { name: 'Board' });
    const list = canvas.getByRole('tab', { name: 'List' });
    const graph = canvas.getByRole('tab', { name: 'Graph' });

    // Only the selected tab is in the tab order (roving tabindex).
    await expect(board).toHaveAttribute('tabindex', '0');
    await expect(list).toHaveAttribute('tabindex', '-1');

    board.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(list).toHaveAttribute('aria-selected', 'true');
    await expect(list).toHaveFocus();

    await userEvent.keyboard('{End}');
    await expect(graph).toHaveAttribute('aria-selected', 'true');

    await userEvent.keyboard('{Home}');
    await expect(board).toHaveAttribute('aria-selected', 'true');

    // Wraps from the first tab back to the last.
    await userEvent.keyboard('{ArrowLeft}');
    await expect(graph).toHaveAttribute('aria-selected', 'true');
  },
};

/** Two tabs. */
export const TwoTabs: Story = {
  args: { ariaLabel: 'State', options, value: 'on', onChange: () => {} },
  render: () => {
    const [value, setValue] = useState('on');
    return (
      <Tabs
        ariaLabel="State"
        options={[
          { value: 'on', label: 'Enabled' },
          { value: 'off', label: 'Disabled' },
        ]}
        value={value}
        onChange={setValue}
      />
    );
  },
};
