'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  MapPin,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import type { WeatherResponse } from '@midnite/shared';
import { getWeather } from '@/lib/api';
import type { WeatherLocation, WeatherUnits, WidgetConfig } from '@/lib/dashboard-widgets';
import { usePolling } from '@/lib/use-polling';
import { cn } from '@/lib/utils';
import { WidgetLoader } from './spinner';
import { WidgetCard } from './widget-card';

const REFRESH_MS = 10 * 60_000;
const COMPACT_HEIGHT = 150;

type WeatherWidgetProps = {
  config: WidgetConfig['weather'];
  onConfigChange: (config: WidgetConfig['weather']) => void;
};

// WMO weather codes → icon + label. Buckets cover Open-Meteo's full code range.
function describe(code: number): { icon: LucideIcon; label: string } {
  if (code === 0) return { icon: Sun, label: 'Clear' };
  if (code <= 2) return { icon: CloudSun, label: 'Partly cloudy' };
  if (code === 3) return { icon: Cloud, label: 'Overcast' };
  if (code <= 48) return { icon: CloudFog, label: 'Fog' };
  if (code <= 57) return { icon: CloudDrizzle, label: 'Drizzle' };
  if (code <= 67) return { icon: CloudRain, label: 'Rain' };
  if (code <= 77) return { icon: CloudSnow, label: 'Snow' };
  if (code <= 82) return { icon: CloudRain, label: 'Rain showers' };
  if (code <= 86) return { icon: CloudSnow, label: 'Snow showers' };
  return { icon: CloudLightning, label: 'Thunderstorm' };
}

function temp(celsius: number, units: WeatherUnits): string {
  const value = units === 'f' ? celsius * 1.8 + 32 : celsius;
  return `${Math.round(value)}°${units === 'f' ? 'F' : 'C'}`;
}

export function WeatherWidget({ config, onConfigChange }: WeatherWidgetProps) {
  const { units, location } = config;
  const [coords, setCoords] = useState<WeatherLocation | null>(location);
  const [needsManual, setNeedsManual] = useState(false);

  // Resolve location: a saved manual location wins; otherwise ask the browser.
  useEffect(() => {
    if (location) {
      setCoords(location);
      setNeedsManual(false);
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setNeedsManual(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setNeedsManual(true),
      { timeout: 8000 },
    );
  }, [location]);

  const { data, error } = usePolling<WeatherResponse | null>(
    async () => (coords ? getWeather(coords.lat, coords.lon) : null),
    REFRESH_MS,
    [coords?.lat, coords?.lon],
  );

  // Collapse to a single row when the panel is short.
  const bodyRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const el = bodyRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => setCompact((entry?.contentRect.height ?? 999) < COMPACT_HEIGHT));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const setUnits = (u: WeatherUnits) => onConfigChange({ ...config, units: u });

  return (
    <WidgetCard
      title={location?.label ?? 'Weather'}
      icon={CloudSun}
      actions={
        <div className="flex items-center rounded-md border border-border/60 p-0.5 text-[10px]">
          {(['c', 'f'] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUnits(u)}
              className={cn(
                'rounded px-1.5 py-0.5 uppercase transition-colors',
                units === u ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
              aria-pressed={units === u}
            >
              °{u}
            </button>
          ))}
        </div>
      }
    >
      <div ref={bodyRef} className="h-full">
        {needsManual && !coords ? (
          <ManualLocationForm onSave={(loc) => onConfigChange({ ...config, location: loc })} />
        ) : error && !data ? (
          <p className="px-4 py-6 text-center text-sm text-destructive">Couldn’t load weather.</p>
        ) : !data ? (
          <WidgetLoader />
        ) : (
          <WeatherReadout data={data} units={units} compact={compact} />
        )}
        {coords && location && (
          <button
            type="button"
            onClick={() => onConfigChange({ ...config, location: null })}
            className="block w-full px-4 pb-2 text-left text-[10px] text-muted-foreground hover:text-foreground"
          >
            Use my location instead
          </button>
        )}
      </div>
    </WidgetCard>
  );
}

function WeatherReadout({ data, units, compact }: { data: WeatherResponse; units: WeatherUnits; compact: boolean }) {
  const { icon: Icon, label } = describe(data.current.weatherCode);
  const today = describe(data.today.weatherCode);

  if (compact) {
    return (
      <div className="flex h-full items-center justify-between gap-2 px-4">
        <span className="flex items-center gap-1.5">
          <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
          <span className="text-xl font-semibold tabular-nums">{temp(data.current.temperatureC, units)}</span>
        </span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums">
            ↑{temp(data.today.highC, units)} ↓{temp(data.today.lowC, units)}
          </span>
          <span className="inline-flex items-center gap-0.5">
            <Droplets className="h-3 w-3" />
            {data.today.precipitationProbability}%
          </span>
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
      <Icon className="h-10 w-10 text-muted-foreground" aria-hidden />
      <span className="text-4xl font-semibold tabular-nums leading-none">{temp(data.current.temperatureC, units)}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="tabular-nums">High {temp(data.today.highC, units)}</span>
        <span className="tabular-nums">Low {temp(data.today.lowC, units)}</span>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Droplets className="h-3 w-3" />
        <span className="tabular-nums">{data.today.precipitationProbability}% precipitation</span>
        <span className="px-1">·</span>
        <today.icon className="h-3 w-3" />
        <span>{today.label}</span>
      </div>
    </div>
  );
}

function ManualLocationForm({ onSave }: { onSave: (loc: WeatherLocation) => void }) {
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [label, setLabel] = useState('');

  const submit = () => {
    const latN = Number(lat);
    const lonN = Number(lon);
    if (Number.isFinite(latN) && Number.isFinite(lonN) && latN >= -90 && latN <= 90 && lonN >= -180 && lonN <= 180) {
      onSave({ lat: latN, lon: lonN, label: label.trim() || undefined });
    }
  };

  return (
    <div className="flex h-full flex-col justify-center gap-2 p-4">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" />
        Location unavailable — enter coordinates.
      </p>
      <div className="flex gap-2">
        <input
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          placeholder="Latitude"
          inputMode="decimal"
          className="min-w-0 flex-1 rounded-md border border-border/60 bg-transparent px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <input
          value={lon}
          onChange={(e) => setLon(e.target.value)}
          placeholder="Longitude"
          inputMode="decimal"
          className="min-w-0 flex-1 rounded-md border border-border/60 bg-transparent px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label (optional)"
        className="rounded-md border border-border/60 bg-transparent px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      <button
        type="button"
        onClick={submit}
        className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Save location
      </button>
    </div>
  );
}
