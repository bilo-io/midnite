import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithIntl as render } from '@/vitest.render-intl';
import type { WeatherGeocodeResult, WeatherLocateResponse, WeatherResponse } from '@midnite/shared';
import { withQueryClient } from '@/lib/test-query-wrapper';

const getWeather = vi.fn<(lat: number, lon: number) => Promise<WeatherResponse>>();
const locateByIp = vi.fn<() => Promise<WeatherLocateResponse>>();
const geocodePlace = vi.fn<(q: string) => Promise<WeatherGeocodeResult[]>>();

vi.mock('@/lib/api', () => ({
  getWeather: (lat: number, lon: number) => getWeather(lat, lon),
  locateByIp: () => locateByIp(),
  geocodePlace: (q: string) => geocodePlace(q),
}));

import { WeatherWidget } from './weather-widget';

const WEATHER: WeatherResponse = {
  current: { temperatureC: 18, weatherCode: 2, precipitation: 0 },
  today: { highC: 22, lowC: 15, precipitationProbability: 10, weatherCode: 2 },
  resolvedAt: '2026-06-21T09:00:00.000Z',
};

const CONFIG = { units: 'c', location: null } as const;

/** Replace `navigator` wholesale — jsdom has no geolocation and won't let us add one. */
function stubNavigator(geolocation?: unknown) {
  Object.defineProperty(globalThis, 'navigator', {
    value: geolocation === undefined ? {} : { geolocation },
    configurable: true,
  });
}

/** A geolocation whose getCurrentPosition always invokes the error callback. */
function failingGeolocation(code: number) {
  return {
    getCurrentPosition: (_ok: unknown, fail: (e: { code: number }) => void) => fail({ code }),
  };
}

function renderWidget() {
  return render(withQueryClient(<WeatherWidget config={{ ...CONFIG }} onConfigChange={vi.fn()} />));
}

afterEach(cleanup);
beforeEach(() => {
  getWeather.mockReset().mockResolvedValue(WEATHER);
  locateByIp.mockReset();
  geocodePlace.mockReset().mockResolvedValue([]);
});

describe('WeatherWidget location resolution', () => {
  it('uses browser coordinates when geolocation succeeds', async () => {
    stubNavigator({
      getCurrentPosition: (ok: (p: { coords: { latitude: number; longitude: number } }) => void) =>
        ok({ coords: { latitude: 51.5, longitude: -0.12 } }),
    });
    locateByIp.mockResolvedValue({ lat: 0, lon: 0, label: 'Nowhere' });

    renderWidget();

    await waitFor(() => expect(getWeather).toHaveBeenCalledWith(51.5, -0.12));
    // The browser answered, so the IP fallback is never consulted.
    expect(locateByIp).not.toHaveBeenCalled();
  });

  // The reported bug: the packaged desktop app (Electron ships no geolocation API
  // key) always lands in the error callback, which used to dead-end in a manual
  // lat/lon form. It must now fall through to the IP lookup and render weather.
  it('falls back to the IP lookup when geolocation is unavailable', async () => {
    stubNavigator(failingGeolocation(2 /* POSITION_UNAVAILABLE */));
    locateByIp.mockResolvedValue({ lat: 52.52, lon: 13.405, label: 'Berlin, Germany' });

    renderWidget();

    await waitFor(() => expect(getWeather).toHaveBeenCalledWith(52.52, 13.405));
    expect(await screen.findByText('18°C')).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('falls back to the IP lookup when the browser has no geolocation API at all', async () => {
    stubNavigator(); // insecure context — `navigator.geolocation` is absent
    locateByIp.mockResolvedValue({ lat: 52.52, lon: 13.405, label: 'Berlin, Germany' });

    renderWidget();

    await waitFor(() => expect(getWeather).toHaveBeenCalledWith(52.52, 13.405));
  });

  it('falls back to the IP lookup when the user denies the permission prompt', async () => {
    stubNavigator(failingGeolocation(1 /* PERMISSION_DENIED */));
    locateByIp.mockResolvedValue({ lat: 48.85, lon: 2.35, label: 'Paris, France' });

    renderWidget();

    await waitFor(() => expect(getWeather).toHaveBeenCalledWith(48.85, 2.35));
  });

  it('offers a place search — not a coordinate form — when every automatic path fails', async () => {
    stubNavigator(failingGeolocation(2));
    locateByIp.mockRejectedValue(new Error('provider down'));

    renderWidget();

    expect(await screen.findByRole('searchbox')).toBeInTheDocument();
    // The old manual form asked for raw numbers; it must be gone.
    expect(screen.queryByPlaceholderText('Latitude')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Longitude')).not.toBeInTheDocument();
  });

  it('names the reason it could not locate the user', async () => {
    stubNavigator(failingGeolocation(1 /* PERMISSION_DENIED */));
    locateByIp.mockRejectedValue(new Error('provider down'));

    renderWidget();

    // Denied is a different story from "couldn't work it out" — say which.
    expect(await screen.findByText(/permission/i)).toBeInTheDocument();
  });
});

describe('WeatherWidget place search', () => {
  it('saves the coordinates of the place the user picks', async () => {
    stubNavigator(failingGeolocation(2));
    locateByIp.mockRejectedValue(new Error('provider down'));
    geocodePlace.mockResolvedValue([
      { id: '2950159', name: 'Berlin', label: 'Berlin, Berlin, Germany', lat: 52.52, lon: 13.405 },
    ]);
    const onConfigChange = vi.fn();

    render(withQueryClient(<WeatherWidget config={{ ...CONFIG }} onConfigChange={onConfigChange} />));

    const box = await screen.findByRole('searchbox');
    fireEvent.change(box, { target: { value: 'Berlin' } });

    const hit = await screen.findByRole('option', { name: 'Berlin, Berlin, Germany' });
    fireEvent.click(hit);

    expect(onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({ location: { lat: 52.52, lon: 13.405, label: 'Berlin, Berlin, Germany' } }),
    );
  });

  it('tells the user when a place has no matches', async () => {
    stubNavigator(failingGeolocation(2));
    locateByIp.mockRejectedValue(new Error('provider down'));
    geocodePlace.mockResolvedValue([]);

    renderWidget();

    const box = await screen.findByRole('searchbox');
    fireEvent.change(box, { target: { value: 'zzzzzz' } });

    expect(await screen.findByText(/no matches/i)).toBeInTheDocument();
  });
});
