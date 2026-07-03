import { describe, expect, it } from 'vitest';
import {
  FAILURE_CLASSES,
  FAILURE_CLASS_LABEL,
  FAILURE_RETRYABLE,
  FailureClassSchema,
  ResolveTaskRequestSchema,
  TaskFailureSchema,
  WAIT_REASONS,
  WAIT_REASON_LABEL,
  WaitReasonSchema,
  isNeedsAttention,
  isRetryableFailure,
} from './task-failure.js';

describe('failure taxonomy', () => {
  it('marks only transient/environmental classes retryable', () => {
    expect(isRetryableFailure('crash')).toBe(true);
    expect(isRetryableFailure('timeout')).toBe(true);
    expect(isRetryableFailure('inactivity')).toBe(true);
    expect(isRetryableFailure('gate-failed')).toBe(false);
    expect(isRetryableFailure('tool-denied')).toBe(false);
    expect(isRetryableFailure('no-pr')).toBe(false);
    expect(isRetryableFailure('retries-exhausted')).toBe(false);
    // unknown is conservative — escalate, don't loop.
    expect(isRetryableFailure('unknown')).toBe(false);
  });

  it('has a retryable + label entry for every class (no gaps)', () => {
    for (const cls of FAILURE_CLASSES) {
      expect(FAILURE_RETRYABLE).toHaveProperty(cls);
      expect(typeof FAILURE_RETRYABLE[cls]).toBe('boolean');
      expect(FAILURE_CLASS_LABEL[cls]).toBeTruthy();
    }
  });

  it('validates a full failure record', () => {
    const rec = TaskFailureSchema.parse({
      id: 'f1',
      taskId: 't1',
      class: 'crash',
      detail: 'exit 137',
      exitCode: 137,
      lastOutput: 'segfault\n',
      retryIndex: 2,
      at: '2026-07-02T00:00:00Z',
    });
    expect(rec.class).toBe('crash');
    expect(rec.exitCode).toBe(137);
  });

  it('allows a null / omitted lastOutput and exitCode (best-effort capture)', () => {
    const rec = TaskFailureSchema.parse({
      id: 'f2',
      taskId: 't1',
      class: 'timeout',
      detail: 'run exceeded 30m',
      lastOutput: null,
      retryIndex: 0,
      at: '2026-07-02T00:00:00Z',
    });
    expect(rec.lastOutput).toBeNull();
    expect(rec.exitCode).toBeUndefined();
  });

  it('rejects an unknown failure class and wait reason', () => {
    expect(FailureClassSchema.safeParse('kaboom').success).toBe(false);
    expect(WaitReasonSchema.safeParse('agent-failed').success).toBe(true);
    expect(WaitReasonSchema.safeParse('whatever').success).toBe(false);
  });
});

describe('wait reasons & needs-attention (Phase 53 D)', () => {
  it('labels every wait reason', () => {
    for (const r of WAIT_REASONS) expect(WAIT_REASON_LABEL[r]).toBeTruthy();
  });

  it('treats every failure reason as needs-attention except needs-input', () => {
    expect(isNeedsAttention('needs-input')).toBe(false);
    expect(isNeedsAttention(null)).toBe(false);
    expect(isNeedsAttention(undefined)).toBe(false);
    expect(isNeedsAttention('agent-failed')).toBe(true);
    expect(isNeedsAttention('timed-out')).toBe(true);
    expect(isNeedsAttention('gate-failed')).toBe(true);
    expect(isNeedsAttention('retries-exhausted')).toBe(true);
    expect(isNeedsAttention('no-pr')).toBe(true);
  });
});

describe('ResolveTaskRequestSchema (Phase 53 D)', () => {
  it('accepts requeue/abandon without a prompt', () => {
    expect(ResolveTaskRequestSchema.safeParse({ action: 'requeue' }).success).toBe(true);
    expect(ResolveTaskRequestSchema.safeParse({ action: 'abandon' }).success).toBe(true);
  });

  it('requires a non-empty prompt for replan', () => {
    expect(ResolveTaskRequestSchema.safeParse({ action: 'replan' }).success).toBe(false);
    expect(ResolveTaskRequestSchema.safeParse({ action: 'replan', prompt: '   ' }).success).toBe(false);
    expect(ResolveTaskRequestSchema.safeParse({ action: 'replan', prompt: 'redo it' }).success).toBe(true);
  });

  it('rejects an unknown action', () => {
    expect(ResolveTaskRequestSchema.safeParse({ action: 'nuke' }).success).toBe(false);
  });
});
