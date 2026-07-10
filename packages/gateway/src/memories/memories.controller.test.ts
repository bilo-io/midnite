import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { Memory } from '@midnite/shared';
import type { MemoriesService } from './memories.service';
import { MemoriesController } from './memories.controller';

const fakeMemory = { id: 'mem1', title: 'Note', content: '', sources: [] } as unknown as Memory;

function build(overrides: Partial<Record<keyof MemoriesService, unknown>> = {}) {
  const service = {
    listMemories: vi.fn(() => [fakeMemory]),
    getMemory: vi.fn(() => fakeMemory),
    createMemory: vi.fn(async () => fakeMemory),
    updateMemory: vi.fn(() => fakeMemory),
    removeMemory: vi.fn(),
    addSource: vi.fn(async () => fakeMemory),
    reorderSources: vi.fn(() => fakeMemory),
    removeSource: vi.fn(() => fakeMemory),
    ...overrides,
  } as unknown as MemoriesService;
  return { controller: new MemoriesController(service), service };
}

describe('MemoriesController — body validation (400)', () => {
  it('rejects a create with a blank title', async () => {
    const { controller } = build();
    await expect(controller.createMemory({ title: '' })).rejects.toThrow(BadRequestException);
  });

  it('rejects a source with a non-url', async () => {
    const { controller } = build();
    await expect(controller.addSource('mem1', { url: 'not-a-url' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects a reorder with an empty source list', () => {
    const { controller } = build();
    expect(() => controller.reorderSources('mem1', { sourceIds: [] })).toThrow(BadRequestException);
  });
});

describe('MemoriesController — valid input delegates to the service', () => {
  it('creates with the parsed body', async () => {
    const { controller, service } = build();
    expect(await controller.createMemory({ title: 'Note' })).toEqual({ memory: fakeMemory });
    expect(service.createMemory).toHaveBeenCalledWith(expect.objectContaining({ title: 'Note' }));
  });

  it('fetches a single memory by id', () => {
    const { controller, service } = build();
    expect(controller.getMemory('mem1')).toEqual({ memory: fakeMemory });
    expect(service.getMemory).toHaveBeenCalledWith('mem1');
  });

  it('adds a source by url', async () => {
    const { controller, service } = build();
    await controller.addSource('mem1', { url: 'https://example.com' });
    expect(service.addSource).toHaveBeenCalledWith('mem1', 'https://example.com');
  });

  it('returns { ok: true } after delete', () => {
    const { controller, service } = build();
    expect(controller.removeMemory('mem1')).toEqual({ ok: true });
    expect(service.removeMemory).toHaveBeenCalledWith('mem1');
  });
});

describe('MemoriesController — service errors propagate', () => {
  it('lets a NotFoundException surface from PATCH :id', () => {
    const { controller } = build({
      updateMemory: vi.fn(() => {
        throw new NotFoundException('memory mem9 not found');
      }),
    });
    expect(() => controller.updateMemory('mem9', { title: 'x' })).toThrow(NotFoundException);
  });

  it('lets a NotFoundException surface from GET :id', () => {
    const { controller } = build({
      getMemory: vi.fn(() => {
        throw new NotFoundException('memory mem9 not found');
      }),
    });
    expect(() => controller.getMemory('mem9')).toThrow(NotFoundException);
  });
});
