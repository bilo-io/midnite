import { describe, expect, it } from 'vitest';
import type { Digest, DigestListItem } from '@midnite/shared';

import { DIGEST_TABLE_HEAD, digestLines, digestListRows, digestWindow } from './digest';

function digest(over: Partial<Digest> = {}): Digest {
  return {
    id: 'd1',
    createdAt: '2026-07-08T09:30:00.000Z',
    from: '2026-07-07T00:00:00.000Z',
    to: '2026-07-08T00:00:00.000Z',
    counts: { shipped: 3, failed: 1, needsAttention: 1 },
    sections: [{ name: 'midnite', shipped: 3, failed: 1 }],
    highlights: [{ taskId: 't9', title: 'Fix flake', outcome: 'abandoned', note: 'still flaky' }],
    spend: { totalUsd: 4.2, measuredUsd: 4.2, sessions: 5 },
    cycle: { tasks: 4, p50Ms: 120_000, p90Ms: 480_000 },
    headline: '3 shipped, 1 failed.',
    markdown: '# Fleet digest',
    ...over,
  };
}

describe('digestWindow', () => {
  it('renders a date-only range from ISO timestamps', () => {
    expect(digestWindow('2026-07-07T00:00:00.000Z', '2026-07-08T12:00:00.000Z')).toBe(
      '2026-07-07 → 2026-07-08',
    );
  });
});

describe('digestListRows', () => {
  it('maps feed items to string cells matching the head width', () => {
    const items: DigestListItem[] = [
      {
        id: 'd1',
        createdAt: '2026-07-08T09:30:00.000Z',
        from: '2026-07-07T00:00:00.000Z',
        to: '2026-07-08T00:00:00.000Z',
        headline: '3 shipped, 1 failed.',
        counts: { shipped: 3, failed: 1, needsAttention: 1 },
      },
    ];
    const rows = digestListRows(items);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveLength(DIGEST_TABLE_HEAD.length);
    expect(rows[0]).toEqual([
      'd1',
      '2026-07-08',
      '2026-07-07 → 2026-07-08',
      '3',
      '1',
      '1',
      '3 shipped, 1 failed.',
    ]);
  });
});

describe('digestLines', () => {
  it('renders headline, window, counts, sections, highlights, spend and cycle', () => {
    const lines = digestLines(digest());
    expect(lines[0]).toBe('3 shipped, 1 failed.');
    expect(lines).toContain('2026-07-07 → 2026-07-08');
    expect(lines).toContain('Counts: 3 shipped · 1 failed · 1 need attention');
    expect(lines).toContain('  • midnite: 3 shipped, 1 failed');
    expect(lines).toContain('  • abandoned — Fix flake (t9): still flaky');
    expect(lines).toContain('Spend: $4.20 total · $4.20 measured · 5 sessions');
    expect(lines).toContain('Cycle time: p50 2m 0s · p90 8m 0s (4 tasks)');
  });

  it('omits spend and cycle when the best-effort sources were unreachable (null)', () => {
    const lines = digestLines(digest({ spend: null, cycle: null }));
    expect(lines.some((l) => l.startsWith('Spend:'))).toBe(false);
    expect(lines.some((l) => l.startsWith('Cycle time:'))).toBe(false);
  });

  it('omits section and highlight blocks when empty', () => {
    const lines = digestLines(digest({ sections: [], highlights: [] }));
    expect(lines).not.toContain('Sections:');
    expect(lines).not.toContain('Highlights:');
  });

  it('renders a highlight without a note cleanly', () => {
    const lines = digestLines(
      digest({ highlights: [{ taskId: 't1', title: 'Ship it', outcome: 'done', note: '' }] }),
    );
    expect(lines).toContain('  • done — Ship it (t1)');
  });
});
