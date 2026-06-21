import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './button';

const meta = {
  title: 'Primitives/Button',
  component: Button,
  args: { children: 'Button' },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { variant: 'default', children: 'Default' } };
export const Secondary: Story = { args: { variant: 'secondary', children: 'Secondary' } };
export const Ghost: Story = { args: { variant: 'ghost', children: 'Ghost' } };
export const Outline: Story = { args: { variant: 'outline', children: 'Outline' } };
export const Destructive: Story = { args: { variant: 'destructive', children: 'Destructive' } };
export const Disabled: Story = { args: { disabled: true, children: 'Disabled' } };

/** Every variant side by side. */
export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="default">Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="destructive">Destructive</Button>
    </div>
  ),
};

/** The size scale: sm / default / lg / icon. */
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon" aria-label="Icon button">
        +
      </Button>
    </div>
  ),
};
