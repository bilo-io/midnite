'use client';

import { useEffect, useState } from 'react';
import { Droplets } from 'lucide-react';
import type { WeatherResponse } from '@midnite/shared';
import { getWeather } from '@/lib/api';
import type { WeatherLocation, WeatherUnits } from '@/lib/dashboard-widgets';
import { readSavedWeatherConfig } from '@/lib/saved-weather-location';
import { usePolling } from '@/lib/use-polling';
import { describe, deg, temp } from '@/components/weather-widget';

const REFRESH_MS = 10 * 60_000;
/** Caches a one-time geolocation lookup so the landing page never re-prompts. */
const LANDING_COORDS_KEY = 'midnite.landing.weatherCoords';

function readCachedCoords(): WeatherLocation | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LANDING_COORDS_KEY);
    if (!raw) return null;
    const v: unknown = JSON.parse(raw);
    if (v && typeof v === 'object' && 'lat' in v && 'lon' in v) {
      const { lat, lon } = v as { lat: unknown; lon: unknown };
      if (typeof lat === 'number' && typeof lon === 'number') return { lat, lon };
    }
  } catch {
    // ignore malformed storage
  }
  return null;
}

/**
 * The landing-page corner weather (top-left). It reuses the location the user
 * already configured on their dashboard weather widget — so it never prompts.
 * If no location is saved it tries the browser's geolocation once (silently,
 * caching the result); if that's unavailable or denied, the widget stays hidden
 * rather than nagging. Full detail on ≥sm; icon + temperature only on mobile,
 * where it shares the top row with the header-actions cluster.
 */
export function LandingWeather() {
  const [coords, setCoords] = useState<WeatherLocation | null>(null);
  const [units, setUnits] = useState<WeatherUnits>('c');

  // Resolve a location without ever showing a manual-entry prompt.
  useEffect(() => {
    const saved = readSavedWeatherConfig();
    setUnits(saved.units);
    if (saved.location) {
      setCoords(saved.location);
      return;
    }
    const cached = readCachedCoords();
    if (cached) {
      setCoords(cached);
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        try {
          localStorage.setItem(LANDING_COORDS_KEY, JSON.stringify(c));
        } catch {
          // best-effort cache; ignore write failures
        }
        setCoords(c);
      },
      () => {
        /* denied/unavailable → stay hidden */
      },
      { timeout: 8000 },
    );
  }, []);

  const { data } = usePolling<WeatherResponse | null>(
    async () => (coords ? getWeather(coords.lat, coords.lon) : null),
    REFRESH_MS,
    [coords?.lat, coords?.lon],
  );

  // Hidden until we have both a location and a first reading — no location means
  // no prompt and no empty shell in the corner.
  if (!coords || !data) return null;

  const { icon: Icon, label } = describe(data.current.weatherCode);
  const headline = temp(data.current.temperatureC, units);

  return (
    <div
      className="absolute left-6 top-6 z-10 flex items-center gap-2 text-left"
      aria-label={`Weather: ${label}, ${headline}`}
    >
      <Icon className="h-6 w-6 shrink-0 text-muted-foreground sm:h-7 sm:w-7" aria-hidden />
      <div className="leading-tight">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-semibold tabular-nums text-foreground sm:text-2xl">
            {headline}
          </span>
          <span className="hidden text-sm text-muted-foreground sm:inline">{label}</span>
        </div>
        <div className="mt-0.5 hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
          <span className="tabular-nums">
            {deg(data.today.lowC, units)} – {deg(data.today.highC, units)}
          </span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Droplets className="h-3 w-3" aria-label="Chance of precipitation" />
            {data.today.precipitationProbability}%
          </span>
        </div>
      </div>
    </div>
  );
}
