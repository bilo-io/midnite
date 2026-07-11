import type {
  Digest,
  DigestCounts,
  DigestCycle,
  DigestHeadline,
  DigestHighlight,
  DigestSection,
  DigestSpend,
  DigestWindow,
  TaskRetro,
  TaskSummary,
} from '@midnite/shared';

/**
 * Phase 62 C — the **deterministic** core of a fleet digest. Pure: given the
 * window's terminal tasks + their retros, produce counts, per-repo/project
 * sections, and notable highlights. The LLM headline (fail-soft) and the P61
 * spend/cycle stats are layered on by {@link assembleDigest}; nothing here calls
 * a model or a service.
 */

const HIGHLIGHT_CAP = 10;

export interface DigestCore {
  counts: DigestCounts;
  sections: DigestSection[];
  highlights: DigestHighlight[];
}

function emptyCounts(): DigestCounts {
  return { shipped: 0, failed: 0, needsAttention: 0, total: 0 };
}

function tally(counts: DigestCounts, status: TaskSummary['status']): void {
  counts.total += 1;
  if (status === 'done') counts.shipped += 1;
  else if (status === 'abandoned') counts.failed += 1;
  else counts.needsAttention += 1;
}

function highlightFor(task: TaskSummary, retro: TaskRetro | undefined): DigestHighlight | null {
  const outcome = task.status === 'abandoned' ? 'abandoned' : task.status === 'done' ? 'done' : null;
  if (outcome === null) return null;

  const failure = retro?.failures?.[0];
  const notable = retro?.narrative?.notable?.[0];
  let note: string | null = null;
  if (failure) note = `${failure.class}: ${failure.detail}`;
  else if (notable) note = notable;
  else if (outcome === 'abandoned') note = 'abandoned';

  // A clean `done` task with no failure/notable isn't worth surfacing.
  if (outcome === 'done' && !failure && !notable) return null;

  return {
    taskId: task.id,
    title: task.title,
    outcome,
    note,
    ...(task.prUrl ? { prUrl: task.prUrl } : {}),
  };
}

export function computeDigestCore(
  tasks: TaskSummary[],
  retros: Map<string, TaskRetro>,
  groupBy: 'repo' | 'project',
): DigestCore {
  const counts = emptyCounts();
  const sectionMap = new Map<string, DigestSection>();

  for (const t of tasks) {
    tally(counts, t.status);
    const key = (groupBy === 'repo' ? t.repo : t.projectId) ?? 'unassigned';
    let section = sectionMap.get(key);
    if (!section) {
      section = {
        key,
        label: key === 'unassigned' ? 'Unassigned' : key,
        grouping: groupBy,
        counts: emptyCounts(),
        taskIds: [],
      };
      sectionMap.set(key, section);
    }
    tally(section.counts, t.status);
    section.taskIds.push(t.id);
  }

  const sections = [...sectionMap.values()].sort((a, b) => b.counts.total - a.counts.total);

  // Abandoned first (most notable), then any with a note; cap the list.
  const highlights = tasks
    .map((t) => highlightFor(t, retros.get(t.id)))
    .filter((h): h is DigestHighlight => h !== null)
    .sort((a, b) => (a.outcome === b.outcome ? 0 : a.outcome === 'abandoned' ? -1 : 1))
    .slice(0, HIGHLIGHT_CAP);

  return { counts, sections, highlights };
}

function fmtUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

function fmtMs(ms: number | null): string {
  if (ms === null) return '—';
  const min = ms / 60000;
  if (min < 60) return `${min.toFixed(1)}m`;
  return `${(min / 60).toFixed(1)}h`;
}

export function renderDigestMarkdown(
  core: DigestCore,
  window: DigestWindow,
  groupBy: 'repo' | 'project',
  spend: DigestSpend | null,
  cycle: DigestCycle | null,
  headline: DigestHeadline | null,
): string {
  const lines: string[] = [];
  lines.push('# Fleet digest');
  lines.push('');
  lines.push(`_${window.from} → ${window.to}_`);
  lines.push('');
  if (headline) {
    lines.push(headline.headline);
    lines.push('');
  }
  lines.push(
    `**${core.counts.shipped}** shipped · **${core.counts.failed}** failed · **${core.counts.needsAttention}** need attention (${core.counts.total} total)`,
  );

  if (spend && spend.totalUsd !== null) {
    lines.push('');
    lines.push(
      `**Spend:** ${fmtUsd(spend.totalUsd)} (${fmtUsd(spend.measuredUsd)} measured · ${fmtUsd(spend.estimatedUsd)} estimated${spend.unpricedSessions ? ` · ${spend.unpricedSessions} unpriced` : ''})`,
    );
  }
  if (cycle && (cycle.p50WorkMs !== null || cycle.p90WorkMs !== null)) {
    lines.push('');
    lines.push(`**Cycle time (work):** p50 ${fmtMs(cycle.p50WorkMs)} · p90 ${fmtMs(cycle.p90WorkMs)}`);
  }

  if (core.sections.length) {
    lines.push('');
    lines.push(`## By ${groupBy}`);
    for (const s of core.sections) {
      lines.push(`- **${s.label}** — ${s.counts.shipped} shipped, ${s.counts.failed} failed (${s.counts.total})`);
    }
  }

  if (core.highlights.length) {
    lines.push('');
    lines.push('## Highlights');
    for (const h of core.highlights) {
      const tag = h.outcome === 'abandoned' ? '⚠️' : '✅';
      const note = h.note ? ` — ${h.note}` : '';
      lines.push(`- ${tag} ${h.title}${note}`);
    }
  }

  return lines.join('\n');
}

export function assembleDigest(args: {
  id: string;
  createdAt: string;
  window: DigestWindow;
  groupBy: 'repo' | 'project';
  core: DigestCore;
  spend: DigestSpend | null;
  cycle: DigestCycle | null;
  headline: DigestHeadline | null;
}): Digest {
  const { id, createdAt, window, groupBy, core, spend, cycle, headline } = args;
  return {
    id,
    createdAt,
    window,
    groupBy,
    counts: core.counts,
    sections: core.sections,
    highlights: core.highlights,
    spend,
    cycle,
    headline,
    markdown: renderDigestMarkdown(core, window, groupBy, spend, cycle, headline),
  };
}
