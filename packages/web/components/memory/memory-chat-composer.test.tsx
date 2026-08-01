import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import type { Memory } from '@midnite/shared';
import { renderWithIntl as render } from '@/vitest.render-intl';

const getMemoryChat = vi.fn();
const postMemoryChat = vi.fn();
const getSetupStatus = vi.fn();
vi.mock('@/lib/api', () => ({
  getMemoryChat: (...a: unknown[]) => getMemoryChat(...a),
  postMemoryChat: (...a: unknown[]) => postMemoryChat(...a),
  getSetupStatus: (...a: unknown[]) => getSetupStatus(...a),
}));

import { MemoryChatComposer } from './memory-chat-composer';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const memory: Memory = {
  id: 'm1',
  title: 'Conventions',
  content: 'Use tabs.',
  projectId: null,
  sources: [
    { id: 's1', memoryId: 'm1', url: 'https://example.com/doc', kind: 'link', title: 'Doc One', createdAt: 't' },
  ],
  createdAt: 't',
  updatedAt: 't',
};

const aiReady = () => getSetupStatus.mockResolvedValue({ items: [{ id: 'provider', label: 'p', state: 'ok' }], ready: true });

it('sends a question and renders the cited answer', async () => {
  aiReady();
  getMemoryChat.mockResolvedValue([]);
  postMemoryChat.mockResolvedValue({
    userMessage: { id: 'u1', memoryId: 'm1', role: 'user', content: 'why tabs?', citations: [], createdAt: 't1' },
    assistantMessage: {
      id: 'a1',
      memoryId: 'm1',
      role: 'assistant',
      content: 'Because the guide says so.',
      citations: ['s1'],
      createdAt: 't2',
    },
  });

  render(<MemoryChatComposer memory={memory} />);
  const input = await screen.findByLabelText('Ask this memory a question');
  fireEvent.change(input, { target: { value: 'why tabs?' } });
  fireEvent.click(screen.getByLabelText('Send'));

  expect(await screen.findByText('Because the guide says so.')).toBeInTheDocument();
  // The active locale rides along so the gateway prompts the model in it (Phase 82 D).
  expect(postMemoryChat).toHaveBeenCalledWith('m1', 'why tabs?', 'en-GB');
  // The cited source renders as a chip.
  expect(screen.getByText('Doc One')).toBeInTheDocument();
});

it('loads and shows existing history on mount', async () => {
  aiReady();
  getMemoryChat.mockResolvedValue([
    { id: 'a0', memoryId: 'm1', role: 'assistant', content: 'A prior answer.', citations: [], createdAt: 't0' },
  ]);
  render(<MemoryChatComposer memory={memory} />);
  expect(await screen.findByText('A prior answer.')).toBeInTheDocument();
});

it('disables the composer with a hint when no AI provider is configured', async () => {
  getMemoryChat.mockResolvedValue([]);
  getSetupStatus.mockResolvedValue({
    items: [
      { id: 'provider', label: 'p', state: 'missing' },
      { id: 'agent-cli', label: 'c', state: 'missing' },
    ],
    ready: false,
  });
  render(<MemoryChatComposer memory={memory} />);
  expect(await screen.findByText(/Add an AI provider in Settings/i)).toBeInTheDocument();
  expect(screen.queryByLabelText('Ask this memory a question')).toBeNull();
});

// Phase 82 D — the model can only answer in the user's language if the request says
// so, and that must hold for a locale whose UI catalog is still a stub: de-DE renders
// the en-GB fallback copy (hence the English labels below) yet still asks the gateway
// for a German answer. No clamping to a "complete" locale.
it('sends the active locale even when its UI catalog is a stub (Phase 82 D)', async () => {
  aiReady();
  getMemoryChat.mockResolvedValue([]);
  postMemoryChat.mockResolvedValue({
    userMessage: { id: 'u1', memoryId: 'm1', role: 'user', content: 'warum?', citations: [], createdAt: 't1' },
    assistantMessage: {
      id: 'a1',
      memoryId: 'm1',
      role: 'assistant',
      content: 'Weil der Leitfaden es sagt.',
      citations: [],
      createdAt: 't2',
    },
  });

  render(<MemoryChatComposer memory={memory} />, { locale: 'de-DE' });
  const input = await screen.findByLabelText('Ask this memory a question');
  fireEvent.change(input, { target: { value: 'warum?' } });
  fireEvent.click(screen.getByLabelText('Send'));

  expect(await screen.findByText('Weil der Leitfaden es sagt.')).toBeInTheDocument();
  expect(postMemoryChat).toHaveBeenCalledWith('m1', 'warum?', 'de-DE');
});
