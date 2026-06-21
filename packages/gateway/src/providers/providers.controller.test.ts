import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { ProviderResponse, ProvidersResponse } from '@midnite/shared';
import type { ProvidersService } from './providers.service';
import { ProvidersController } from './providers.controller';

const fakeProviders = { activeProvider: 'anthropic', providers: [] } as unknown as ProvidersResponse;
const fakeProvider = { provider: { provider: 'anthropic' } } as unknown as ProviderResponse;

function build(overrides: Partial<Record<keyof ProvidersService, unknown>> = {}) {
  const service = {
    list: vi.fn(() => fakeProviders),
    setActiveProvider: vi.fn(async () => fakeProviders),
    updateProvider: vi.fn(async () => fakeProvider),
    ...overrides,
  } as unknown as ProvidersService;
  return { controller: new ProvidersController(service), service };
}

describe('ProvidersController — param/body validation (400)', () => {
  it('rejects an unknown active provider', async () => {
    const { controller } = build();
    await expect(controller.setActive({ activeProvider: 'cohere' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects an unknown provider in the path', async () => {
    const { controller } = build();
    await expect(controller.update('cohere', { apiKey: 'k' })).rejects.toThrow(BadRequestException);
  });

  it('rejects an oversized apiKey body', async () => {
    const { controller } = build();
    await expect(controller.update('anthropic', { apiKey: 'x'.repeat(401) })).rejects.toThrow(
      BadRequestException,
    );
  });
});

describe('ProvidersController — valid input delegates to the service', () => {
  it('lists providers', () => {
    const { controller, service } = build();
    expect(controller.list()).toEqual(fakeProviders);
    expect(service.list).toHaveBeenCalled();
  });

  it('sets the active provider from the parsed body', async () => {
    const { controller, service } = build();
    await controller.setActive({ activeProvider: 'openai' });
    expect(service.setActiveProvider).toHaveBeenCalledWith('openai');
  });

  it('updates a provider credential with the parsed body', async () => {
    const { controller, service } = build();
    await controller.update('anthropic', { apiKey: 'secret' });
    expect(service.updateProvider).toHaveBeenCalledWith('anthropic', { apiKey: 'secret' });
  });
});
