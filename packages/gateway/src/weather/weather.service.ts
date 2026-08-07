import { Injectable, Logger } from '@nestjs/common';
import type { WeatherGeocodeResponse, WeatherLocateResponse, WeatherResponse } from '@midnite/shared';

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';
const OPEN_METEO_GEOCODE = 'https://geocoding-api.open-meteo.com/v1/search';
/** Keyless IP geolocation. A bare `/` resolves whoever is calling — i.e. our egress IP. */
const IP_GEO_BASE = 'https://ipwho.is';
const FETCH_TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 10 * 60_000;
/** A network's IP-derived city doesn't move; a place name's coordinates never do. */
const LOCATION_CACHE_TTL_MS = 60 * 60_000;

interface RawForecast {
  current?: {
    temperature_2m?: number;
    precipitation?: number;
    weather_code?: number;
  };
  daily?: {
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
    weather_code?: number[];
  };
}

interface RawIpGeo {
  success?: boolean;
  message?: string;
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

interface RawGeocode {
  results?: {
    id?: number;
    name?: string;
    latitude?: number;
    longitude?: number;
    country?: string;
    admin1?: string;
  }[];
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly cache = new Map<string, { data: WeatherResponse; at: number }>();
  private readonly locateCache = new Map<string, { data: WeatherLocateResponse; at: number }>();
  private readonly geocodeCache = new Map<string, { data: WeatherGeocodeResponse; at: number }>();

  /** Current conditions + today's outlook for a coordinate, cached ~10 min per location. */
  async forecast(lat: number, lon: number): Promise<WeatherResponse> {
    // Round to ~1km so nearby requests share a cache entry.
    const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    const now = Date.now();
    const hit = this.cache.get(key);
    if (hit && now - hit.at < CACHE_TTL_MS) return hit.data;

    try {
      const params = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lon),
        current: 'temperature_2m,precipitation,weather_code',
        daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code',
        timezone: 'auto',
      });
      const res = await fetch(`${OPEN_METEO_BASE}?${params}`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`Open-Meteo → ${res.status} ${res.statusText}`);
      const raw = (await res.json()) as RawForecast;
      const data = this.map(raw, new Date(now).toISOString());
      this.cache.set(key, { data, at: now });
      return data;
    } catch (err) {
      if (hit) {
        this.logger.warn(`weather fetch failed, serving stale cache: ${String(err)}`);
        return hit.data;
      }
      throw new Error('failed to fetch weather', { cause: err });
    }
  }

  /**
   * Coarse location from an IP, for when the browser can't supply coordinates.
   *
   * `clientIp` is the caller's public IP when there is one (a hosted gateway);
   * pass `null` for the local-gateway case, where the provider is asked to
   * resolve *us* — our egress IP is on the user's own network.
   */
  async locate(clientIp: string | null): Promise<WeatherLocateResponse> {
    const key = clientIp ?? '@egress';
    const now = Date.now();
    const hit = this.locateCache.get(key);
    if (hit && now - hit.at < LOCATION_CACHE_TTL_MS) return hit.data;

    try {
      const res = await fetch(`${IP_GEO_BASE}/${clientIp ?? ''}`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`ipwho.is → ${res.status} ${res.statusText}`);
      const raw = (await res.json()) as RawIpGeo;
      if (raw.success === false) throw new Error(raw.message ?? 'provider reported failure');
      const { latitude: lat, longitude: lon } = raw;
      if (typeof lat !== 'number' || typeof lon !== 'number') throw new Error('provider returned no coordinates');

      const label = [raw.city, raw.country].filter((p): p is string => Boolean(p && p.trim())).join(', ');
      const data: WeatherLocateResponse = { lat, lon, label: label || null };
      this.locateCache.set(key, { data, at: now });
      return data;
    } catch (err) {
      throw new Error('failed to resolve location', { cause: err });
    }
  }

  /** Place name → coordinates, so the manual path is a city search, not a lat/lon form. */
  async geocode(query: string): Promise<WeatherGeocodeResponse> {
    const key = query.trim().toLowerCase();
    const now = Date.now();
    const hit = this.geocodeCache.get(key);
    if (hit && now - hit.at < LOCATION_CACHE_TTL_MS) return hit.data;

    try {
      const params = new URLSearchParams({ name: key, count: '5', format: 'json' });
      const res = await fetch(`${OPEN_METEO_GEOCODE}?${params}`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`Open-Meteo geocoding → ${res.status} ${res.statusText}`);
      const raw = (await res.json()) as RawGeocode;

      // Open-Meteo omits `results` entirely for a miss rather than sending [].
      const data: WeatherGeocodeResponse = {
        results: (raw.results ?? []).flatMap((r) => {
          const { id, name, latitude: lat, longitude: lon } = r;
          if (typeof id !== 'number' || !name || typeof lat !== 'number' || typeof lon !== 'number') return [];
          // "Berlin, Berlin, Germany" — enough to tell the duplicates apart.
          const label = [name, r.admin1, r.country].filter((p): p is string => Boolean(p && p.trim())).join(', ');
          return [{ id: String(id), name, label, lat, lon }];
        }),
      };
      this.geocodeCache.set(key, { data, at: now });
      return data;
    } catch (err) {
      throw new Error('failed to geocode place', { cause: err });
    }
  }

  private map(raw: RawForecast, resolvedAt: string): WeatherResponse {
    const current = raw.current ?? {};
    const daily = raw.daily ?? {};
    return {
      current: {
        temperatureC: current.temperature_2m ?? 0,
        weatherCode: current.weather_code ?? 0,
        precipitation: current.precipitation ?? 0,
      },
      today: {
        highC: daily.temperature_2m_max?.[0] ?? 0,
        lowC: daily.temperature_2m_min?.[0] ?? 0,
        precipitationProbability: daily.precipitation_probability_max?.[0] ?? 0,
        weatherCode: daily.weather_code?.[0] ?? current.weather_code ?? 0,
      },
      resolvedAt,
    };
  }
}
