import { describe, expect, it } from 'vitest';
import { TaskRetroSchema, type Task } from '@midnite/shared';

import { buildRetro, type RetroSources } from './build-retro';
import type { AgentRunStatsRow, TaskCheckRunRow, TaskEventRow, TaskFailureRow } from '../../db/schema';

const NOW = '2026-07-07T10:00:00.000Z';

function task(over: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Fix login',
    status: 'done',
    createdAt: '2026-07-07T09:00:00.000Z',
    ...over,
  } as unknown as Task;
}

function emptySources(over: Partial<RetroSources> = {}): RetroSources {
  return { events: [], runStats: [], failures: [], checkRuns: [], ...over };
}

describe('buildRetro', () => {
  it('produces a schema-valid skeleton with a null narrative', () => {
    const retro = buildRetro(task(), emptySources(), NOW);
    expect(TaskRetroSchema.safeParse(retro).success).toBe(true);
    expect(retro.narrative).toBeNull();
    expect(retro.outcome).toBe('done');
    expect(retro.createdAt).toBe(NOW);
  });

  it('maps outcome from the terminal status', () => {
    expect(buildRetro(task({ status: 'abandoned' }), emptySources(), NOW).outcome).toBe('abandoned');
  });

  it('maps run stats to attempts (retryIndex from retryCount)', () => {
    const runStats: AgentRunStatsRow[] = [
      { id: 'r0', taskId: 't1', startedAt: '2026-07-07T09:10:00.000Z', endedAt: '2026-07-07T09:12:00.000Z', durationMs: 120000, outcome: 'failed', retryCount: 0, repo: 'api' },
      { id: 'r1', taskId: 't1', startedAt: '2026-07-07T09:20:00.000Z', endedAt: '2026-07-07T09:30:00.000Z', durationMs: 600000, outcome: 'done', retryCount: 1, repo: 'api' },
    ];
    const retro = buildRetro(task(), emptySources({ runStats }), NOW);
    expect(retro.attempts).toEqual([
      { startedAt: '2026-07-07T09:10:00.000Z', endedAt: '2026-07-07T09:12:00.000Z', durationMs: 120000, outcome: 'failed', retryIndex: 0 },
      { startedAt: '2026-07-07T09:20:00.000Z', endedAt: '2026-07-07T09:30:00.000Z', durationMs: 600000, outcome: 'done', retryIndex: 1 },
    ]);
  });

  it('carries failures through the shared TaskFailure shape', () => {
    const failures: TaskFailureRow[] = [
      { id: 'f1', taskId: 't1', class: 'crash', detail: 'exit 137', exitCode: 137, lastOutput: 'oom', retryIndex: 0, teamId: null, at: '2026-07-07T09:12:00.000Z' },
    ];
    const retro = buildRetro(task(), emptySources({ failures }), NOW);
    expect(retro.failures).toHaveLength(1);
    expect(retro.failures[0]).toMatchObject({ class: 'crash', detail: 'exit 137', exitCode: 137, retryIndex: 0 });
    expect(retro.failures[0]).not.toHaveProperty('teamId'); // null dropped
  });

  it('summarizes check runs (passed/failed + status)', () => {
    const checkRuns: TaskCheckRunRow[] = [
      { id: 'c1', taskId: 't1', trigger: 'gate', passed: 1, startedAt: '2026-07-07T09:31:00.000Z', finishedAt: '2026-07-07T09:31:30.000Z', results: '[]' },
      { id: 'c2', taskId: 't1', trigger: 'gate', passed: 0, startedAt: '2026-07-07T09:32:00.000Z', finishedAt: '2026-07-07T09:32:30.000Z', results: '[]' },
    ];
    const retro = buildRetro(task({ checkRunStatus: 'passed' }), emptySources({ checkRuns }), NOW);
    expect(retro.checks).toEqual({ status: 'passed', passed: 1, failed: 1 });
  });

  it('omits checks/review/prUrl when absent', () => {
    const retro = buildRetro(task(), emptySources(), NOW);
    expect(retro.checks).toBeUndefined();
    expect(retro.review).toBeUndefined();
    expect(retro.prUrl).toBeUndefined();
  });

  it('carries the AI review verdict + summary and prUrl', () => {
    const retro = buildRetro(
      task({ prUrl: 'https://gh/pr/1', aiReview: { verdict: 'approved', summary: 'LGTM', runId: 'x', reviewedAt: NOW } }),
      emptySources(),
      NOW,
    );
    expect(retro.review).toEqual({ verdict: 'approved', summary: 'LGTM' });
    expect(retro.prUrl).toBe('https://gh/pr/1');
  });

  it('computes durations from createdAt + run boundaries', () => {
    const runStats: AgentRunStatsRow[] = [
      { id: 'r0', taskId: 't1', startedAt: '2026-07-07T09:15:00.000Z', endedAt: '2026-07-07T09:45:00.000Z', durationMs: 1800000, outcome: 'done', retryCount: 0, repo: null },
    ];
    const retro = buildRetro(task({ createdAt: '2026-07-07T09:00:00.000Z' }), emptySources({ runStats }), NOW);
    expect(retro.durations).toEqual({
      waitMs: 15 * 60_000, // 09:00 → 09:15
      workMs: 30 * 60_000, // 09:15 → 09:45
      totalMs: 45 * 60_000, // 09:00 → 09:45
    });
  });

  it('maps events to a timeline, extracting a detail from JSON data', () => {
    const events: TaskEventRow[] = [
      { id: 'e1', taskId: 't1', at: '2026-07-07T09:00:00.000Z', kind: 'task.created', data: null },
      { id: 'e2', taskId: 't1', at: '2026-07-07T09:45:00.000Z', kind: 'status.changed', data: JSON.stringify({ to: 'done' }) },
    ];
    const retro = buildRetro(task(), emptySources({ events }), NOW);
    expect(retro.timeline).toEqual([
      { at: '2026-07-07T09:00:00.000Z', kind: 'task.created' },
      { at: '2026-07-07T09:45:00.000Z', kind: 'status.changed', detail: 'done' },
    ]);
  });
});
