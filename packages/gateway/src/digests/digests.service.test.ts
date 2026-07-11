import { describe, expect, it } from 'vitest';
import type { Digest } from '@midnite/shared';

import type { DigestRow } from '../db/schema';
import { DigestRepository } from './digest.repository';
import { DigestsService } from './digests.service';

function digest(over: Partial<Digest> = {}): Digest {
  return {
    id: over.id ?? 'd1',
    createdAt: over.createdAt ?? '2026-07-10T08:00:00.000Z',
    from: over.from ?? '2026-07-09T00:00:00.000Z',
    to: over.to ?? '2026-07-10T00:00:00.000Z',
    counts: over.counts ?? { shipped: 3, failed: 1, needsAttention: 1 },
    sections: over.sections ?? [{ name: 'acme/api', shipped: 2, failed: 1 }],
    highlights: over.highlights ?? [
      { taskId: 't1', title: 'Ship it', outcome: 'done', note: 'landed clean' },
    ],
    spend: over.spend ?? { totalUsd: 1.5, measuredUsd: 1.2, sessions: 4 },
    cycle: over.cycle ?? { tasks: 4, p50Ms: 1000, p90Ms: 5000 },
    headline: over.headline ?? 'A quiet, productive day',
    markdown: over.markdown ?? '# Digest\n\nAll good.',
  };
}

function row(d: Digest): DigestRow {
  return {
    id: d.id,
    createdAt: d.createdAt,
    windowFrom: d.from,
    windowTo: d.to,
    digest: JSON.stringify(d),
    markdown: d.markdown,
  };
}

function makeService(rows: DigestRow[]): DigestsService {
  const repo = {
    listRecent: (limit: number) => rows.slice(0, limit),
    getById: (id: string) => rows.find((r) => r.id === id),
  } as unknown as DigestRepository;
  return new DigestsService(repo);
}

describe('DigestsService', () => {
  it('projects rows to lightweight list items (no markdown/sections/highlights)', () => {
    const svc = makeService([row(digest())]);
    const [item] = svc.list();
    expect(item).toEqual({
      id: 'd1',
      createdAt: '2026-07-10T08:00:00.000Z',
      from: '2026-07-09T00:00:00.000Z',
      to: '2026-07-10T00:00:00.000Z',
      headline: 'A quiet, productive day',
      counts: { shipped: 3, failed: 1, needsAttention: 1 },
    });
    expect(item).not.toHaveProperty('markdown');
  });

  it('clamps the list limit to the allowed range', () => {
    const rows = Array.from({ length: 150 }, (_, i) => row(digest({ id: `d${i}` })));
    const svc = makeService(rows);
    expect(svc.list(9999)).toHaveLength(100); // MAX
    expect(svc.list(0)).toHaveLength(1); // floored to >= 1
  });

  it('parses the full digest by id, or returns undefined', () => {
    const svc = makeService([row(digest())]);
    expect(svc.get('d1')?.headline).toBe('A quiet, productive day');
    expect(svc.get('d1')?.highlights[0]?.taskId).toBe('t1');
    expect(svc.get('missing')).toBeUndefined();
  });

  it('returns the stored markdown verbatim for export', () => {
    const svc = makeService([row(digest())]);
    expect(svc.getMarkdown('d1')).toBe('# Digest\n\nAll good.');
    expect(svc.getMarkdown('missing')).toBeUndefined();
  });

  it('listAll parses every row for the search backfill', () => {
    const svc = makeService([row(digest({ id: 'a' })), row(digest({ id: 'b' }))]);
    expect(svc.listAll().map((d) => d.id)).toEqual(['a', 'b']);
  });
});
