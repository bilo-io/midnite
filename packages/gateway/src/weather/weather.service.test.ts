import { afterEach, describe, expect, it, vi } from 'vitest';
import { WeatherService } from './weather.service';

const SAMPLE = {
  current: { temperature_2m: 14.2, precipitation: 0.3, weather_code: 61 },
  daily: {
    temperature_2m_max: [17.5],
    temperature_2m_min: [9.1],
    precipitation_probability_max: [80],
    weather_code: [63],
  },
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('WeatherService', () => {
  it('maps Open-Meteo current + daily fields', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(SAMPLE), { status: 200 })));

    const service = new WeatherService();
    const data = await service.forecast(51.5, -0.13);

    expect(data.current).toEqual({ temperatureC: 14.2, weatherCode: 61, precipitation: 0.3 });
    expect(data.today).toEqual({ highC: 17.5, lowC: 9.1, precipitationProbability: 80, weatherCode: 63 });
    expect(typeof data.resolvedAt).toBe('string');
  });

  it('caches per rounded coordinate', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(SAMPLE), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const service = new WeatherService();
    await service.forecast(51.501, -0.131);
    await service.forecast(51.503, -0.129); // rounds to the same 2dp key

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws when upstream fails and no cache exists', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500 })));

    const service = new WeatherService();
    await expect(service.forecast(0, 0)).rejects.toThrow('failed to fetch weather');
  });
});
