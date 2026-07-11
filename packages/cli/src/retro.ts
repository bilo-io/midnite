import type { TaskRetro } from '@midnite/shared';

// Phase 62 H — pure render helpers for `midnite retro <taskId>`. The command body
// in index.ts fetches `/tasks/:id/retro` and paints these; keeping the shaping
// here makes it unit-testable without a gateway. Honesty: the narrative is only
// shown when actually present (deterministic skeletons render facts only).

/** Human-readable elapsed time from ms (e.g. `2h 5m`, `3m 12s`, `8s`, `—`). */
export function formatMs(ms: number | null): string {
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

/** The one-line summary row: outcome + wait/work/total + whether it's AI-narrated. */
export function retroSummaryLine(retro: TaskRetro): string {
  const d = retro.durations;
  const narr = retro.narrative ? 'AI narrative' : 'skeleton only';
  return `${retro.outcome} · wait ${formatMs(d.waitMs)} · work ${formatMs(d.workMs)} · total ${formatMs(
    d.totalMs,
  )} · ${narr}`;
}

/**
 * The full render as an ordered list of lines (no colour — the caller paints).
 * Sections: summary, narrative (only when present, honesty-labeled), failures,
 * review, checks, PR, attempts. The raw timeline is left to `--json`/`--export`.
 */
export function retroLines(retro: TaskRetro): string[] {
  const lines: string[] = [retroSummaryLine(retro)];

  if (retro.narrative) {
    lines.push('', 'Summary (AI-generated):', `  ${retro.narrative.whatHappened}`);
    if (retro.narrative.whatTrippedIt) {
      lines.push(`  What tripped it: ${retro.narrative.whatTrippedIt}`);
    }
    for (const note of retro.narrative.notable) lines.push(`  • ${note}`);
  }

  if (retro.failures.length > 0) {
    lines.push('', 'Failures:');
    for (const f of retro.failures) {
      lines.push(`  • ${f.class}${f.detail ? ` — ${f.detail}` : ''}`);
    }
  }

  if (retro.review) {
    lines.push('', `Review: ${retro.review.verdict} — ${retro.review.summary}`);
  }

  if (retro.checks) {
    lines.push(
      '',
      `Checks: ${retro.checks.status} (${retro.checks.passed} passed, ${retro.checks.failed} failed)`,
    );
  }

  if (retro.prUrl) lines.push('', `PR: ${retro.prUrl}`);

  if (retro.attempts.length > 0) {
    lines.push('', 'Attempts:');
    for (const a of retro.attempts) {
      const which = a.retryIndex === 0 ? 'attempt 1' : `retry ${a.retryIndex}`;
      lines.push(`  • ${which} → ${a.outcome ?? 'unresolved'} (${formatMs(a.durationMs)})`);
    }
  }

  return lines;
}
