import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Button } from './button';

const meta = {
  title: 'Primitives/Button',
  component: Button,
  args: { children: 'Button' },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// Behavioral coverage (Phase 60 L) — the ui primitives had render-only stories;
// these `play` fns exercise real interaction as browser tests.

/** Fires onClick when enabled; the click is swallowed while disabled. */
export const ClickBehavior: Story = {
  args: { children: 'Save', onClick: fn() },
  play: async ({ args, canvasElement }) => {
    const btn = within(canvasElement).getByRole('button', { name: 'Save' });
    await userEvent.click(btn);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

/** A disabled button never fires onClick. */
export const DisabledDoesNotFire: Story = {
  args: { children: 'Save', disabled: true, onClick: fn() },
  play: async ({ args, canvasElement }) => {
    const btn = within(canvasElement).getByRole('button', { name: 'Save' });
    await expect(btn).toBeDisabled();
    // Bypass userEvent's pointer-events guard so we prove the *disabled button*
    // swallows the click (a disabled <button> dispatches no click event).
    await userEvent.click(btn, { pointerEventsCheck: 0 });
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

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
