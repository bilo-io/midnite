import { describe, expect, it } from 'vitest';
import type { TaskRetro } from '@midnite/shared';

import { formatMs, retroLines, retroSummaryLine } from './retro';

function retro(over: Partial<TaskRetro> = {}): TaskRetro {
  return {
    taskId: 't1',
    outcome: 'done',
    timeline: [{ at: '2026-07-10T00:00:00.000Z', kind: 'status.changed', detail: 'todo → wip' }],
    attempts: [
      { startedAt: '2026-07-10T00:00:00.000Z', endedAt: '2026-07-10T00:05:00.000Z', durationMs: 300_000, outcome: 'done', retryIndex: 0 },
    ],
    failures: [],
    durations: { waitMs: 60_000, workMs: 300_000, totalMs: 360_000 },
    narrative: null,
    createdAt: '2026-07-10T00:06:00.000Z',
    ...over,
  };
}

describe('formatMs', () => {
  it('formats across s / m / h / d and null', () => {
    expect(formatMs(null)).toBe('—');
    expect(formatMs(8_000)).toBe('8s');
    expect(formatMs(192_000)).toBe('3m 12s');
    expect(formatMs(7_500_000)).toBe('2h 5m');
    expect(formatMs(2 * 86_400_000 + 3_600_000)).toBe('2d 1h');
  });
});

describe('retroSummaryLine', () => {
  it('shows skeleton-only when there is no narrative', () => {
    expect(retroSummaryLine(retro())).toBe(
      'done · wait 1m 0s · work 5m 0s · total 6m 0s · skeleton only',
    );
  });
  it('flags an AI narrative when present', () => {
    const line = retroSummaryLine(
      retro({ narrative: { whatHappened: 'x', whatTrippedIt: null, notable: [], generatedBy: 'llm' } }),
    );
    expect(line).toContain('AI narrative');
  });
});

describe('retroLines', () => {
  it('renders the narrative + attempts for a done retro', () => {
    const lines = retroLines(
      retro({
        narrative: {
          whatHappened: 'Shipped it.',
          whatTrippedIt: 'A flaky test.',
          notable: ['Reused endpoints'],
          generatedBy: 'llm',
        },
      }),
    );
    const text = lines.join('\n');
    expect(text).toContain('Summary (AI-generated):');
    expect(text).toContain('Shipped it.');
    expect(text).toContain('What tripped it: A flaky test.');
    expect(text).toContain('• Reused endpoints');
    expect(text).toContain('attempt 1 → done (5m 0s)');
  });

  it('renders failures + review + checks for an abandoned retro without a narrative', () => {
    const lines = retroLines(
      retro({
        outcome: 'abandoned',
        failures: [
          { id: 'f1', taskId: 't1', class: 'retries-exhausted', detail: 'gave up', retryIndex: 3, at: 'x' },
        ],
        review: { verdict: 'changes-requested', summary: 'Needs tests.' },
        checks: { status: 'failing', passed: 2, failed: 1 },
      }),
    );
    const text = lines.join('\n');
    expect(text).not.toContain('Summary (AI-generated):');
    expect(text).toContain('• retries-exhausted — gave up');
    expect(text).toContain('Review: changes-requested — Needs tests.');
    expect(text).toContain('Checks: failing (2 passed, 1 failed)');
  });
});
