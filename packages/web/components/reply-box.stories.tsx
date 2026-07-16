import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import { installMockFetch } from '@/stories/mock-fetch';

import { ReplyBox } from './reply-box';

const meta = {
  title: 'Components/ReplyBox',
  component: ReplyBox,
  decorators: [
    (Story) => (
      <div className="w-96 p-4">
        <Story />
      </div>
    ),
  ],
  args: { sessionId: 't1' },
} satisfies Meta<typeof ReplyBox>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The default inline reply box (detail surfaces). */
export const Default: Story = {};

/** Compact variant used inside the board card's quick-reply popover. */
export const Compact: Story = { args: { compact: true } };

/** Typing enables Send; sending clears the input (status flip is earned via WS). */
export const SendsAReply: Story = {
  beforeEach: () => installMockFetch([{ match: '/sessions/t1/prompt', json: { ok: true } }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Reply to the agent') as HTMLInputElement;
    const send = canvas.getByRole('button', { name: /send reply/i });
    await expect(send).toBeDisabled();
    await userEvent.type(input, 'keep going');
    await expect(send).toBeEnabled();
    await userEvent.click(send);
    await expect(input).toHaveValue('');
  },
};

/** A 409 (no live session) surfaces a friendly, actionable message. */
export const NoLiveSession: Story = {
  beforeEach: () =>
    installMockFetch([{ match: '/sessions/t1/prompt', status: 409, json: { message: 'no live session' } }]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Reply to the agent'), 'hello');
    await userEvent.click(canvas.getByRole('button', { name: /send reply/i }));
    await expect(await canvas.findByRole('alert')).toHaveTextContent(/no live session/i);
  },
};
