import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { WeatherResponse } from '@midnite/shared';
import type { WeatherService } from './weather.service';
import { WeatherController } from './weather.controller';

const fakeForecast = { current: {}, today: {}, resolvedAt: '' } as unknown as WeatherResponse;

function build(overrides: Partial<Record<keyof WeatherService, unknown>> = {}) {
  const service = {
    forecast: vi.fn(async () => fakeForecast),
    ...overrides,
  } as unknown as WeatherService;
  return { controller: new WeatherController(service), service };
}

describe('WeatherController', () => {
  it('rejects an out-of-range latitude (400)', async () => {
    const { controller } = build();
    await expect(controller.getWeather({ lat: 200, lon: 0 })).rejects.toThrow(BadRequestException);
  });

  it('delegates with the parsed coordinates', async () => {
    const { controller, service } = build();
    await controller.getWeather({ lat: 51.5, lon: -0.1 });
    expect(service.forecast).toHaveBeenCalledWith(51.5, -0.1);
  });

  it('wraps an upstream failure as 500', async () => {
    const { controller } = build({
      forecast: vi.fn(async () => {
        throw new Error('open-meteo down');
      }),
    });
    await expect(controller.getWeather({ lat: 0, lon: 0 })).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
