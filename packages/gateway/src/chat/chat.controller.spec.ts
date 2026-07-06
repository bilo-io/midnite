import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ChatController } from './chat.controller';
import type { ChatCommandService } from './chat-command.service';

function make(overrides: Partial<ChatCommandService> = {}) {
  const service = {
    preview: vi.fn().mockResolvedValue({ parse: {}, description: 'd', willMutate: true }),
    execute: vi.fn().mockResolvedValue({ parse: {}, result: { summary: 's', affectedIds: [], inferencePath: 'deterministic' } }),
    ...overrides,
  } as unknown as ChatCommandService;
  return { controller: new ChatController(service), service };
}

describe('ChatController', () => {
  it('preview delegates the validated text (no scope needed)', async () => {
    const { controller, service } = make();
    await controller.preview({ text: 'show blocked' });
    expect(service.preview).toHaveBeenCalledWith('show blocked');
  });

  it('command forwards the caller’s team scope', async () => {
    const { controller, service } = make();
    await controller.command({ text: 'add "x"' }, { userId: 'u1', email: 'u1@x.io', teamId: 't1' });
    expect(service.execute).toHaveBeenCalledWith('add "x"', { userId: 'u1', teamId: 't1' });
  });

  it('command tolerates no user (scope undefined)', async () => {
    const { controller, service } = make();
    await controller.command({ text: 'add "x"' }, null);
    expect(service.execute).toHaveBeenCalledWith('add "x"', undefined);
  });

  it('rejects an empty / malformed body', async () => {
    const { controller } = make();
    await expect(controller.command({ text: '' }, null)).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.preview({})).rejects.toBeInstanceOf(BadRequestException);
  });
});
