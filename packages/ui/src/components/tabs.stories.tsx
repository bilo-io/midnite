import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

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
