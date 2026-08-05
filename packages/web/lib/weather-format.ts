import { useTranslations } from 'next-intl';
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  type LucideIcon,
} from 'lucide-react';

import type { WeatherUnits } from './dashboard-widgets';

/**
 * WMO weather-code presentation, shared by the dashboard weather widget and the landing
 * page's compact variant (Phase 82 Theme D, dashboard round 2).
 *
 * This used to be a `describe()` in `weather-widget.tsx` returning `{ icon, label }` with
 * the label as an English literal, imported by `landing-weather.tsx` — so the same
 * fourteen-ish English words rendered in both places with no route to a catalog. Splitting
 * it in two ({@link describeWeatherCode} for the code→bucket mapping,
 * {@link useWeatherCodeLabel} for the wording) keeps the buckets pure and testable while
 * giving both consumers one set of keys: `dashboard.weather.codes.<bucket>`.
 *
 * Note this is the one piece of weather copy the landing page *shares* with the widget
 * rather than duplicating under `dashboard.landing.*` — it's meteorological vocabulary
 * driven by one function, not page chrome, so there's nothing to tune independently.
 */
export type WeatherCodeBucket =
  | 'clear'
  | 'partlyCloudy'
  | 'overcast'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'rainShowers'
  | 'snowShowers'
  | 'thunderstorm';

/** The English original — the per-key fallback, exactly as the other registry seams do. */
const BUCKET_ENGLISH: Record<WeatherCodeBucket, string> = {
  clear: 'Clear',
  partlyCloudy: 'Partly cloudy',
  overcast: 'Overcast',
  fog: 'Fog',
  drizzle: 'Drizzle',
  rain: 'Rain',
  snow: 'Snow',
  rainShowers: 'Rain showers',
  snowShowers: 'Snow showers',
  thunderstorm: 'Thunderstorm',
};

/** Buckets cover Open-Meteo's full WMO code range. */
export function describeWeatherCode(code: number): { icon: LucideIcon; bucket: WeatherCodeBucket } {
  if (code === 0) return { icon: Sun, bucket: 'clear' };
  if (code <= 2) return { icon: CloudSun, bucket: 'partlyCloudy' };
  if (code === 3) return { icon: Cloud, bucket: 'overcast' };
  if (code <= 48) return { icon: CloudFog, bucket: 'fog' };
  if (code <= 57) return { icon: CloudDrizzle, bucket: 'drizzle' };
  if (code <= 67) return { icon: CloudRain, bucket: 'rain' };
  if (code <= 77) return { icon: CloudSnow, bucket: 'snow' };
  if (code <= 82) return { icon: CloudRain, bucket: 'rainShowers' };
  if (code <= 86) return { icon: CloudSnow, bucket: 'snowShowers' };
  return { icon: CloudLightning, bucket: 'thunderstorm' };
}

export function useWeatherCodeLabel(): (bucket: WeatherCodeBucket) => string {
  const t = useTranslations('dashboard');
  return (bucket) => {
    const key = `weather.codes.${bucket}`;
    return t.has(key) ? t(key) : BUCKET_ENGLISH[bucket];
  };
}

/**
 * Bare degrees — no unit letter. Used for the high/low range, where the unit is already
 * implied by the headline temperature and the °C/°F toggle. Not locale-formatted: these
 * are always small integers, so there is no grouping or decimal separator in play.
 */
export function deg(celsius: number, units: WeatherUnits): string {
  const value = units === 'f' ? celsius * 1.8 + 32 : celsius;
  return `${Math.round(value)}°`;
}

export function temp(celsius: number, units: WeatherUnits): string {
  return `${deg(celsius, units)}${units === 'f' ? 'F' : 'C'}`;
}
