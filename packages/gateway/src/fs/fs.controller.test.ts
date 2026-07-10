import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { BrowseDirResponse } from '@midnite/shared';
import type { FsService } from './fs.service';
import { FsController } from './fs.controller';

const fakeDirs = { path: '/home', parent: '/', entries: [] } as unknown as BrowseDirResponse;

function build(overrides: Partial<Record<keyof FsService, unknown>> = {}) {
  const service = {
    browseDir: vi.fn(async () => fakeDirs),
    createDir: vi.fn(async () => fakeDirs),
    ...overrides,
  } as unknown as FsService;
  return { controller: new FsController(service), service };
}

describe('FsController', () => {
  it('delegates to browseDir and returns the listing', async () => {
    const { controller, service } = build();
    expect(await controller.dirs('/home')).toEqual(fakeDirs);
    expect(service.browseDir).toHaveBeenCalledWith('/home');
  });

  it('maps a service error to 400 so the picker can show it inline', async () => {
    const { controller } = build({
      browseDir: vi.fn(async () => {
        throw new Error('ENOENT: no such directory');
      }),
    });
    await expect(controller.dirs('/missing')).rejects.toThrow(BadRequestException);
  });

  it('creates a directory and returns its listing', async () => {
    const { controller, service } = build();
    expect(await controller.create({ path: '~/Dev/arcade' })).toEqual(fakeDirs);
    expect(service.createDir).toHaveBeenCalledWith('~/Dev/arcade');
  });

  it('rejects a malformed create body with 400', async () => {
    const { controller } = build();
    await expect(controller.create({ path: '' })).rejects.toThrow(BadRequestException);
  });

  it('maps a create failure (e.g. permission denied) to 400', async () => {
    const { controller } = build({
      createDir: vi.fn(async () => {
        throw new Error('EACCES: permission denied');
      }),
    });
    await expect(controller.create({ path: '/root/nope' })).rejects.toThrow(BadRequestException);
  });
});
