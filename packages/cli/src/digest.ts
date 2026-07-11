import type { Digest, DigestListItem } from '@midnite/shared';

import { formatMs } from './retro.js';

// Phase 62 H — pure render helpers for `midnite digest`. The command bodies in
// index.ts fetch `/digests` (+ `/digests/:id`) and paint these; keeping the
// shaping here makes it unit-testable without a gateway. Honesty carries over
// from the retro contract: best-effort spend/cycle degrade to `null`, and those
// lines are simply omitted when the source was unreachable — never invented.

/** A short window label from two ISO timestamps: `2026-07-01 → 2026-07-08`. */
export function digestWindow(from: string, to: string): string {
  return `${from.slice(0, 10)} → ${to.slice(0, 10)}`;
}

export const DIGEST_TABLE_HEAD = [
  'ID',
  'Created',
  'Window',
  'Shipped',
  'Failed',
  'Attention',
  'Headline',
];

/** Table rows for the digest feed — one per digest (already most-recent-first). */
export function digestListRows(items: DigestListItem[]): string[][] {
  return items.map((d) => [
    d.id,
    d.createdAt.slice(0, 10),
    digestWindow(d.from, d.to),
    String(d.counts.shipped),
    String(d.counts.failed),
    String(d.counts.needsAttention),
    d.headline,
  ]);
}

/**
 * The full render as an ordered list of lines (no colour — the caller paints).
 * Sections: headline, window, counts, per-repo/project sections, highlights, and
 * the best-effort spend + cycle-time lines (omitted when their source was
 * unreachable). The rendered markdown is left to `--export`.
 */
export function digestLines(d: Digest): string[] {
  const c = d.counts;
  const lines: string[] = [
    d.headline,
    '',
    digestWindow(d.from, d.to),
    '',
    `Counts: ${c.shipped} shipped · ${c.failed} failed · ${c.needsAttention} need attention`,
  ];

  if (d.sections.length > 0) {
    lines.push('', 'Sections:');
    for (const s of d.sections) {
      lines.push(`  • ${s.name}: ${s.shipped} shipped, ${s.failed} failed`);
    }
  }

  if (d.highlights.length > 0) {
    lines.push('', 'Highlights:');
    for (const h of d.highlights) {
      lines.push(`  • ${h.outcome} — ${h.title} (${h.taskId})${h.note ? `: ${h.note}` : ''}`);
    }
  }

  if (d.spend) {
    lines.push(
      '',
      `Spend: $${d.spend.totalUsd.toFixed(2)} total · $${d.spend.measuredUsd.toFixed(
        2,
      )} measured · ${d.spend.sessions} sessions`,
    );
  }

  if (d.cycle) {
    lines.push(
      '',
      `Cycle time: p50 ${formatMs(d.cycle.p50Ms)} · p90 ${formatMs(d.cycle.p90Ms)} (${
        d.cycle.tasks
      } tasks)`,
    );
  }

  return lines;
}
