import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { SessionSummary, SessionTranscript } from '@midnite/shared';
import type { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';

const fakeSession = { id: 's1', archived: false } as unknown as SessionSummary;
const fakeTranscript = { sessionId: 's1', entries: [] } as unknown as SessionTranscript;

function build(overrides: Partial<Record<keyof SessionsService, unknown>> = {}) {
  const service = {
    list: vi.fn(async () => [fakeSession]),
    transcript: vi.fn(async () => fakeTranscript),
    mintTerminalToken: vi.fn(() => ({ token: 't', expiresAt: '' })),
    archive: vi.fn(() => ({ ...fakeSession, archived: true })),
    unarchive: vi.fn(() => fakeSession),
    delete: vi.fn(),
    ...overrides,
  } as unknown as SessionsService;
  return { controller: new SessionsController(service), service };
}

describe('SessionsController — delegates to the service', () => {
  it('lists sessions', async () => {
    const { controller, service } = build();
    expect(await controller.list()).toEqual([fakeSession]);
    expect(service.list).toHaveBeenCalled();
  });

  it('fetches a transcript by projectSlug + id', async () => {
    const { controller, service } = build();
    await controller.transcript('proj', 's1');
    expect(service.transcript).toHaveBeenCalledWith('proj', 's1');
  });

  it('archives a session', () => {
    const { controller, service } = build();
    expect(controller.archive('s1')).toEqual({ ...fakeSession, archived: true });
    expect(service.archive).toHaveBeenCalledWith('s1');
  });

  it('returns { ok: true } after delete', () => {
    const { controller, service } = build();
    expect(controller.remove('s1')).toEqual({ ok: true });
    expect(service.delete).toHaveBeenCalledWith('s1');
  });
});

describe('SessionsController — service errors propagate', () => {
  it('lets a NotFoundException surface from a transcript fetch', async () => {
    const { controller } = build({
      transcript: vi.fn(async () => {
        throw new NotFoundException('session not found');
      }),
    });
    await expect(controller.transcript('proj', 's9')).rejects.toThrow(NotFoundException);
  });
});
