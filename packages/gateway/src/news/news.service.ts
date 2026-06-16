import { Injectable, Logger } from '@nestjs/common';
import { NEWS_MAX_COUNT, type HackerNewsStory } from '@midnite/shared';

const HN_BASE = 'https://hacker-news.firebaseio.com/v0';
const FETCH_TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 60_000;

interface RawHnItem {
  id: number;
  title?: string;
  url?: string;
  score?: number;
  by?: string;
  descendants?: number;
  time?: number;
  type?: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${url} → ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);
  private cache: { stories: HackerNewsStory[]; at: number } | null = null;

  /**
   * Top Hacker News stories, capped at {@link NEWS_MAX_COUNT}. The full top set is
   * fetched once and cached for {@link CACHE_TTL_MS}; callers slice off `count`.
   */
  async topStories(count: number): Promise<HackerNewsStory[]> {
    const stories = await this.loadTop();
    return stories.slice(0, count);
  }

  private async loadTop(): Promise<HackerNewsStory[]> {
    const now = Date.now();
    if (this.cache && now - this.cache.at < CACHE_TTL_MS) return this.cache.stories;

    try {
      const ids = await fetchJson<number[]>(`${HN_BASE}/topstories.json`);
      const items = await Promise.all(
        ids.slice(0, NEWS_MAX_COUNT).map((id) => fetchJson<RawHnItem | null>(`${HN_BASE}/item/${id}.json`)),
      );
      const stories = items
        .filter((it): it is RawHnItem => it !== null && typeof it.title === 'string')
        .map((it) => ({
          id: it.id,
          title: it.title as string,
          url: it.url,
          score: it.score ?? 0,
          by: it.by ?? 'unknown',
          comments: it.descendants ?? 0,
          time: it.time ?? 0,
        }));
      this.cache = { stories, at: now };
      return stories;
    } catch (err) {
      // Serve a stale cache rather than failing the widget when HN hiccups.
      if (this.cache) {
        this.logger.warn(`Hacker News fetch failed, serving stale cache: ${String(err)}`);
        return this.cache.stories;
      }
      throw new Error('failed to fetch Hacker News stories', { cause: err });
    }
  }
}
