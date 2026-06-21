import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { NewsService } from './news.service';
import { NewsController } from './news.controller';

function build(overrides: Partial<Record<keyof NewsService, unknown>> = {}) {
  const service = { topStories: vi.fn(async () => []), ...overrides } as unknown as NewsService;
  return { controller: new NewsController(service), service };
}

describe('NewsController', () => {
  it('rejects a non-numeric count (400)', async () => {
    const { controller } = build();
    await expect(controller.getNews({ count: 'abc' })).rejects.toThrow(BadRequestException);
  });

  it('delegates with the parsed (default) count', async () => {
    const { controller, service } = build();
    expect(await controller.getNews({})).toEqual({ stories: [] });
    expect(service.topStories).toHaveBeenCalledWith(expect.any(Number));
  });

  it('wraps an upstream failure as 500', async () => {
    const { controller } = build({
      topStories: vi.fn(async () => {
        throw new Error('hn down');
      }),
    });
    await expect(controller.getNews({})).rejects.toThrow(InternalServerErrorException);
  });
});
