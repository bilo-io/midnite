import type {
  Digest,
  DigestCounts,
  DigestHighlight,
  DigestSection,
  TaskRetro,
  TaskSummary,
} from '@midnite/shared';

/** A minimal block for downstream (e.g. Slack) formatting of a digest. */
export interface DigestBlock {
  type: 'header' | 'section';
  text: string;
}

const MAX_HIGHLIGHTS = 8;

/** The deterministic core of a digest — counts + per-repo sections + highlights.
 *  Pure and total: zero LLM, zero I/O. `retros` maps taskId → its stored retro
 *  (or undefined). Sections group by repo, falling back to project id, then
 *  `unassigned`. Highlights come from notable retros (a narrative flag) and every
 *  abandoned task. */
export function aggregateDigest(
  tasks: TaskSummary[],
  retros: Map<string, TaskRetro | undefined>,
): { counts: DigestCounts; sections: DigestSection[]; highlights: DigestHighlight[] } {
  let shipped = 0;
  let failed = 0;
  const sectionMap = new Map<string, { shipped: number; failed: number }>();
  const highlights: DigestHighlight[] = [];

  for (const t of tasks) {
    const outcome = t.status === 'done' ? 'done' : 'abandoned';
    const key = t.repo ?? t.projectId ?? 'unassigned';
    const sec = sectionMap.get(key) ?? { shipped: 0, failed: 0 };
    if (outcome === 'done') {
      shipped++;
      sec.shipped++;
    } else {
      failed++;
      sec.failed++;
    }
    sectionMap.set(key, sec);

    const retro = retros.get(t.id);
    const notableNote = retro?.narrative?.notable?.[0];
    if (notableNote) {
      highlights.push({ taskId: t.id, title: t.title, outcome, note: notableNote });
    } else if (outcome === 'abandoned') {
      highlights.push({
        taskId: t.id,
        title: t.title,
        outcome,
        note: retro?.failures?.[0]?.detail ?? 'Task abandoned.',
      });
    }
  }

  const sections = [...sectionMap.entries()]
    .map(([name, v]) => ({ name, shipped: v.shipped, failed: v.failed }))
    .sort((a, b) => b.shipped + b.failed - (a.shipped + a.failed) || a.name.localeCompare(b.name));

  // Things a human should look at: notable narratives + every failure.
  const counts: DigestCounts = { shipped, failed, needsAttention: highlights.length };
  return { counts, sections, highlights: highlights.slice(0, MAX_HIGHLIGHTS) };
}

/** A deterministic one-line headline — the fail-soft fallback for the LLM one. */
export function deterministicHeadline(counts: DigestCounts): string {
  const shipped = `${counts.shipped} shipped`;
  const failed = `${counts.failed} failed`;
  if (counts.shipped === 0 && counts.failed === 0) return 'A quiet window — nothing shipped or failed.';
  const attn = counts.needsAttention > 0 ? ` · ${counts.needsAttention} need a look` : '';
  return `${shipped}, ${failed}${attn}.`;
}

/** Render the digest as a markdown body. Deterministic given the structured digest. */
export function renderMarkdown(digest: Digest): string {
  const lines: string[] = [];
  lines.push(`# Fleet digest — ${digest.headline}`);
  lines.push('');
  lines.push(`_${digest.from} → ${digest.to}_`);
  lines.push('');
  lines.push(
    `**${digest.counts.shipped}** shipped · **${digest.counts.failed}** failed · **${digest.counts.needsAttention}** need attention`,
  );

  if (digest.sections.length > 0) {
    lines.push('');
    lines.push('## By repo');
    for (const s of digest.sections) {
      lines.push(`- **${s.name}** — ${s.shipped} shipped, ${s.failed} failed`);
    }
  }

  if (digest.highlights.length > 0) {
    lines.push('');
    lines.push('## Highlights');
    for (const h of digest.highlights) {
      const mark = h.outcome === 'done' ? '✅' : '⚠️';
      lines.push(`- ${mark} **${h.title}** — ${h.note}`);
    }
  }

  if (digest.spend) {
    lines.push('');
    lines.push(
      `## Spend\n$${digest.spend.totalUsd.toFixed(2)} across ${digest.spend.sessions} session(s).`,
    );
  }

  if (digest.cycle && digest.cycle.p50Ms != null) {
    lines.push('');
    lines.push(`## Cycle time\nMedian end-to-end: ${formatMs(digest.cycle.p50Ms)} over ${digest.cycle.tasks} task(s).`);
  }

  return lines.join('\n');
}

/** A small block array for downstream Slack-style formatting. */
export function toBlocks(digest: Digest): DigestBlock[] {
  const blocks: DigestBlock[] = [
    { type: 'header', text: digest.headline },
    {
      type: 'section',
      text: `${digest.counts.shipped} shipped · ${digest.counts.failed} failed · ${digest.counts.needsAttention} need attention`,
    },
  ];
  for (const h of digest.highlights) {
    blocks.push({ type: 'section', text: `${h.outcome === 'done' ? '✅' : '⚠️'} ${h.title} — ${h.note}` });
  }
  return blocks;
}

function formatMs(ms: number): string {
  const mins = ms / 60_000;
  if (mins < 60) return `${Math.round(mins)}m`;
  const hours = mins / 60;
  return `${hours.toFixed(1)}h`;
}
