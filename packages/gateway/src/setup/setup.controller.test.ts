import { describe, expect, it, vi } from 'vitest';
import type { SetupStatus } from '@midnite/shared';
import type { SetupService } from './setup.service';
import { SetupController } from './setup.controller';

const fakeStatus = { items: [], ready: false } as unknown as SetupStatus;

describe('SetupController', () => {
  it('delegates to the service', async () => {
    const service = { getStatus: vi.fn(async () => fakeStatus) } as unknown as SetupService;
    const controller = new SetupController(service);
    expect(await controller.getStatus()).toEqual(fakeStatus);
    expect(service.getStatus).toHaveBeenCalled();
  });
});
