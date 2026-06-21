import { describe, expect, it, vi } from 'vitest';
import type { EnvironmentResponse } from '@midnite/shared';
import type { EnvironmentService } from './environment.service';
import { EnvironmentController } from './environment.controller';

const fakeEnv = { os: 'mac', tools: [] } as unknown as EnvironmentResponse;

describe('EnvironmentController', () => {
  it('delegates to the service', async () => {
    const service = { getEnvironment: vi.fn(async () => fakeEnv) } as unknown as EnvironmentService;
    const controller = new EnvironmentController(service);
    expect(await controller.getEnvironment()).toEqual(fakeEnv);
    expect(service.getEnvironment).toHaveBeenCalled();
  });
});
