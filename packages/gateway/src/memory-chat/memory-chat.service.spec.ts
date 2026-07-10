import { describe, expect, it, vi } from 'vitest';
import type { LlmService } from '../agent/llm/llm.service';
import type { MemoriesService, MemoryCorpus } from '../memories/memories.service';
import type { MemoryChatRepository, NewChatMessage } from './memory-chat.repository';
import { MemoryChatService } from './memory-chat.service';

const echoInsert = (m: NewChatMessage) => ({
  id: m.id,
  memoryId: m.memoryId,
  role: m.role,
  content: m.content,
  citations: m.citations ?? [],
  error: m.error,
  createdAt: m.createdAt,
});

function makeCorpus(over: Partial<MemoryCorpus> = {}): MemoryCorpus {
  return {
    id: 'm1',
    title: 'My memory',
    content: 'The sky is blue.',
    sources: [
      { id: 's1', label: 'One', text: 'Grass is green.' },
      { id: 's2', label: 'Two', text: 'Water is wet.' },
    ],
    ...over,
  };
}

function setup(opts: {
  corpus?: MemoryCorpus;
  enabled?: boolean;
  answer?: { answer?: string; citedSourceIds?: unknown };
  throws?: boolean;
}) {
  const corpus = opts.corpus ?? makeCorpus();
  const memories = {
    getMemory: vi.fn(() => ({ id: 'm1' })),
    getGroundingCorpus: vi.fn(() => corpus),
  } as unknown as MemoriesService;
  const repo = {
    insertMessage: vi.fn(echoInsert),
    listMessages: vi.fn(() => []),
    rankSourceIdsByRelevance: vi.fn((_q: string, s: { id: string }[]) => s.map((x) => x.id)),
  } as unknown as MemoryChatRepository;
  const generateStructured = opts.throws
    ? vi.fn().mockRejectedValue(new Error('boom'))
    : vi.fn().mockResolvedValue({ data: opts.answer ?? { answer: 'An answer.', citedSourceIds: [] } });
  const llm = {
    get enabled() {
      return opts.enabled ?? true;
    },
    getPlanModel: () => 'plan-model',
    generateStructured,
  } as unknown as LlmService;
  return { service: new MemoryChatService(memories, repo, llm), repo, llm, generateStructured };
}

describe('MemoryChatService.ask', () => {
  it('answers and keeps only citations that are real sources', async () => {
    const { service } = setup({ answer: { answer: 'Because science.', citedSourceIds: ['s1', 'ghost'] } });
    const { userMessage, assistantMessage } = await service.ask('m1', 'why?');
    expect(userMessage).toMatchObject({ role: 'user', content: 'why?' });
    expect(assistantMessage.content).toBe('Because science.');
    expect(assistantMessage.citations).toEqual(['s1']); // 'ghost' dropped
    expect(assistantMessage.error).toBeUndefined();
  });

  it('returns an honest deterministic reply with no LLM call when the corpus is empty', async () => {
    const { service, generateStructured } = setup({ corpus: makeCorpus({ content: '  ', sources: [] }) });
    const { assistantMessage } = await service.ask('m1', 'anything?');
    expect(generateStructured).not.toHaveBeenCalled();
    expect(assistantMessage.content).toMatch(/no content or ingested sources/i);
    expect(assistantMessage.error).toBeUndefined();
  });

  it('returns an error turn (no LLM call) when AI is disabled', async () => {
    const { service, generateStructured } = setup({ enabled: false });
    const { assistantMessage } = await service.ask('m1', 'q');
    expect(generateStructured).not.toHaveBeenCalled();
    expect(assistantMessage.error).toBe(true);
    expect(assistantMessage.content).toMatch(/not configured/i);
  });

  it('fails soft to an error turn when the LLM call throws', async () => {
    const { service } = setup({ throws: true });
    const { assistantMessage } = await service.ask('m1', 'q');
    expect(assistantMessage.error).toBe(true);
    expect(assistantMessage.content).toMatch(/couldn.t generate/i);
  });

  it('FTS-ranks sources only when the corpus exceeds the budget', async () => {
    const small = setup({});
    await small.service.ask('m1', 'q');
    expect(small.repo.rankSourceIdsByRelevance).not.toHaveBeenCalled();

    const big = setup({
      corpus: makeCorpus({ content: 'x'.repeat(30_000) }),
    });
    await big.service.ask('m1', 'q');
    expect(big.repo.rankSourceIdsByRelevance).toHaveBeenCalledOnce();
  });
});

describe('MemoryChatService.getHistory', () => {
  it('validates the memory then returns its thread', () => {
    const { service, repo } = setup({});
    service.getHistory('m1');
    expect(repo.listMessages).toHaveBeenCalledWith('m1');
  });
});
