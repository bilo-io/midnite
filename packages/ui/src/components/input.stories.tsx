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

export const Default: Story = { args: { defaultValue: 'midnite' } };
export const Placeholder: Story = { args: { placeholder: 'Search tasks…' } };
export const Disabled: Story = { args: { disabled: true, value: 'Read only', readOnly: true } };

/** All three states stacked. */
export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Input defaultValue="With a value" />
      <Input placeholder="With a placeholder" />
      <Input disabled placeholder="Disabled" />
    </div>
  ),
};
