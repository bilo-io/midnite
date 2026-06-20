import { Inject, Injectable } from '@nestjs/common';
import { eq, lt } from 'drizzle-orm';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { marketCache, type MarketCacheRow } from '../db/schema';

/**
 * Persistent store for the market proxy's read-through cache. The 30-min freshness
 * gate lives in {@link MarketService}; this repository only reads/writes rows.
 */
@Injectable()
export class MarketCacheRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  get(key: string): MarketCacheRow | undefined {
    return this.db.select().from(marketCache).where(eq(marketCache.key, key)).get();
  }

  put(key: string, payload: string, fetchedAt: string): void {
    this.db
      .insert(marketCache)
      .values({ key, payload, fetchedAt })
      .onConflictDoUpdate({ target: marketCache.key, set: { payload, fetchedAt } })
      .run();
  }

  /** Drop rows last fetched before `beforeIso` — bounds growth from distinct queries. */
  prune(beforeIso: string): void {
    this.db.delete(marketCache).where(lt(marketCache.fetchedAt, beforeIso)).run();
  }
}
