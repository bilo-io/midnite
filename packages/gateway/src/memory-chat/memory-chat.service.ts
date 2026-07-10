import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { MemoryChatMessage, PostMemoryChatResponse } from '@midnite/shared';
import { LlmService } from '../agent/llm/llm.service';
import { MemoriesService } from '../memories/memories.service';
import { MemoryChatRepository } from './memory-chat.repository';
import {
  buildContextText,
  corpusChars,
  selectCorpusChunks,
  MEMORY_CORPUS_BUDGET_CHARS,
} from './lib/retrieval';

const ANSWER_SCHEMA = {
  type: 'object' as const,
  properties: {
    answer: {
      type: 'string',
      description:
        'The answer, grounded ONLY in the provided context. If the context does not cover the question, say so plainly — never invent facts.',
    },
    citedSourceIds: {
      type: 'array',
      items: { type: 'string' },
      description:
        'The ids from the [source id: …] blocks you actually drew on. Empty when you used only the memory document or the answer is not covered.',
    },
  },
  required: ['answer', 'citedSourceIds'],
};

const SYSTEM_PROMPT = [
  'You answer questions about a single "memory" — a knowledge entry plus its reference sources.',
  'Use ONLY the provided context (the memory document + source blocks). Do not use outside knowledge.',
  'If the context does not contain the answer, say so honestly (e.g. "This memory doesn\'t cover that.") rather than guessing.',
  'Cite the sources you relied on by their id (the value in each [source id: …] tag) in citedSourceIds.',
  'Answer in clear, concise markdown.',
].join(' ');

/** The honest reply when a memory has no document text and no ingested sources. */
const EMPTY_CORPUS_REPLY =
  "This memory has no content or ingested sources yet, so there's nothing for me to answer from. Add some notes or sources first.";
/** The reply when no LLM provider is configured (the composer is normally disabled). */
const LLM_OFF_REPLY =
  'AI is not configured, so I can’t answer here. Add an AI provider in Settings to chat with this memory.';

@Injectable()
export class MemoryChatService {
  private readonly logger = new Logger(MemoryChatService.name);

  constructor(
    @Inject(MemoriesService) private readonly memories: MemoriesService,
    @Inject(MemoryChatRepository) private readonly repo: MemoryChatRepository,
    @Inject(LlmService) private readonly llm: LlmService,
  ) {}

  /** The memory's chat thread (validates the memory exists → 404 otherwise). */
  getHistory(memoryId: string): MemoryChatMessage[] {
    this.memories.getMemory(memoryId); // throws NotFound if the memory is gone
    return this.repo.listMessages(memoryId);
  }

  /**
   * Append the user's question and produce a grounded, cited answer. Retrieval
   * stuffs the full corpus, trimming by FTS rank only past the budget (§2). The
   * answer is one structured plan-model call, usage-tagged `memory-chat`, and
   * **fail-soft**: an LLM-off / empty-corpus / call-failure case still persists a
   * clean assistant turn (never a silent drop, never a fabricated answer).
   */
  async ask(memoryId: string, question: string): Promise<PostMemoryChatResponse> {
    const corpus = this.memories.getGroundingCorpus(memoryId); // 404 if gone
    const userMs = Date.now();
    const userMessage = this.repo.insertMessage({
      id: randomUUID(),
      memoryId,
      role: 'user',
      content: question,
      createdAt: new Date(userMs).toISOString(),
    });

    const reply = await this.buildReply(corpus, question);
    const assistantMessage = this.repo.insertMessage({
      id: randomUUID(),
      memoryId,
      role: 'assistant',
      content: reply.content,
      citations: reply.citations,
      error: reply.error,
      // Guarantee the assistant turn sorts after the user turn even for the
      // no-LLM paths that don't spend wall-clock time.
      createdAt: new Date(Math.max(Date.now(), userMs + 1)).toISOString(),
    });
    return { userMessage, assistantMessage };
  }

  private async buildReply(
    corpus: ReturnType<MemoriesService['getGroundingCorpus']>,
    question: string,
  ): Promise<{ content: string; citations: string[]; error?: boolean }> {
    if (!corpus.content.trim() && corpus.sources.length === 0) {
      return { content: EMPTY_CORPUS_REPLY, citations: [] };
    }
    if (!this.llm.enabled) {
      return { content: LLM_OFF_REPLY, citations: [], error: true };
    }

    // Stuff by default; FTS-rank the sources only when the corpus is over budget.
    const overBudget = corpusChars(corpus) > MEMORY_CORPUS_BUDGET_CHARS;
    const rankedIds = overBudget
      ? this.repo.rankSourceIdsByRelevance(
          question,
          corpus.sources.map((s) => ({ id: s.id, text: s.text })),
        )
      : corpus.sources.map((s) => s.id);
    const chunks = selectCorpusChunks(corpus, rankedIds);
    const context = buildContextText(chunks);
    const validIds = new Set(corpus.sources.map((s) => s.id));

    try {
      const { data } = await this.llm.generateStructured(
        {
          model: this.llm.getPlanModel(),
          maxTokens: 1024,
          system: SYSTEM_PROMPT,
          schema: ANSWER_SCHEMA,
          schemaName: 'memory_answer',
          schemaDescription: 'Record the grounded answer and the sources it cited.',
          messages: [{ role: 'user', text: `Context:\n\n${context}\n\n---\n\nQuestion: ${question}` }],
        },
        'memory-chat',
      );
      const out = data as { answer?: string; citedSourceIds?: unknown } | undefined;
      const answer = out?.answer?.trim();
      if (!answer) throw new Error('memory chat returned no answer');
      // Keep only citations that are real sources of this memory (drop hallucinations).
      const citations = Array.isArray(out?.citedSourceIds)
        ? [...new Set(out.citedSourceIds.filter((id): id is string => typeof id === 'string' && validIds.has(id)))]
        : [];
      return { content: answer, citations };
    } catch (err) {
      this.logger.warn(`memory chat answer failed for ${corpus.id}: ${String(err)}`);
      return {
        content: 'Sorry — I couldn’t generate an answer just now. Please try again.',
        citations: [],
        error: true,
      };
    }
  }
}
