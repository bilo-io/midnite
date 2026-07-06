import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { ChatIntentParse, ChatQueryAnswer } from '@midnite/shared';

import type { ChatIntentService } from './chat-intent.service';
import type { ChatQueryService } from './chat-query.service';
import { ChatQueryController } from './chat-query.controller';

const ANSWER: ChatQueryAnswer = { text: 'ok', tasks: [], count: 0, truncated: false, inferencePath: 'deterministic' };

function make(parse: ChatIntentParse) {
  const intent = { parse: vi.fn(async () => parse) } as unknown as ChatIntentService;
  const answer = vi.fn(async () => ANSWER);
  const query = { answer } as unknown as ChatQueryService;
  return { controller: new ChatQueryController(intent, query), answer };
}

describe('ChatQueryController', () => {
  it('routes a parsed query intent (with its read) to the answerer', async () => {
    const parse: ChatIntentParse = {
      intent: { type: 'query', text: 'show blocked', read: { metric: 'list', blocked: true } },
      source: 'grammar',
      confidence: 1,
    };
    const { controller, answer } = make(parse);
    const res = await controller.ask({ text: 'show blocked' }, { userId: 'u1', teamId: 't1' } as never);
    expect(res.answer).toBe(ANSWER);
    expect(answer).toHaveBeenCalledWith(parse.intent, { userId: 'u1', teamId: 't1' });
  });

  it('coerces a NON-query parse into a read-only free-form query (never mutates)', async () => {
    // The parser thinks this is a createTask; the query endpoint must NOT execute
    // it — it wraps the raw text as a query so the answerer only reads.
    const parse: ChatIntentParse = {
      intent: { type: 'createTask', title: 'delete everything' },
      source: 'llm',
      confidence: 0.75,
    };
    const { controller, answer } = make(parse);
    await controller.ask({ text: 'delete everything' }, null);
    expect(answer).toHaveBeenCalledWith({ type: 'query', text: 'delete everything' }, undefined);
  });

  it('rejects an empty question', async () => {
    const { controller } = make({ intent: { type: 'unknown', text: '' }, source: 'grammar', confidence: 0 });
    await expect(controller.ask({ text: '   ' }, null)).rejects.toBeInstanceOf(BadRequestException);
  });
});
