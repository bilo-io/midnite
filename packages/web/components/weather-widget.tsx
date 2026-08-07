'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CloudSun, Droplets, MapPin, Search } from 'lucide-react';
import type { WeatherGeocodeResult, WeatherResponse } from '@midnite/shared';
import { geocodePlace, getWeather, locateByIp } from '@/lib/api';
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

/**
 * Why auto-detection failed, so the fallback UI can say something better than
 * "location unavailable". `denied` is the user's own choice and worth naming;
 * `unavailable` covers the environments where the browser API simply can't
 * answer — the packaged desktop app (Electron ships no geolocation API key) and
 * any insecure-context origin, where `navigator.geolocation` is missing.
 */
type LocationFailure = 'denied' | 'unavailable';

/** Browser geolocation as a promise. Resolves null rather than throwing on denial. */
function askBrowser(): Promise<{ coords: WeatherLocation | null; denied: boolean }> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve({ coords: null, denied: false });
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ coords: { lat: pos.coords.latitude, lon: pos.coords.longitude }, denied: false }),
      // code 1 is PERMISSION_DENIED; 2/3 are "couldn't work it out" / timeout.
      (err) => resolve({ coords: null, denied: err.code === 1 }),
      { timeout: 8000 },
    );
  });
}

export function WeatherWidget({ config, onConfigChange }: WeatherWidgetProps) {
  const t = useTranslations('dashboard');
  const widgetLabels = useWidgetLabels();
  const { units, location } = config;
  const [coords, setCoords] = useState<WeatherLocation | null>(location);
  const [failure, setFailure] = useState<LocationFailure | null>(null);

  // Resolve a location without asking the user for anything: a saved place wins,
  // then the browser, then a coarse IP lookup through the gateway. Only when all
  // three come up empty does the widget fall back to a place search.
  useEffect(() => {
    if (location) {
      setCoords(location);
      setFailure(null);
      return;
    }

    let cancelled = false;
    setFailure(null);
    void (async () => {
      const { coords: browserCoords, denied } = await askBrowser();
      if (cancelled) return;
      if (browserCoords) {
        setCoords(browserCoords);
        return;
      }
      try {
        const ipLocation = await locateByIp();
        if (cancelled) return;
        setCoords({ lat: ipLocation.lat, lon: ipLocation.lon, ...(ipLocation.label ? { label: ipLocation.label } : {}) });
      } catch {
        // Both automatic paths are out — hand over to the place search.
        if (!cancelled) setFailure(denied ? 'denied' : 'unavailable');
      }
    })();

    return () => {
      cancelled = true;
    };
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
        {failure && !coords ? (
          <PlaceSearch reason={failure} onPick={(loc) => onConfigChange({ ...config, location: loc })} />
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

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Last resort when neither the browser nor the IP lookup could place the user.
 * Asks for a place name rather than coordinates — nobody knows their latitude,
 * which is exactly the tedium reported in bilo-io/midnite-app#2.
 */
function PlaceSearch({ reason, onPick }: { reason: LocationFailure; onPick: (loc: WeatherLocation) => void }) {
  const t = useTranslations('dashboard');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WeatherGeocodeResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  const trimmed = query.trim();
  useEffect(() => {
    if (!trimmed) {
      setResults(null);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      void geocodePlace(trimmed)
        .then((hits) => {
          if (!cancelled) setResults(hits);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed]);

  return (
    <div className="flex h-full flex-col gap-2 p-4">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        {reason === 'denied' ? t('weather.locationDenied') : t('weather.locationUnavailable')}
      </p>
      <div className="flex items-center gap-1.5 rounded-md border border-border/60 px-2 focus-within:ring-1 focus-within:ring-ring">
        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('weather.searchPlaceholder')}
          aria-label={t('weather.searchLabel')}
          className="min-w-0 flex-1 bg-transparent py-1 text-xs focus-visible:outline-none"
        />
      </div>
      {trimmed &&
        (results === null || searching ? (
          <p className="px-1 text-[11px] text-muted-foreground">{t('weather.searching')}</p>
        ) : results.length === 0 ? (
          <p className="px-1 text-[11px] text-muted-foreground">{t('weather.noMatches')}</p>
        ) : (
          <div
            role="listbox"
            aria-label={t('weather.searchResults')}
            className="min-h-0 flex-1 overflow-y-auto"
          >
            {results.map((hit) => (
              <button
                key={hit.id}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => onPick({ lat: hit.lat, lon: hit.lon, label: hit.label })}
                className="block w-full rounded px-1 py-1 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {hit.label}
              </button>
            ))}
          </div>
        ))}
    </div>
  );
}
