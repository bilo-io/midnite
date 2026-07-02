import type { FailureClass } from '@midnite/shared';

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
