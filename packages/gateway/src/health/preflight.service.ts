import { Inject, Injectable, Logger } from '@nestjs/common';
import type { MidniteConfig, PreflightCheck, PreflightReport } from '@midnite/shared';
import { worstStatus } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { HealthService } from './health.service';

/**
 * Boot preflight (Phase 54 A): run the health checks once before the gateway
 * starts accepting traffic and decide whether to boot. A `fail` (hard gap) —
 * or, under `gateway.strictBoot`, any `warn` — aborts the boot with a loud,
 * actionable report instead of starting silently degraded. Soft gaps otherwise
 * just log a warning and the gateway carries on (behaviour-preserving default).
 */
@Injectable()
export class PreflightService {
  private readonly logger = new Logger('Preflight');

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    private readonly health: HealthService,
  ) {}

  /** Build the boot report + apply the strict-boot verdict (no logging/exit). */
  async report(): Promise<PreflightReport> {
    const checks = await this.health.bootChecks();
    const worst = worstStatus(checks);
    const strict = this.config.gateway.strictBoot;
    const ok = strict ? worst === 'ok' : worst !== 'fail';
    return { ok, worst, checks };
  }

  /**
   * Run preflight, log the outcome, and hard-exit on failure. Called from
   * bootstrap after the Nest app is created but before `listen()`.
   * `exit` is injectable so specs can assert the exit decision without killing
   * the test process.
   */
  async run(exit: (code: number) => void = (c) => process.exit(c)): Promise<PreflightReport> {
    const report = await this.report();
    this.log(report);
    if (!report.ok) {
      this.logger.error(
        this.config.gateway.strictBoot
          ? 'boot preflight failed (strictBoot: warnings are fatal) — aborting'
          : 'boot preflight failed — aborting',
      );
      exit(1);
    }
    return report;
  }

  private log(report: PreflightReport): void {
    for (const c of report.checks) {
      const line = this.format(c);
      if (c.status === 'fail') this.logger.error(line);
      else if (c.status === 'warn') this.logger.warn(line);
      else this.logger.log(line);
    }
  }

  private format(c: PreflightCheck): string {
    const icon = c.status === 'ok' ? '✓' : c.status === 'warn' ? '⚠' : '✗';
    const remedy = c.remedy ? ` → ${c.remedy}` : '';
    return `${icon} ${c.name}: ${c.detail}${remedy}`;
  }
}
