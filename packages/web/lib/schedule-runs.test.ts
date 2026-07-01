import { describe, expect, it } from 'vitest';
import type { WorkflowRun, WorkflowTemplateSummary } from '@midnite/shared';

import { createdTaskFromRun, schedulePresetTemplates } from './schedule-runs';

const run = (over: Partial<WorkflowRun>): WorkflowRun => ({
  id: 'r1',
  workflowId: 'w1',
  status: 'succeeded',
  triggerSource: 'schedule',
  startedAt: '2026-06-30T09:00:00Z',
  nodeRuns: [],
  ...over,
});

describe('createdTaskFromRun', () => {
  it('reads the task from the task.create node output', () => {
    const r = run({
      nodeRuns: [
        { id: 'nr1', runId: 'r1', nodeId: 'n1', nodeType: 'trigger.schedule', status: 'succeeded', logs: [] },
        {
          id: 'nr2',
          runId: 'r1',
          nodeId: 'n2',
          nodeType: 'task.create',
          status: 'succeeded',
          output: { id: 't-42', title: 'Daily standup' },
          logs: [],
        },
      ],
    });
    expect(createdTaskFromRun(r)).toEqual({ id: 't-42', title: 'Daily standup' });
  });

  it('falls back to the id as title when title is missing', () => {
    const r = run({
      nodeRuns: [{ id: 'nr', runId: 'r1', nodeId: 'n2', nodeType: 'task.create', status: 'succeeded', output: { id: 't-7' }, logs: [] }],
    });
    expect(createdTaskFromRun(r)).toEqual({ id: 't-7', title: 't-7' });
  });

  it('returns null when there is no task.create output yet', () => {
    expect(createdTaskFromRun(run({ status: 'failed', nodeRuns: [] }))).toBeNull();
    const noOutput = run({
      nodeRuns: [{ id: 'nr', runId: 'r1', nodeId: 'n2', nodeType: 'task.create', status: 'running', logs: [] }],
    });
    expect(createdTaskFromRun(noOutput)).toBeNull();
  });
});

const tpl = (over: Partial<WorkflowTemplateSummary>): WorkflowTemplateSummary => ({
  id: 'tpl1',
  slug: 'daily-standup',
  name: 'Daily standup',
  category: 'scheduling',
  tags: ['recurring-task'],
  credentialSlots: [],
  published: true,
  authorId: null,
  createdAt: '',
  updatedAt: '',
  ...over,
});

describe('schedulePresetTemplates', () => {
  it('keeps scheduling templates tagged recurring-task', () => {
    expect(schedulePresetTemplates([tpl({})]).map((t) => t.slug)).toEqual(['daily-standup']);
  });

  it('drops scheduling templates that do not create tasks', () => {
    const cleanup = tpl({ id: 't2', slug: 'scheduled-task-cleanup', tags: ['cleanup', 'weekly'] });
    expect(schedulePresetTemplates([cleanup])).toEqual([]);
  });

  it('drops non-scheduling templates even if tagged', () => {
    const ai = tpl({ id: 't3', slug: 'x', category: 'ai', tags: ['recurring-task'] });
    expect(schedulePresetTemplates([ai])).toEqual([]);
  });
});
