import { describe, expect, it, vi } from 'vitest';
import type { Digest } from '@midnite/shared';

import { DigestRepository } from './digest.repository';
import { DigestsService, DigestDoesNotExistError, toSummary } from './digests.service';
import type { DigestRow } from '../db/schema';

function digest(over: Partial<Digest> = {}): Digest {
  return {
    id: 'd1',
    createdAt: '2026-07-11T08:00:00.000Z',
    from: '2026-07-10T00:00:00.000Z',
    to: '2026-07-11T00:00:00.000Z',
    counts: { shipped: 3, failed: 1, needsAttention: 1 },
    sections: [{ name: 'midnite', shipped: 3, failed: 1 }],
    highlights: [{ taskId: 't9', title: 'Fix flake', outcome: 'abandoned', note: 'still flaky' }],
    headline: '3 shipped, 1 failed.',
    markdown: '# Fleet digest\n\n3 shipped.',
    ...over,
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
  } as DigestRow;
}

function make(rows: DigestRow[]) {
  const repo = {
    listRecent: vi.fn((limit: number) => rows.slice(0, limit)),
    getById: vi.fn((id: string) => rows.find((r) => r.id === id)),
    insert: vi.fn(),
  } as unknown as DigestRepository;
  return new DigestsService(repo);
}

describe('DigestsService', () => {
  it('lists lean summaries (no markdown/sections) newest-first', () => {
    const svc = make([row(digest({ id: 'a', headline: 'A' })), row(digest({ id: 'b', headline: 'B' }))]);
    const summaries = svc.listSummaries();
    expect(summaries.map((s) => s.id)).toEqual(['a', 'b']);
    expect(summaries[0]).toEqual({
      id: 'a',
      createdAt: '2026-07-11T08:00:00.000Z',
      from: '2026-07-10T00:00:00.000Z',
      to: '2026-07-11T00:00:00.000Z',
      counts: { shipped: 3, failed: 1, needsAttention: 1 },
      headline: 'A',
    });
    // Summaries never carry the heavy fields.
    expect(summaries[0] as Record<string, unknown>).not.toHaveProperty('markdown');
    expect(summaries[0] as Record<string, unknown>).not.toHaveProperty('sections');
  });

  it('caps the limit and skips corrupt rows', () => {
    const bad = { ...row(digest({ id: 'bad' })), digest: '{not json' } as DigestRow;
    const svc = make([row(digest({ id: 'ok' })), bad]);
    expect(svc.listSummaries().map((s) => s.id)).toEqual(['ok']);
  });

  it('returns the full digest by id', () => {
    const svc = make([row(digest({ id: 'x' }))]);
    expect(svc.getById('x').markdown).toContain('Fleet digest');
  });

  it('throws DigestDoesNotExistError for an unknown id', () => {
    const svc = make([]);
    expect(() => svc.getById('nope')).toThrow(DigestDoesNotExistError);
    expect(() => svc.exportMarkdown('nope')).toThrow(DigestDoesNotExistError);
  });

  it('serves the pre-rendered markdown for export', () => {
    const svc = make([row(digest({ id: 'x', markdown: '# Hi' }))]);
    expect(svc.exportMarkdown('x')).toBe('# Hi');
  });

  it('toSummary projects a full digest', () => {
    expect(toSummary(digest({ id: 'z' }))).toMatchObject({ id: 'z', headline: '3 shipped, 1 failed.' });
  });
});
