import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { MarketService } from './market.service';
import { MarketController } from './market.controller';

function build(overrides: Partial<Record<keyof MarketService, unknown>> = {}) {
  const service = {
    search: vi.fn(async () => []),
    quote: vi.fn(async () => ({ symbol: 'AAPL', price: 1 })),
    history: vi.fn(async () => ({ points: [] })),
    ...overrides,
  } as unknown as MarketService;
  return { controller: new MarketController(service), service };
}

describe('MarketController — query validation (400)', () => {
  it('rejects a search with an unknown kind', async () => {
    const { controller } = build();
    await expect(controller.search({ kind: 'bond', query: 'x' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects a quote with a blank symbol', async () => {
    const { controller } = build();
    await expect(controller.quote({ kind: 'stock', symbol: '' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects history with an unknown timeframe', async () => {
    const { controller } = build();
    await expect(
      controller.history({ kind: 'stock', symbol: 'AAPL', timeframe: '5Y' }),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('MarketController — delegation & upstream failures', () => {
  it('delegates a valid search to the service', async () => {
    const { controller, service } = build();
    await controller.search({ kind: 'crypto', query: 'btc' });
    expect(service.search).toHaveBeenCalledWith('crypto', 'btc');
  });

  it('wraps an upstream failure as 500', async () => {
    const { controller } = build({
      quote: vi.fn(async () => {
        throw new Error('upstream down');
      }),
    });
    await expect(controller.quote({ kind: 'stock', symbol: 'AAPL' })).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
