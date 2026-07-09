import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

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
  // Behavioral coverage (Phase 60 L): a disabled trigger doesn't open.
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('button', { name: 'Model' });
    await expect(trigger).toBeDisabled();
    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  },
};

/**
 * Behavioral coverage (Phase 60 L): open → the listbox portals in with an option
 * per value, picking updates the trigger label + closes, and Escape closes.
 */
export const OpenPickClose: Story = {
  args: { options, value: 'sonnet', onChange: () => {} },
  render: () => {
    const [value, setValue] = useState('sonnet');
    return <Select aria-label="Model" options={options} value={value} onChange={setValue} />;
  },
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('button', { name: 'Model' });
    await expect(trigger).toHaveTextContent('Claude Sonnet');

    // Open — the menu renders in a portal (document.body), not canvasElement.
    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const body = within(document.body);
    await expect(body.getByRole('listbox')).toBeInTheDocument();
    await expect(body.getAllByRole('option')).toHaveLength(3);

    // Pick Opus → label updates + menu closes.
    await userEvent.click(body.getByRole('option', { name: 'Claude Opus' }));
    await expect(trigger).toHaveTextContent('Claude Opus');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    // Re-open then Escape closes.
    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{Escape}');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  },
};
