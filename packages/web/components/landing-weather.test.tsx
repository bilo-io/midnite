import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { WeatherResponse } from '@midnite/shared';
import { DASHBOARD_WIDGETS_STORAGE_KEY } from '@/lib/dashboard-widgets';
import { withQueryClient } from '@/lib/test-query-wrapper';

const getWeather = vi.fn<(lat: number, lon: number) => Promise<WeatherResponse>>();
vi.mock('@/lib/api', () => ({ getWeather: (lat: number, lon: number) => getWeather(lat, lon) }));

import { LandingWeather } from './landing-weather';

const WEATHER: WeatherResponse = {
  current: { temperatureC: 18, weatherCode: 2, precipitation: 0 },
  today: { highC: 22, lowC: 15, precipitationProbability: 10, weatherCode: 2 },
  resolvedAt: '2026-06-21T09:00:00.000Z',
};

function saveDashboardLocation() {
  localStorage.setItem(
    DASHBOARD_WIDGETS_STORAGE_KEY,
    JSON.stringify([
      { type: 'weather', config: { units: 'c', location: { lat: 51.5, lon: -0.12, label: 'London' } } },
    ]),
  );
}

afterEach(cleanup);
beforeEach(() => {
  localStorage.clear();
  getWeather.mockReset();
  // No geolocation available, so the only path to a reading is a saved location.
  Object.defineProperty(globalThis, 'navigator', {
    value: {},
    configurable: true,
  });
});

it('stays hidden when no location is saved and geolocation is unavailable', async () => {
  render(withQueryClient(<LandingWeather />));
  await waitFor(() => expect(getWeather).not.toHaveBeenCalled());
  expect(screen.queryByLabelText(/weather:/i)).toBeNull();
});

it('reuses the dashboard weather location and shows temp, condition, hi/lo + precip', async () => {
  saveDashboardLocation();
  getWeather.mockResolvedValue(WEATHER);

  render(withQueryClient(<LandingWeather />));

  expect(await screen.findByText('18°C')).toBeInTheDocument();
  expect(screen.getByText('Partly cloudy')).toBeInTheDocument();
  expect(screen.getByText(/15°\s*–\s*22°/)).toBeInTheDocument();
  expect(screen.getByText('10%')).toBeInTheDocument();
  expect(getWeather).toHaveBeenCalledWith(51.5, -0.12);
});
