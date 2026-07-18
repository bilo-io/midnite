import { afterEach, beforeEach, expect, it } from 'vitest';
import { DASHBOARD_WIDGETS_STORAGE_KEY } from '@/lib/dashboard-widgets';
import { readSavedWeatherConfig } from './saved-weather-location';

afterEach(() => localStorage.clear());
beforeEach(() => localStorage.clear());

function write(value: unknown) {
  localStorage.setItem(DASHBOARD_WIDGETS_STORAGE_KEY, JSON.stringify(value));
}

it('defaults to no location + celsius when nothing is stored', () => {
  expect(readSavedWeatherConfig()).toEqual({ location: null, units: 'c' });
});

it('reads the weather widget location + units from the dashboard config', () => {
  write([
    { type: 'clock', config: { mode: 'digital' } },
    { type: 'weather', config: { units: 'f', location: { lat: 40.7, lon: -74, label: 'NYC' } } },
  ]);
  expect(readSavedWeatherConfig()).toEqual({
    location: { lat: 40.7, lon: -74, label: 'NYC' },
    units: 'f',
  });
});

it('treats a null location as absent but still honours saved units', () => {
  write([{ type: 'weather', config: { units: 'f', location: null } }]);
  expect(readSavedWeatherConfig()).toEqual({ location: null, units: 'f' });
});

it('ignores a malformed location and unknown units', () => {
  write([{ type: 'weather', config: { units: 'x', location: { lat: 'nope' } } }]);
  expect(readSavedWeatherConfig()).toEqual({ location: null, units: 'c' });
});

it('survives non-array / malformed JSON without throwing', () => {
  localStorage.setItem(DASHBOARD_WIDGETS_STORAGE_KEY, '{ not json');
  expect(readSavedWeatherConfig()).toEqual({ location: null, units: 'c' });
});
