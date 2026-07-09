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

// Every textarea carries an accessible name (aria-label) — a bare, unlabelled
// field is an axe violation, so the stories model correct usage (Phase 60 I).
export const Default: Story = {
  args: { defaultValue: 'Describe the task for the agent to pick up…', 'aria-label': 'Task description' },
};
export const Placeholder: Story = {
  args: { placeholder: 'Add a description…', 'aria-label': 'Description' },
};
export const Disabled: Story = {
  args: { disabled: true, value: 'Read only', readOnly: true, 'aria-label': 'Read-only field' },
};

/** All three states stacked. */
export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Textarea defaultValue="With a value" aria-label="Value field" />
      <Textarea placeholder="With a placeholder" aria-label="Placeholder field" />
      <Textarea disabled placeholder="Disabled" aria-label="Disabled field" />
    </div>
  ),
};
