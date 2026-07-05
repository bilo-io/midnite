import { Controller, Get, Inject, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import type { Liveness, PreflightReport, Readiness } from '@midnite/shared';
import { HealthService } from './health.service';
import { PreflightService } from './preflight.service';

/**
 * Health endpoints (Phase 54 B). Split into **liveness** (process is up — cheap,
 * never touches the DB) and **readiness** (can serve now — DB/pool/scheduler/
 * spawner re-evaluated live). `/health` is kept as a liveness alias for
 * backwards compatibility. Phase 54 F adds **`/health/preflight`** — the full
 * boot check set re-run live, for `midnite doctor` + the Ops runtime panel. All
 * are exempt from auth + rate-limiting (see auth-policy / rate-limit.guard) so
 * probes always reach them.
 */
@Controller('health')
export class HealthController {
  constructor(
    @Inject(HealthService) private readonly health: HealthService,
    @Inject(PreflightService) private readonly preflight: PreflightService,
  ) {}

  /** Legacy liveness alias — unchanged shape for existing probes. */
  @Get()
  check(): { ok: true } {
    return { ok: true };
  }

  @Get('live')
  live(): Liveness {
    return this.health.liveness();
  }

  /** Readiness: 200 when ready, 503 with the failing checks when not. */
  @Get('ready')
  async ready(@Res({ passthrough: true }) reply: FastifyReply): Promise<Readiness> {
    const report = await this.health.readiness();
    if (!report.ready) reply.status(503);
    return report;
  }

  /**
   * Full boot preflight, re-run live (Phase 54 F): config parse + DB + secret-key
   * + `claude`/`gh` on PATH + spawner + repo paths, with the `strictBoot` verdict.
   * 200 when the report passes, 503 when it fails — same convention as readiness,
   * so a monitor can gate on either.
   */
  @Get('preflight')
  async preflightReport(@Res({ passthrough: true }) reply: FastifyReply): Promise<PreflightReport> {
    const report = await this.preflight.report();
    if (!report.ok) reply.status(503);
    return report;
  }
}
