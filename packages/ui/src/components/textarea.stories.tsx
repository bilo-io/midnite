import type { Meta, StoryObj } from '@storybook/react-vite';

import { Textarea } from './textarea';

const meta = {
  title: 'Primitives/Textarea',
  component: Textarea,
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { defaultValue: 'Describe the task for the agent to pick up…' },
};
export const Placeholder: Story = { args: { placeholder: 'Add a description…' } };
export const Disabled: Story = {
  args: { disabled: true, value: 'Read only', readOnly: true },
};

/** All three states stacked. */
export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Textarea defaultValue="With a value" />
      <Textarea placeholder="With a placeholder" />
      <Textarea disabled placeholder="Disabled" />
    </div>
  ),
};
