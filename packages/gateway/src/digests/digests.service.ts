import { Inject, Injectable } from '@nestjs/common';
import {
  DigestSchema,
  type Digest,
  type DigestListItem,
} from '@midnite/shared';

import { type DigestRow } from '../db/schema';
import { DigestRepository } from './digest.repository';

/** How many digests the feed lists by default / at most. Digests are low-volume
 *  (one per cadence), so a flat recent list needs no pagination. */
export const DEFAULT_DIGEST_LIST_LIMIT = 30;
export const MAX_DIGEST_LIST_LIMIT = 100;
/** Upper bound for the backfill read — far above any realistic digest count. */
const BACKFILL_LIMIT = 10_000;

/** Decode a stored row's structured JSON into the shared {@link Digest}. */
function parseDigest(row: DigestRow): Digest {
  return DigestSchema.parse(JSON.parse(row.digest));
}

/** Project a full digest down to the lightweight feed row. */
function toListItem(d: Digest): DigestListItem {
  return { id: d.id, createdAt: d.createdAt, from: d.from, to: d.to, headline: d.headline, counts: d.counts };
}

/**
 * Phase 62 G — the read layer over stored fleet digests. The `DigestBuilder`
 * (Theme C) writes rows; this service reads them back for the web feed, the
 * dashboard widget, markdown export, and the search backfill. Thin: parse the
 * stored JSON into the shared contract, no re-aggregation.
 */
@Injectable()
export class DigestsService {
  constructor(@Inject(DigestRepository) private readonly repo: DigestRepository) {}

  /** Recent digests as lightweight feed rows, most-recent-first. */
  list(limit = DEFAULT_DIGEST_LIST_LIMIT): DigestListItem[] {
    const n = Math.min(MAX_DIGEST_LIST_LIMIT, Math.max(1, limit));
    return this.repo.listRecent(n).map((row) => toListItem(parseDigest(row)));
  }

  /** A single full digest, or `undefined` when none has that id. */
  get(id: string): Digest | undefined {
    const row = this.repo.getById(id);
    return row ? parseDigest(row) : undefined;
  }

  /** The pre-rendered markdown for a digest (served verbatim by the export route). */
  getMarkdown(id: string): string | undefined {
    return this.repo.getById(id)?.markdown;
  }

  /** Every stored digest, most-recent-first — feeds the search index backfill. */
  listAll(): Digest[] {
    return this.repo.listRecent(BACKFILL_LIMIT).map(parseDigest);
  }
}
