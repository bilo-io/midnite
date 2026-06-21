import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { StyledSelect } from './styled-select';
import { type SelectOption } from './select';

// StyledSelect is generic; type the meta against the concrete string instantiation.
const meta = {
  title: 'Primitives/StyledSelect',
  component: StyledSelect,
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StyledSelect<string>>;

export default meta;
type Story = StoryObj<typeof meta>;

const options: SelectOption<string>[] = [
  { value: 'todo', label: 'To do' },
  { value: 'wip', label: 'In progress' },
  { value: 'done', label: 'Done' },
];

// `render` drives its own state; `args` only satisfies the required-props type.

/** react-select backed single-select, unstyled + re-skinned with app tokens. */
export const Default: Story = {
  args: { options, value: 'todo', onChange: () => {} },
  render: () => {
    const [value, setValue] = useState('todo');
    return <StyledSelect aria-label="Status" options={options} value={value} onChange={setValue} />;
  },
};

/** Searchable variant. */
export const Searchable: Story = {
  args: { options, value: 'todo', onChange: () => {} },
  render: () => {
    const [value, setValue] = useState('todo');
    return (
      <StyledSelect
        aria-label="Status"
        options={options}
        value={value}
        onChange={setValue}
        isSearchable
      />
    );
  },
};
