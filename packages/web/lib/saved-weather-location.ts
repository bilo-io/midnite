import {
  DASHBOARD_WIDGETS_STORAGE_KEY,
  type WeatherLocation,
  type WeatherUnits,
} from '@/lib/dashboard-widgets';

export type SavedWeatherConfig = {
  location: WeatherLocation | null;
  units: WeatherUnits;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function parseLocation(v: unknown): WeatherLocation | null {
  if (!isRecord(v)) return null;
  const { lat, lon, label } = v;
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;
  return { lat, lon, ...(typeof label === 'string' ? { label } : {}) };
}

/**
 * Read the dashboard weather widget's persisted config (location + units)
 * straight from localStorage, without pulling in the whole dashboard grid.
 *
 * The landing-page corner weather reuses this so it shows the same place the
 * user already configured on their dashboard — and never has to prompt for a
 * location of its own. Best-effort and defensive: any malformed/absent storage
 * yields `{ location: null, units: 'c' }`.
 */
export function readSavedWeatherConfig(): SavedWeatherConfig {
  const fallback: SavedWeatherConfig = { location: null, units: 'c' };
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(DASHBOARD_WIDGETS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    const weather = parsed.find(
      (w): w is Record<string, unknown> => isRecord(w) && w.type === 'weather',
    );
    const config = weather && isRecord(weather.config) ? weather.config : null;
    if (!config) return fallback;
    return {
      location: parseLocation(config.location),
      units: config.units === 'f' ? 'f' : 'c',
    };
  } catch {
    return fallback;
  }
}
