import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Idea, IdeaChatResponse, IdeaMessage } from '@midnite/shared';

const listIdeaMessages = vi.fn();
const sendIdeaMessage = vi.fn();
const updateIdea = vi.fn();
vi.mock('@/lib/api', () => ({
  listIdeaMessages: (...args: unknown[]) => listIdeaMessages(...args),
  sendIdeaMessage: (...args: unknown[]) => sendIdeaMessage(...args),
  updateIdea: (...args: unknown[]) => updateIdea(...args),
}));

// MarkdownPreview pulls in heavy markdown deps; a passthrough keeps the test light.
vi.mock('@/components/markdown-preview', () => ({
  MarkdownPreview: ({ content }: { content: string }) => <div data-testid="md">{content}</div>,
}));

import { IdeaChatDrawer } from './IdeaChatDrawer';
import { withQueryClient } from '@/lib/test-query-wrapper';

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  listIdeaMessages.mockResolvedValue({ messages: [] });
});

const IDEA: Idea = {
  id: 'idea-1',
  title: 'Cool idea',
  body: 'original body',
  status: 'draft',
  projectId: null,
  tags: [],
  createdAt: '2026-06-26T00:00:00.000Z',
  updatedAt: '2026-06-26T00:00:00.000Z',
};

function msg(role: IdeaMessage['role'], content: string, id = `${role}-${content}`): IdeaMessage {
  return { id, ideaId: IDEA.id, role, content, createdAt: '2026-06-26T00:00:00.000Z' };
}

it('renders nothing when closed', () => {
  const { container } = render(
    withQueryClient(<IdeaChatDrawer idea={IDEA} open={false} onClose={vi.fn()} />),
  );
  expect(container.firstChild).toBeNull();
});

it('restores message history on open', async () => {
  listIdeaMessages.mockResolvedValue({
    messages: [msg('user', 'hello'), msg('assistant', 'a refined body')],
  });
  render(withQueryClient(<IdeaChatDrawer idea={IDEA} open onClose={vi.fn()} />));
  expect(await screen.findByText('hello')).toBeTruthy();
  expect(listIdeaMessages).toHaveBeenCalledWith('idea-1');
});

it('sends a message and appends both turns to the thread', async () => {
  const response: IdeaChatResponse = {
    userMessage: msg('user', 'make it sharper'),
    assistantMessage: msg('assistant', 'a sharper refined body'),
  };
  sendIdeaMessage.mockResolvedValue(response);

  render(withQueryClient(<IdeaChatDrawer idea={IDEA} open onClose={vi.fn()} />));
  const textarea = await screen.findByLabelText('Message');
  fireEvent.change(textarea, { target: { value: 'make it sharper' } });
  fireEvent.click(screen.getByLabelText('Send message'));

  await waitFor(() => expect(sendIdeaMessage).toHaveBeenCalledWith('idea-1', { content: 'make it sharper' }));
  // Assistant reply appears both as a thread bubble and in the body preview.
  expect((await screen.findAllByText('a sharper refined body')).length).toBeGreaterThanOrEqual(1);
});

it('applies the latest assistant body and flips status to refined', async () => {
  listIdeaMessages.mockResolvedValue({
    messages: [msg('assistant', 'the refined body')],
  });
  updateIdea.mockResolvedValue({ idea: { ...IDEA, body: 'the refined body', status: 'refined' } });
  const onApplied = vi.fn();

  render(withQueryClient(<IdeaChatDrawer idea={IDEA} open onClose={vi.fn()} onApplied={onApplied} />));
  const applyBtn = await screen.findByRole('button', { name: /apply to idea/i });
  await waitFor(() => expect(applyBtn).not.toHaveProperty('disabled', true));
  fireEvent.click(applyBtn);

  await waitFor(() =>
    expect(updateIdea).toHaveBeenCalledWith('idea-1', { body: 'the refined body', status: 'refined' }),
  );
  expect(onApplied).toHaveBeenCalled();
});

describe('apply gating', () => {
  it('disables Apply when the latest assistant body equals the current idea body', async () => {
    listIdeaMessages.mockResolvedValue({ messages: [msg('assistant', 'original body')] });
    render(withQueryClient(<IdeaChatDrawer idea={IDEA} open onClose={vi.fn()} />));
    const applyBtn = await screen.findByRole('button', { name: /apply to idea/i });
    expect((applyBtn as HTMLButtonElement).disabled).toBe(true);
  });
});
