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

// Phase 82 D — the model can only answer in the user's language if the request says so.
//
// This was originally framed around a locale whose UI catalog was still a stub (first
// de-DE, then es-ES). Every declared locale is authored now, so the surviving guarantee is
// that a **non-default** locale reaches the gateway unchanged rather than being normalised
// to en-GB in the request path. The labels below are Spanish because es-ES is translated.
it('sends the active locale unchanged for a non-default locale (Phase 82 D)', async () => {
  aiReady();
  getMemoryChat.mockResolvedValue([]);
  postMemoryChat.mockResolvedValue({
    userMessage: { id: 'u1', memoryId: 'm1', role: 'user', content: '¿por qué?', citations: [], createdAt: 't1' },
    assistantMessage: {
      id: 'a1',
      memoryId: 'm1',
      role: 'assistant',
      content: 'Porque lo dice la guía.',
      citations: [],
      createdAt: 't2',
    },
  });

  render(<MemoryChatComposer memory={memory} />, { locale: 'es-ES' });
  const input = await screen.findByLabelText('Hazle una pregunta a este recuerdo');
  fireEvent.change(input, { target: { value: '¿por qué?' } });
  fireEvent.click(screen.getByLabelText('Enviar'));

  expect(await screen.findByText('Porque lo dice la guía.')).toBeInTheDocument();
  expect(postMemoryChat).toHaveBeenCalledWith('m1', '¿por qué?', 'es-ES');
});
