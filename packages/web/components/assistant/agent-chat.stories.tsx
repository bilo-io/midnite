import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { AgentChat } from './agent-chat';

/**
 * Phase 66 E — the fleet assistant chat surface. The story renders the empty
 * transcript (network-backed answers are exercised in `agent-chat.test.tsx`,
 * where the API is mocked); the `play` fn asserts the idle affordances render.
 */
const meta = {
  title: 'Assistant/AgentChat',
  component: AgentChat,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div style={{ height: 360, maxWidth: 420 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AgentChat>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText(/ask the fleet assistant/i)).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /ask/i })).toBeDisabled();
  },
};
