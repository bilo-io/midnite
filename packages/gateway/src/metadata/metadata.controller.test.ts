import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { LinkMetadataResponse } from '@midnite/shared';
import type { MetadataService } from './metadata.service';
import { MetadataController } from './metadata.controller';

const fakeMeta = { title: 'Example', favicon: null } as unknown as LinkMetadataResponse;

function build() {
  const service = { fetch: vi.fn(async () => fakeMeta) } as unknown as MetadataService;
  return { controller: new MetadataController(service), service };
}

describe('MetadataController', () => {
  it('rejects a non-url query (400)', async () => {
    const { controller } = build();
    await expect(controller.getMetadata({ url: 'not-a-url' })).rejects.toThrow(BadRequestException);
  });

  it('delegates with the parsed url', async () => {
    const { controller, service } = build();
    expect(await controller.getMetadata({ url: 'https://example.com' })).toEqual(fakeMeta);
    expect(service.fetch).toHaveBeenCalledWith('https://example.com');
  });
});
