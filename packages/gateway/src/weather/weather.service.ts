import { Injectable, Logger } from '@nestjs/common';
import type { WeatherResponse } from '@midnite/shared';

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';
const FETCH_TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 10 * 60_000;

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

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly cache = new Map<string, { data: WeatherResponse; at: number }>();

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
