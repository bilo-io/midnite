import { describe, expect, it } from 'vitest';
import type { Task } from '@midnite/shared';
import { buildTaskReport, taskReportFilename } from './task-report';

const NOW = new Date('2026-06-21T12:00:00.000Z');

function task(over: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Fix the login bug',
    kind: 'bug',
    status: 'wip',
    priority: 2,
    retryCount: 0,
    fixAttempts: 0,
    tags: [],
    events: [],
    createdAt: '2026-06-20T00:00:00.000Z',
    updatedAt: '2026-06-21T00:00:00.000Z',
    ...over,
  } as unknown as Task;
}

describe('buildTaskReport', () => {
  it('renders the title, exported date, and core metadata', () => {
    const md = buildTaskReport(task({ repo: 'api', prUrl: 'https://example/pr/1', tags: ['ui'] }), {
      now: NOW,
    });
    expect(md).toContain('# Fix the login bug');
    expect(md).toContain('*Exported 2026-06-21*');
    expect(md).toContain('- **Kind:** bug');
    expect(md).toContain('- **Status:** wip');
    expect(md).toContain('- **Priority:** High');
    expect(md).toContain('- **Repo:** api');
    expect(md).toContain('- **PR:** https://example/pr/1');
    expect(md).toContain('- **Tags:** ui');
  });

  it('renders the task_events timeline oldest → newest with data summaries', () => {
    const md = buildTaskReport(
      task({
        events: [
          { at: '2026-06-20T02:00:00.000Z', kind: 'status.changed', data: { to: 'wip' } },
          { at: '2026-06-20T01:00:00.000Z', kind: 'created' },
        ],
      }),
      { now: NOW },
    );
    const timeline = md.slice(md.indexOf('## Timeline'));
    const createdAt = timeline.indexOf('**created**');
    const statusAt = timeline.indexOf('**status.changed**');
    expect(createdAt).toBeGreaterThanOrEqual(0);
    expect(statusAt).toBeGreaterThan(createdAt); // chronological order
    expect(timeline).toContain('**status.changed** — to: wip');
  });

  it('shows an empty-timeline placeholder and omits optional sections cleanly', () => {
    const md = buildTaskReport(task({ prompt: undefined, links: [] }), { now: NOW });
    expect(md).toContain('## Timeline');
    expect(md).toContain('_No activity recorded._');
    expect(md).not.toContain('## Prompt');
    expect(md).not.toContain('## Links');
  });

  it('includes the prompt and links sections when present', () => {
    const md = buildTaskReport(
      task({
        prompt: 'Investigate the 500 on login',
        links: [
          {
            id: 'l1',
            taskId: 't1',
            url: 'https://github.com/x/y/issues/3',
            kind: 'github',
            label: 'Issue 3',
            createdAt: '',
          },
        ],
      }),
      { now: NOW },
    );
    expect(md).toContain('## Prompt');
    expect(md).toContain('Investigate the 500 on login');
    expect(md).toContain('## Links');
    expect(md).toContain('[Issue 3](https://github.com/x/y/issues/3)');
  });
});

describe('taskReportFilename', () => {
  it('slugifies the title and stamps the updated date', () => {
    expect(taskReportFilename(task(), { now: NOW })).toBe('fix-the-login-bug-2026-06-21.md');
  });

  it('falls back to "task" for an empty title', () => {
    expect(taskReportFilename(task({ title: '   ' }), { now: NOW })).toMatch(/^task-/);
  });
});
