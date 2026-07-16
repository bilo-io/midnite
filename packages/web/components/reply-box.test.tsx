import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const sendSessionPrompt = vi.fn();

// ApiError is declared inside the factory (vi.mock is hoisted above the module
// body, so a top-level class would be in the TDZ when the factory runs).
vi.mock('@/lib/api', () => {
  class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }
  return { sendSessionPrompt: (...args: unknown[]) => sendSessionPrompt(...args), ApiError };
});

import { ApiError } from '@/lib/api';
import { ReplyBox } from './reply-box';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe('ReplyBox', () => {
  it('disables send until there is non-whitespace text', () => {
    render(<ReplyBox sessionId="t1" />);
    const send = screen.getByRole('button', { name: /send reply/i });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Reply to the agent'), { target: { value: '   ' } });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Reply to the agent'), { target: { value: 'keep going' } });
    expect(send).toBeEnabled();
  });

  it('sends the trimmed text, clears the input, and calls onSent', async () => {
    sendSessionPrompt.mockResolvedValue(undefined);
    const onSent = vi.fn();
    render(<ReplyBox sessionId="t1" onSent={onSent} />);
    const input = screen.getByLabelText('Reply to the agent') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '  do the thing  ' } });
    fireEvent.click(screen.getByRole('button', { name: /send reply/i }));
    await waitFor(() => expect(sendSessionPrompt).toHaveBeenCalledWith('t1', 'do the thing'));
    await waitFor(() => expect(onSent).toHaveBeenCalledOnce());
    expect(input.value).toBe('');
  });

  it('submits on Enter', async () => {
    sendSessionPrompt.mockResolvedValue(undefined);
    render(<ReplyBox sessionId="t1" />);
    const input = screen.getByLabelText('Reply to the agent');
    fireEvent.change(input, { target: { value: 'go' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(sendSessionPrompt).toHaveBeenCalledWith('t1', 'go'));
  });

  it('does not submit on Shift+Enter', () => {
    render(<ReplyBox sessionId="t1" />);
    const input = screen.getByLabelText('Reply to the agent');
    fireEvent.change(input, { target: { value: 'go' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(sendSessionPrompt).not.toHaveBeenCalled();
  });

  it('surfaces a friendly message for a 409 (no live session) and keeps the text', async () => {
    sendSessionPrompt.mockRejectedValue(new ApiError('conflict', 409));
    render(<ReplyBox sessionId="t1" />);
    const input = screen.getByLabelText('Reply to the agent') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'hello' } });
    fireEvent.click(screen.getByRole('button', { name: /send reply/i }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/no live session/i);
    expect(input.value).toBe('hello'); // not cleared on failure
  });

  it('surfaces the raw error message for other failures', async () => {
    sendSessionPrompt.mockRejectedValue(new ApiError('task t1 not found', 404));
    render(<ReplyBox sessionId="t1" />);
    fireEvent.change(screen.getByLabelText('Reply to the agent'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: /send reply/i }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/not found/i);
  });
});
