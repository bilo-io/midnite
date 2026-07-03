import type { FailureClass, WaitReason } from '@midnite/shared';

/**
 * Phase 53 Theme A — the single place failures get a class. The runner calls this
 * at each failure site with a discriminated `site`, so adding a new failure mode
 * is one `case` arm here rather than scattered `if`s. Keeping it pure (no I/O)
 * makes it trivially unit-testable.
 */
export type FailureSite =
  | { site: 'exit'; exitCode: number }
  | { site: 'timeout'; timeoutMs: number }
  | { site: 'gate' };

export type ClassifiedFailure = {
  class: FailureClass;
  detail: string;
  exitCode?: number;
};

export function classifyFailure(input: FailureSite): ClassifiedFailure {
  switch (input.site) {
    case 'exit':
      return {
        class: 'crash',
        detail: `agent process exited with code ${input.exitCode}`,
        exitCode: input.exitCode,
      };
    case 'timeout':
      return {
        class: 'timeout',
        detail: `run exceeded the ${Math.round(input.timeoutMs / 60_000)}m timeout`,
      };
    case 'gate':
      return {
        class: 'gate-failed',
        detail: 'quality gate failed with no auto-fix remaining',
      };
  }
}

/**
 * Phase 53 D — map a terminal failure to the `waitReason` it escalates under.
 * `retryable` here means the class *could* retry but its budget is spent (so the
 * reason is the generic `retries-exhausted`); a non-retryable class carries a
 * class-specific reason instead. Kept beside {@link classifyFailure} so the class
 * → reason mapping lives in one place.
 */
export function waitReasonForFailure(cls: FailureClass, retryable: boolean): WaitReason {
  if (retryable) return 'retries-exhausted';
  switch (cls) {
    case 'gate-failed':
      return 'gate-failed';
    case 'no-pr':
      return 'no-pr';
    case 'timeout':
    case 'inactivity':
      return 'timed-out';
    default:
      return 'agent-failed'; // crash, tool-denied, unknown
  }
}
