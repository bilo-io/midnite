import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { FastifyRequest } from 'fastify';
import type { WeatherLocateResponse, WeatherResponse } from '@midnite/shared';
import type { WeatherService } from './weather.service';
import { WeatherController } from './weather.controller';

const fakeForecast = { current: {}, today: {}, resolvedAt: '' } as unknown as WeatherResponse;
const fakeLocation: WeatherLocateResponse = { lat: 52.52, lon: 13.405, label: 'Berlin, Germany' };

function build(overrides: Partial<Record<keyof WeatherService, unknown>> = {}) {
  const service = {
    forecast: vi.fn(async () => fakeForecast),
    locate: vi.fn(async () => fakeLocation),
    geocode: vi.fn(async () => ({ results: [] })),
    ...overrides,
  } as unknown as WeatherService;
  return { controller: new WeatherController(service), service };
}

function req(headers: Record<string, string> = {}, remoteAddress = '127.0.0.1'): FastifyRequest {
  return { headers, socket: { remoteAddress } } as unknown as FastifyRequest;
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

describe('WeatherController.locate', () => {
  it('passes null when the caller is loopback, so the service uses the egress IP', async () => {
    const { controller, service } = build();
    await expect(controller.locate(req())).resolves.toEqual(fakeLocation);
    expect(service.locate).toHaveBeenCalledWith(null);
  });

  it('passes the forwarded public client IP when the gateway is hosted behind a proxy', async () => {
    const { controller, service } = build();
    await controller.locate(req({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }, '10.0.0.1'));
    expect(service.locate).toHaveBeenCalledWith('203.0.113.7');
  });

  it('wraps a provider failure as 500', async () => {
    const { controller } = build({
      locate: vi.fn(async () => {
        throw new Error('ipwho.is down');
      }),
    });
    await expect(controller.locate(req())).rejects.toThrow(InternalServerErrorException);
  });
});

describe('WeatherController.geocode', () => {
  it('rejects an empty query (400)', async () => {
    const { controller } = build();
    await expect(controller.geocode({ q: '  ' })).rejects.toThrow(BadRequestException);
  });

  it('delegates the trimmed query', async () => {
    const { controller, service } = build();
    await controller.geocode({ q: ' Berlin ' });
    expect(service.geocode).toHaveBeenCalledWith('Berlin');
  });

  it('wraps a geocoder failure as 500', async () => {
    const { controller } = build({
      geocode: vi.fn(async () => {
        throw new Error('geocoder down');
      }),
    });
    await expect(controller.geocode({ q: 'Berlin' })).rejects.toThrow(InternalServerErrorException);
  });
});
