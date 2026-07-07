import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ChatController } from './chat.controller';
import type { ChatCommandService } from './chat-command.service';
import type { ChatUndoService } from './chat-undo.service';

function make(overrides: Partial<ChatCommandService> = {}, undoOverrides: Partial<ChatUndoService> = {}) {
  const service = {
    preview: vi.fn().mockResolvedValue({ parse: {}, description: 'd', willMutate: true, confirmation: 'confirm' }),
    execute: vi
      .fn()
      .mockResolvedValue({ parse: {}, result: { summary: 's', affectedIds: [], inferencePath: 'deterministic', confirmation: 'none' } }),
    ...overrides,
  } as unknown as ChatCommandService;
  const undoService = {
    undo: vi.fn().mockReturnValue({ summary: 'Reverted 1 change.', affectedIds: ['t1'], inferencePath: 'deterministic', confirmation: 'none' }),
    ...undoOverrides,
  } as unknown as ChatUndoService;
  return { controller: new ChatController(service, undoService), service, undoService };
}

describe('ChatController', () => {
  it('preview delegates the validated text (no scope needed)', async () => {
    const { controller, service } = make();
    await controller.preview({ text: 'show blocked' });
    expect(service.preview).toHaveBeenCalledWith('show blocked');
  });

  it('command forwards the caller’s team scope + confirm flag', async () => {
    const { controller, service } = make();
    await controller.command({ text: 'add "x"', confirm: true }, { userId: 'u1', email: 'u1@x.io', teamId: 't1' });
    expect(service.execute).toHaveBeenCalledWith('add "x"', { userId: 'u1', teamId: 't1' }, true);
  });

  it('command defaults confirm to false when omitted', async () => {
    const { controller, service } = make();
    await controller.command({ text: 'add "x"' }, null);
    expect(service.execute).toHaveBeenCalledWith('add "x"', undefined, false);
  });

  it('undo forwards the token + scope and wraps the result', async () => {
    const { controller, undoService } = make();
    const res = await controller.undo({ undoToken: 'tok1' }, { userId: 'u1', email: 'u1@x.io', teamId: 't1' });
    expect(undoService.undo).toHaveBeenCalledWith('tok1', { userId: 'u1', teamId: 't1' });
    expect(res.result.summary).toMatch(/reverted/i);
  });

  it('rejects an empty / malformed body', async () => {
    const { controller } = make();
    await expect(controller.command({ text: '' }, null)).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.preview({})).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.undo({}, null)).rejects.toBeInstanceOf(BadRequestException);
  });
});
