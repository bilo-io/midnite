import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { Check, CheckResult, CheckRun, CheckTrigger, MidniteConfig } from '@midnite/shared';

import { MIDNITE_CONFIG } from '../config.token';
import { runCheck } from './lib/run-check';

/**
 * Runs a task's configured quality-gate checks in a resolved repo cwd and reports
 * a structured {@link CheckRun} (Phase 30 Theme A). The runner owns no task status
 * and resolves no config itself — it takes an already-resolved `Check[]` + `cwd`
 * (Theme B wires it into the `done` seam). Checks run **sequentially** for
 * predictability and to avoid cwd contention. It **never throws into the caller**:
 * a spawn error or timeout becomes a failed result.
 */
@Injectable()
export class ChecksService {
  private readonly logger = new Logger(ChecksService.name);

  constructor(@Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig) {}

  async run(taskId: string, checks: Check[], cwd: string, trigger: CheckTrigger): Promise<CheckRun> {
    const { perCheckTimeoutMs, outputCapBytes } = this.config.checks;
    const startedAt = new Date().toISOString();
    const results: CheckResult[] = [];

    for (const check of checks) {
      try {
        results.push(
          await runCheck(check, { cwd, defaultTimeoutMs: perCheckTimeoutMs, outputCapBytes }),
        );
      } catch (err) {
        // runCheck is contracted not to reject, but never let the gate path throw.
        this.logger.error({ err, check: check.name }, 'check runner threw unexpectedly');
        results.push({
          name: check.name,
          command: check.command,
          exitCode: null,
          passed: false,
          durationMs: 0,
          output: `runner error: ${(err as Error).message}`,
        });
      }
    }

    return {
      id: randomUUID(),
      taskId,
      trigger,
      startedAt,
      finishedAt: new Date().toISOString(),
      passed: results.every((r) => r.passed),
      results,
    };
  }
}
