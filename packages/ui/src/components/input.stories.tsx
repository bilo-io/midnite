import type { Meta, StoryObj } from '@storybook/react-vite';

import { Input } from './input';

const meta = {
  title: 'Primitives/Input',
  component: Input,
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

// Every input carries an accessible name (aria-label) — a bare, unlabelled field
// is an axe violation, so the stories model correct usage (Phase 60 I).
export const Default: Story = { args: { defaultValue: 'midnite', 'aria-label': 'Name' } };
export const Placeholder: Story = { args: { placeholder: 'Search tasks…', 'aria-label': 'Search tasks' } };
export const Disabled: Story = {
  args: { disabled: true, value: 'Read only', readOnly: true, 'aria-label': 'Read-only field' },
};

/** All three states stacked. */
export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Input defaultValue="With a value" aria-label="Value field" />
      <Input placeholder="With a placeholder" aria-label="Placeholder field" />
      <Input disabled placeholder="Disabled" aria-label="Disabled field" />
    </div>
  ),
};
