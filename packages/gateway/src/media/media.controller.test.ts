import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { parseConfig, type Media, type MidniteConfig } from '@midnite/shared';
import type { MediaService } from './media.service';
import { MediaController } from './media.controller';

const config: MidniteConfig = parseConfig({ agent: {}, terminal: {}, gateway: {} });
const fakeMedia = { id: 'md1', type: 'image', title: 'Pic', tags: [] } as unknown as Media;

function build(overrides: Partial<Record<keyof MediaService, unknown>> = {}) {
  const service = {
    listMedia: vi.fn(() => [fakeMedia]),
    createMedia: vi.fn(() => fakeMedia),
    getMedia: vi.fn(() => fakeMedia),
    updateMedia: vi.fn(() => fakeMedia),
    deleteMedia: vi.fn(),
    ...overrides,
  } as unknown as MediaService;
  return { controller: new MediaController(service, config), service };
}

describe('MediaController — query/body validation (400)', () => {
  it('rejects an unknown type filter on list', () => {
    const { controller } = build();
    expect(() => controller.listMedia(undefined, 'hologram')).toThrow(BadRequestException);
  });

  it('rejects a create with an invalid type', () => {
    const { controller } = build();
    expect(() => controller.createMedia({ type: 'gif', title: 'x' })).toThrow(BadRequestException);
  });

  it('rejects a create with a blank title', () => {
    const { controller } = build();
    expect(() => controller.createMedia({ type: 'image', title: '  ' })).toThrow(
      BadRequestException,
    );
  });
});

describe('MediaController — valid input delegates to the service', () => {
  it('lists by projectId + parsed type', () => {
    const { controller, service } = build();
    controller.listMedia('p1', 'video');
    expect(service.listMedia).toHaveBeenCalledWith('p1', 'video');
  });

  it('creates with the parsed (default-filled) body', () => {
    const { controller, service } = build();
    expect(controller.createMedia({ type: 'image', title: 'Pic' })).toEqual({ media: fakeMedia });
    expect(service.createMedia).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'image', title: 'Pic', tags: [] }),
    );
  });

  it('returns { ok: true } after delete', () => {
    const { controller, service } = build();
    expect(controller.deleteMedia('md1')).toEqual({ ok: true });
    expect(service.deleteMedia).toHaveBeenCalledWith('md1');
  });
});

describe('MediaController — service errors propagate', () => {
  it('lets a NotFoundException surface from GET :id', () => {
    const { controller } = build({
      getMedia: vi.fn(() => {
        throw new NotFoundException('media md9 not found');
      }),
    });
    expect(() => controller.getMedia('md9')).toThrow(NotFoundException);
  });
});
