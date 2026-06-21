import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Switch } from './switch';

const meta = {
  title: 'Primitives/Switch',
  component: Switch,
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

// These stories drive their own state inside `render`, but Storybook still
// requires `args` to satisfy the component's required props at the type level —
// supply placeholders the render ignores (same pattern web uses).

/** Controlled — click to toggle. */
export const Interactive: Story = {
  args: { checked: false, onCheckedChange: () => {} },
  render: () => {
    const [on, setOn] = useState(false);
    return <Switch checked={on} onCheckedChange={setOn} aria-label="Toggle setting" />;
  },
};

/** Both resting states + a disabled one. */
export const States: Story = {
  args: { checked: false, onCheckedChange: () => {} },
  render: () => (
    <div className="flex items-center gap-4">
      <Switch checked={false} onCheckedChange={() => {}} aria-label="Off" />
      <Switch checked onCheckedChange={() => {}} aria-label="On" />
      <Switch checked disabled onCheckedChange={() => {}} aria-label="Disabled" />
    </div>
  ),
};
