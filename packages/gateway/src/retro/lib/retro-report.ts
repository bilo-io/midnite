/**
 * Pure markdown serializer for a task **retrospective** — a consumer of the
 * report export framework (`shared/src/report.ts`), mirroring the task/council
 * serializers (`tasks/lib/task-report.ts`, `councils/lib/council-report.ts`).
 * Given a hydrated `Task` + its stored `TaskRetro` it builds a self-contained doc:
 *
 *   # Retrospective — <title>
 *   *Exported …*
 *   - **Outcome/Repo/Project/PR** metadata + wait/work/total durations
 *   ## Summary        (the LLM narrative, when present — honesty-labeled)
 *   ## What tripped it (failure story, when the task hit failures)
 *   ## Review         (Phase 37 AI review verdict + summary, when present)
 *   ## Checks         (Phase 30 quality-gate pass/fail, when present)
 *   ## Attempts       (agent run attempts, oldest → newest)
 *   ## Timeline       (the retro's event timeline, oldest → newest)
 *
 * No DB or Nest dependency: the caller hands it an already-hydrated `Task` + the
 * retro, so it stays trivially unit-testable. Pure: same input → same output
 * (modulo the injectable `now`).
 */

import type { Task, TaskRetro } from '@midnite/shared';

export type RetroReportOptions = {
  /** When the report is generated; defaults to now. Injectable for stable tests. */
  now?: Date;
};

/** Human-readable elapsed time from milliseconds (e.g. `2h 5m`, `3m 12s`, `8s`). */
function formatMs(ms: number | null): string {
  if (ms === null) return '—';
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const totalMin = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (totalMin < 60) return `${totalMin}m ${sec}s`;
  const hr = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (hr < 24) return `${hr}h ${min}m`;
  const days = Math.floor(hr / 24);
  return `${days}d ${hr % 24}h`;
}

/** Render the agent run attempts as a markdown bullet list, oldest → newest. */
function renderAttempts(retro: TaskRetro): string {
  if (retro.attempts.length === 0) return '_No agent runs recorded._';
  return retro.attempts
    .map((a) => {
      const dur = a.durationMs === null ? '' : ` — ${formatMs(a.durationMs)}`;
      const outcome = a.outcome ?? 'unresolved';
      const attempt = a.retryIndex === 0 ? 'attempt 1' : `retry ${a.retryIndex}`;
      return `- \`${a.startedAt}\` **${attempt}** → ${outcome}${dur}`;
    })
    .join('\n');
}

/** Render the retro's event timeline as a markdown bullet list, oldest → newest. */
function renderTimeline(retro: TaskRetro): string {
  if (retro.timeline.length === 0) return '_No activity recorded._';
  return retro.timeline
    .map((e) => `- \`${e.at}\` **${e.kind}**${e.detail ? ` — ${e.detail}` : ''}`)
    .join('\n');
}

/**
 * Serialize a task retrospective as a standalone markdown document. Pure: same
 * inputs → same output (modulo the `now` timestamp, which is injectable).
 */
export function buildTaskRetroReport(
  task: Task,
  retro: TaskRetro,
  options: RetroReportOptions = {},
): string {
  const now = options.now ?? new Date();

  const title = `# Retrospective — ${task.title.trim() || 'Untitled task'}`;
  const exportedAt = `*Exported ${now.toISOString().slice(0, 10)}*`;

  const meta: string[] = [`- **Outcome:** ${retro.outcome}`];
  if (task.repo) meta.push(`- **Repo:** ${task.repo}`);
  if (task.projectId) meta.push(`- **Project:** ${task.projectId}`);
  if (retro.prUrl) meta.push(`- **PR:** ${retro.prUrl}`);
  meta.push(
    `- **Wait:** ${formatMs(retro.durations.waitMs)} · **Work:** ${formatMs(
      retro.durations.workMs,
    )} · **Total:** ${formatMs(retro.durations.totalMs)}`,
  );

  const sections: string[] = [title, exportedAt, meta.join('\n')];

  // The LLM narrative — honesty-labeled. Absent in a deterministic skeleton.
  if (retro.narrative) {
    const n = retro.narrative;
    const body: string[] = [
      '## Summary',
      '_AI-generated narrative._',
      '',
      n.whatHappened.trim(),
    ];
    if (n.whatTrippedIt?.trim()) {
      body.push('', `**What tripped it:** ${n.whatTrippedIt.trim()}`);
    }
    if (n.notable.length > 0) {
      body.push('', ...n.notable.map((item) => `- ${item}`));
    }
    sections.push(body.join('\n'));
  }

  if (retro.failures.length > 0) {
    const rows = retro.failures
      .map((f) => {
        const detail = f.detail?.trim() ? ` — ${f.detail.trim()}` : '';
        return `- **${f.class}**${detail}`;
      })
      .join('\n');
    sections.push(['## What tripped it', rows].join('\n\n'));
  }

  if (retro.review) {
    sections.push(
      ['## Review', `- **Verdict:** ${retro.review.verdict}`, '', retro.review.summary.trim()].join(
        '\n',
      ),
    );
  }

  if (retro.checks) {
    sections.push(
      [
        '## Checks',
        `- **Status:** ${retro.checks.status} · **Passed:** ${retro.checks.passed} · **Failed:** ${retro.checks.failed}`,
      ].join('\n'),
    );
  }

  sections.push(['## Attempts', renderAttempts(retro)].join('\n\n'));
  sections.push(['## Timeline', renderTimeline(retro)].join('\n\n'));

  // A single trailing newline — POSIX-clean text file.
  return `${sections.join('\n\n')}\n`;
}

/** A safe, descriptive download filename for a retro report. */
export function retroReportFilename(task: Task, options: RetroReportOptions = {}): string {
  const now = options.now ?? new Date();
  const slug =
    (task.title.trim() || 'task')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'task';
  const date = (task.updatedAt ?? task.createdAt ?? now.toISOString()).slice(0, 10);
  return `retro-${slug}-${date}.md`;
}
