import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { MemoryArtifact, MidniteConfig } from '@midnite/shared';
import type { MemoryStudioService } from './memory-studio.service';
import { MemoryStudioController } from './memory-studio.controller';

const artifact = {
  id: 'a1',
  memoryId: 'm1',
  kind: 'brief',
  format: 'markdown',
  title: 'Executive brief',
  content: '',
  status: 'pending',
  error: null,
  filePath: null,
  mimeType: null,
  fileSize: null,
  degraded: false,
  createdAt: 'now',
  updatedAt: 'now',
} satisfies MemoryArtifact;

const config = { gateway: { uploadsDir: '/tmp/midnite-test-uploads' } } as unknown as MidniteConfig;

function build(overrides: Partial<Record<keyof MemoryStudioService, unknown>> = {}) {
  const service = {
    listArtifacts: vi.fn(() => [artifact]),
    generate: vi.fn(() => artifact),
    deleteArtifact: vi.fn(),
    getArtifactFile: vi.fn(() => ({ filePath: 'memory-studio/a1.mp3', mimeType: 'audio/mpeg' })),
    ...overrides,
  } as unknown as MemoryStudioService;
  return { controller: new MemoryStudioController(service, config), service };
}

describe('MemoryStudioController', () => {
  it('lists artifacts', () => {
    const { controller } = build();
    expect(controller.list('m1')).toEqual({ artifacts: [artifact] });
  });

  it('generates a known kind', () => {
    const { controller, service } = build();
    expect(controller.generate('m1', { kind: 'brief' })).toEqual({ artifact });
    expect(service.generate).toHaveBeenCalledWith('m1', 'brief');
  });

  it('rejects an unknown kind (400)', () => {
    const { controller } = build();
    expect(() => controller.generate('m1', { kind: 'poster' })).toThrow(BadRequestException);
  });

  it('rejects a missing body (400)', () => {
    const { controller } = build();
    expect(() => controller.generate('m1', {})).toThrow(BadRequestException);
  });

  it('deletes an artifact', () => {
    const { controller, service } = build();
    expect(controller.remove('m1', 'a1')).toEqual({ ok: true });
    expect(service.deleteArtifact).toHaveBeenCalledWith('m1', 'a1');
  });
});
