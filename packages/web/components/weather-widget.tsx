'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CloudSun, Droplets, MapPin } from 'lucide-react';
import type { WeatherResponse } from '@midnite/shared';
import { getWeather } from '@/lib/api';
import { useWidgetLabels } from '@/lib/dashboard-widget-labels';
import type { WeatherLocation, WeatherUnits, WidgetConfig } from '@/lib/dashboard-widgets';
import { usePolling } from '@/lib/use-polling';
import { cn } from '@/lib/utils';
import { deg, describeWeatherCode, temp, useWeatherCodeLabel } from '@/lib/weather-format';
import { WidgetLoader } from './spinner';
import { WidgetCard } from './widget-card';

const REFRESH_MS = 10 * 60_000;
const COMPACT_HEIGHT = 150;

type WeatherWidgetProps = {
  config: WidgetConfig['weather'];
  onConfigChange: (config: WidgetConfig['weather']) => void;
};

export function WeatherWidget({ config, onConfigChange }: WeatherWidgetProps) {
  const t = useTranslations('dashboard');
  const widgetLabels = useWidgetLabels();
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
      title={location?.label ?? widgetLabels.label('weather')}
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
          <p className="px-4 py-6 text-center text-sm text-destructive">{t('weather.error')}</p>
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
            {t('weather.useMyLocation')}
          </button>
        )}
      </div>
    </WidgetCard>
  );
}

function WeatherReadout({ data, units, compact }: { data: WeatherResponse; units: WeatherUnits; compact: boolean }) {
  const t = useTranslations('dashboard');
  const codeLabel = useWeatherCodeLabel();
  const { icon: Icon, bucket } = describeWeatherCode(data.current.weatherCode);

  // Shared low–high range and precipitation chance: terse, icon-led, no prose.
  const range = (
    <span className="tabular-nums">
      {deg(data.today.lowC, units)} – {deg(data.today.highC, units)}
    </span>
  );
  const precip = (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <Droplets className="h-3 w-3" aria-label={t('weather.precipitation')} />
      {data.today.precipitationProbability}%
    </span>
  );

  if (compact) {
    return (
      <div className="flex h-full items-center justify-between gap-2 px-4">
        <span className="flex items-center gap-1.5">
          <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
          <span className="text-xl font-semibold tabular-nums">{temp(data.current.temperatureC, units)}</span>
        </span>
        <span className="flex items-center gap-2.5 text-xs text-muted-foreground">
          {range}
          {precip}
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-8 w-8" aria-hidden />
        <span className="text-base font-medium">{codeLabel(bucket)}</span>
      </span>
      <span className="text-4xl font-semibold tabular-nums leading-none">{temp(data.current.temperatureC, units)}</span>
      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
        {range}
        <span aria-hidden>·</span>
        {precip}
      </div>
    </div>
  );
}

function ManualLocationForm({ onSave }: { onSave: (loc: WeatherLocation) => void }) {
  const t = useTranslations('dashboard');
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
        {t('weather.locationUnavailable')}
      </p>
      <div className="flex gap-2">
        <input
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          placeholder={t('weather.latitude')}
          inputMode="decimal"
          className="min-w-0 flex-1 rounded-md border border-border/60 bg-transparent px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <input
          value={lon}
          onChange={(e) => setLon(e.target.value)}
          placeholder={t('weather.longitude')}
          inputMode="decimal"
          className="min-w-0 flex-1 rounded-md border border-border/60 bg-transparent px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder={t('weather.labelOptional')}
        className="rounded-md border border-border/60 bg-transparent px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      <button
        type="button"
        onClick={submit}
        className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        {t('weather.saveLocation')}
      </button>
    </div>
  );
}
