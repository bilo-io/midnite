import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

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

/**
 * Behavioral coverage (Phase 60 L): opening the react-select control reveals an
 * option per value; picking one updates the displayed value.
 */
export const OpenPick: Story = {
  args: { options, value: 'todo', onChange: () => {} },
  render: () => {
    const [value, setValue] = useState('todo');
    return <StyledSelect aria-label="Status" options={options} value={value} onChange={setValue} />;
  },
  play: async ({ canvasElement }) => {
    const combobox = within(canvasElement).getByRole('combobox');
    await expect(canvasElement).toHaveTextContent('To do');
    await userEvent.click(combobox);
    // react-select portals its menu to <body>.
    const body = within(document.body);
    await expect(body.getAllByRole('option')).toHaveLength(3);
    await userEvent.click(body.getByText('In progress'));
    await expect(canvasElement).toHaveTextContent('In progress');
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
