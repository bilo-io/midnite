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

const IP_HIT = {
  success: true,
  ip: '203.0.113.7',
  city: 'Berlin',
  region: 'Berlin',
  country: 'Germany',
  latitude: 52.52,
  longitude: 13.405,
};

describe('WeatherService.locate', () => {
  it('geo-locates the supplied public client IP', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(IP_HIT), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const service = new WeatherService();
    const loc = await service.locate('203.0.113.7');

    expect(loc).toEqual({ lat: 52.52, lon: 13.405, label: 'Berlin, Germany' });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('203.0.113.7');
  });

  // The desktop / `midnite serve` case: no routable client IP, so the provider is
  // asked to locate the caller — which is the gateway's own egress IP, i.e. the
  // user's network.
  it('falls back to the gateway egress IP when no client IP is routable', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(IP_HIT), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const service = new WeatherService();
    const loc = await service.locate(null);

    expect(loc).toEqual({ lat: 52.52, lon: 13.405, label: 'Berlin, Germany' });
    // No IP in the path — the provider resolves whoever is calling it.
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain('203.0.113.7');
  });

  it('caches per IP key so repeated widget mounts hit the provider once', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(IP_HIT), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const service = new WeatherService();
    await service.locate('203.0.113.7');
    await service.locate('203.0.113.7');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('labels with the city alone when the provider gives no country', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ ...IP_HIT, country: '' }), { status: 200 })),
    );

    const service = new WeatherService();
    await expect(service.locate('203.0.113.7')).resolves.toMatchObject({ label: 'Berlin' });
  });

  it('returns a null label when the provider names no place', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ ...IP_HIT, city: '', region: '', country: '' }), { status: 200 })),
    );

    const service = new WeatherService();
    await expect(service.locate('203.0.113.7')).resolves.toMatchObject({ label: null });
  });

  it('throws when the provider reports failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ success: false, message: 'reserved range' }), { status: 200 })),
    );

    const service = new WeatherService();
    await expect(service.locate(null)).rejects.toThrow('failed to resolve location');
  });

  it('throws when the provider returns no coordinates', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ success: true, city: 'Nowhere' }), { status: 200 })),
    );

    const service = new WeatherService();
    await expect(service.locate(null)).rejects.toThrow('failed to resolve location');
  });

  it('throws when the provider is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 503 })));

    const service = new WeatherService();
    await expect(service.locate(null)).rejects.toThrow('failed to resolve location');
  });
});

const GEO_HIT = {
  results: [
    {
      id: 2950159,
      name: 'Berlin',
      latitude: 52.52437,
      longitude: 13.41053,
      country: 'Germany',
      admin1: 'Berlin',
    },
    { id: 5083330, name: 'Berlin', latitude: 44.46852, longitude: -71.18508, country: 'United States' },
  ],
};

describe('WeatherService.geocode', () => {
  it('maps Open-Meteo geocoding hits to disambiguated labels', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(GEO_HIT), { status: 200 })));

    const service = new WeatherService();
    const { results } = await service.geocode('Berlin');

    expect(results).toEqual([
      { id: '2950159', name: 'Berlin', label: 'Berlin, Berlin, Germany', lat: 52.52437, lon: 13.41053 },
      { id: '5083330', name: 'Berlin', label: 'Berlin, United States', lat: 44.46852, lon: -71.18508 },
    ]);
  });

  it('returns an empty list when the place is unknown', async () => {
    // Open-Meteo omits `results` entirely rather than sending an empty array.
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })));

    const service = new WeatherService();
    await expect(service.geocode('zzzzzz')).resolves.toEqual({ results: [] });
  });

  it('caches per normalised query', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(GEO_HIT), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const service = new WeatherService();
    await service.geocode('Berlin');
    await service.geocode('  berlin  ');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws when the geocoder is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500 })));

    const service = new WeatherService();
    await expect(service.geocode('Berlin')).rejects.toThrow('failed to geocode place');
  });
});
