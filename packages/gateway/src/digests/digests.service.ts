import { Inject, Injectable, Logger } from '@nestjs/common';
import { DigestSchema, type Digest, type DigestSummary } from '@midnite/shared';

import { DigestRepository } from './digest.repository';
import type { DigestRow } from '../db/schema';

/** Thrown when a digest id has no stored row. Controller maps to 404. */
export class DigestDoesNotExistError extends Error {
  constructor(id: string) {
    super(`digest ${id} does not exist`);
    this.name = 'DigestDoesNotExistError';
  }
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Read side of fleet digests (Phase 62 G). The digests are produced + stored by
 * the workflow `build-digest` executor (Theme C/E); this service reads them back
 * for the feed (lean summaries), the detail expand (the full {@link Digest}), and
 * the per-digest markdown export (served from the pre-rendered `markdown` column).
 * Global scope — digests carry no team (fleet-wide by design).
 */
@Injectable()
export class DigestsService {
  private readonly logger = new Logger(DigestsService.name);

  constructor(@Inject(DigestRepository) private readonly repo: DigestRepository) {}

  /** Recent digests as lean summaries, newest-first. */
  listSummaries(limit = DEFAULT_LIMIT): DigestSummary[] {
    const capped = Math.min(Math.max(1, limit), MAX_LIMIT);
    const out: DigestSummary[] = [];
    for (const row of this.repo.listRecent(capped)) {
      const digest = this.parse(row);
      if (digest) out.push(toSummary(digest));
    }
    return out;
  }

  /** Every recent digest as a full object (skipping corrupt rows) — for the search backfill. */
  listRecentFull(limit = 1000): Digest[] {
    const out: Digest[] = [];
    for (const row of this.repo.listRecent(limit)) {
      const digest = this.parse(row);
      if (digest) out.push(digest);
    }
    return out;
  }

  /** The full digest, or throw when unknown. */
  getById(id: string): Digest {
    const row = this.repo.getById(id);
    const digest = row && this.parse(row);
    if (!digest) throw new DigestDoesNotExistError(id);
    return digest;
  }

  /** The pre-rendered markdown body for a digest, or throw when unknown. */
  exportMarkdown(id: string): string {
    const row = this.repo.getById(id);
    if (!row) throw new DigestDoesNotExistError(id);
    // A stored digest always carries its rendered markdown; fall back to the
    // structured JSON's markdown field if the column was somehow empty.
    if (row.markdown) return row.markdown;
    return this.parse(row)?.markdown ?? '';
  }

  /** Parse + validate a stored row's structured JSON; null (logged) when corrupt. */
  private parse(row: DigestRow): Digest | null {
    try {
      const parsed = DigestSchema.safeParse(JSON.parse(row.digest));
      if (parsed.success) return parsed.data;
      this.logger.warn(`stored digest ${row.id} failed validation: ${parsed.error.message}`);
    } catch {
      this.logger.warn(`stored digest ${row.id} is not valid JSON — ignored`);
    }
    return null;
  }
}

/** Project a full digest down to the feed/widget summary. */
export function toSummary(d: Digest): DigestSummary {
  return { id: d.id, createdAt: d.createdAt, from: d.from, to: d.to, counts: d.counts, headline: d.headline };
}
