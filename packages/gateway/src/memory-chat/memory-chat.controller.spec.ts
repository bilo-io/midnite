import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { MemoryChatService } from './memory-chat.service';
import { MemoryChatController } from './memory-chat.controller';

function make() {
  const service = {
    getHistory: vi.fn(() => [{ id: 'a1', memoryId: 'm1', role: 'assistant', content: 'hi', citations: [], createdAt: 't' }]),
    ask: vi.fn(async () => ({
      userMessage: { id: 'u1', memoryId: 'm1', role: 'user', content: 'q', citations: [], createdAt: 't1' },
      assistantMessage: { id: 'a1', memoryId: 'm1', role: 'assistant', content: 'a', citations: [], createdAt: 't2' },
    })),
  } as unknown as MemoryChatService;
  return { service, controller: new MemoryChatController(service) };
}

describe('MemoryChatController', () => {
  it('wraps the thread in { messages }', () => {
    const { controller, service } = make();
    expect(controller.history('m1').messages).toHaveLength(1);
    expect(service.getHistory).toHaveBeenCalledWith('m1');
  });

  it('rejects an empty message with 400', () => {
    const { controller } = make();
    expect(() => controller.ask('m1', { message: '   ' })).toThrow(BadRequestException);
  });

  it('delegates a valid question to the service', async () => {
    const { controller, service } = make();
    const res = await controller.ask('m1', { message: 'why?' });
    expect(service.ask).toHaveBeenCalledWith('m1', 'why?', undefined);
    expect(res.assistantMessage.content).toBe('a');
  });

  it('passes the requested output locale through (Phase 82 D)', async () => {
    const { controller, service } = make();
    await controller.ask('m1', { message: 'pourquoi ?', locale: 'fr-FR' });
    expect(service.ask).toHaveBeenCalledWith('m1', 'pourquoi ?', 'fr-FR');
  });

  it('rejects an unsupported locale with 400', () => {
    const { controller } = make();
    expect(() => controller.ask('m1', { message: 'why?', locale: 'pt-BR' })).toThrow(
      BadRequestException,
    );
  });
});
