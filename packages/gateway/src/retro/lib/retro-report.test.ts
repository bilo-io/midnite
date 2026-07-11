import { describe, expect, it } from 'vitest';
import type { Task, TaskRetro } from '@midnite/shared';

import { buildTaskRetroReport, retroReportFilename } from './retro-report';

const NOW = new Date('2026-07-11T12:00:00.000Z');

// Minimal task — the report only reads title/repo/projectId/prUrl/timestamps.
function task(partial: Partial<Task> = {}): Task {
  return {
    title: 'Add cost views',
    repo: 'midnite',
    projectId: 'p1',
    updatedAt: '2026-07-10T00:00:00.000Z',
    createdAt: '2026-07-09T00:00:00.000Z',
    ...partial,
  } as Task;
}

function skeleton(partial: Partial<TaskRetro> = {}): TaskRetro {
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
    ...partial,
  };
}

describe('buildTaskRetroReport', () => {
  it('renders the deterministic skeleton with timing + attempts + timeline', () => {
    const md = buildTaskRetroReport(task(), skeleton(), { now: NOW });
    expect(md).toContain('# Retrospective — Add cost views');
    expect(md).toContain('*Exported 2026-07-11*');
    expect(md).toContain('- **Outcome:** done');
    expect(md).toContain('- **Repo:** midnite');
    expect(md).toContain('**Wait:** 1m 0s');
    expect(md).toContain('**Work:** 5m 0s');
    expect(md).toContain('## Attempts');
    expect(md).toContain('**attempt 1** → done');
    expect(md).toContain('## Timeline');
    // No narrative section in a skeleton.
    expect(md).not.toContain('## Summary');
    expect(md.endsWith('\n')).toBe(true);
  });

  it('includes the AI narrative (honesty-labeled) when present', () => {
    const md = buildTaskRetroReport(
      task(),
      skeleton({
        narrative: {
          whatHappened: 'Shipped two charts.',
          whatTrippedIt: 'A flaky test.',
          notable: ['Reused existing endpoints'],
          generatedBy: 'llm',
        },
      }),
      { now: NOW },
    );
    expect(md).toContain('## Summary');
    expect(md).toContain('_AI-generated narrative._');
    expect(md).toContain('Shipped two charts.');
    expect(md).toContain('**What tripped it:** A flaky test.');
    expect(md).toContain('- Reused existing endpoints');
  });

  it('renders the failure story + review + checks when present', () => {
    const md = buildTaskRetroReport(
      task(),
      skeleton({
        outcome: 'abandoned',
        failures: [
          {
            id: 'f1',
            taskId: 't1',
            class: 'retries-exhausted',
            detail: 'gave up after 3 tries',
            retryIndex: 3,
            at: '2026-07-10T00:05:00.000Z',
          },
        ],
        review: { verdict: 'changes-requested', summary: 'Needs tests.' },
        checks: { status: 'failing', passed: 2, failed: 1 },
        prUrl: 'https://github.com/x/y/pull/1',
      }),
      { now: NOW },
    );
    expect(md).toContain('## What tripped it');
    expect(md).toContain('**retries-exhausted** — gave up after 3 tries');
    expect(md).toContain('## Review');
    expect(md).toContain('- **Verdict:** changes-requested');
    expect(md).toContain('## Checks');
    expect(md).toContain('**Failed:** 1');
    expect(md).toContain('- **PR:** https://github.com/x/y/pull/1');
  });

  it('builds a safe, dated filename', () => {
    expect(retroReportFilename(task(), { now: NOW })).toBe('retro-add-cost-views-2026-07-10.md');
  });
});
