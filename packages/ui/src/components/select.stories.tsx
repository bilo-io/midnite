import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Select, type SelectOption } from './select';

// Select is generic; type the meta against the concrete string instantiation.
const meta = {
  title: 'Primitives/Select',
  component: Select,
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Select<string>>;

export default meta;
type Story = StoryObj<typeof meta>;

const options: SelectOption<string>[] = [
  { value: 'sonnet', label: 'Claude Sonnet' },
  { value: 'opus', label: 'Claude Opus' },
  { value: 'haiku', label: 'Claude Haiku' },
];

// `render` drives its own state; `args` only satisfies the required-props type.

/** Controlled single-select. Open the menu to pick a value. */
export const Default: Story = {
  args: { options, value: 'sonnet', onChange: () => {} },
  render: () => {
    const [value, setValue] = useState('sonnet');
    return <Select aria-label="Model" options={options} value={value} onChange={setValue} />;
  },
};

/** Disabled trigger. */
export const Disabled: Story = {
  args: { options, value: 'sonnet', onChange: () => {} },
  render: () => (
    <Select aria-label="Model" options={options} value="sonnet" onChange={() => {}} disabled />
  ),
};
