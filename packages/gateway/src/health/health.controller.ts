import { Controller, Get, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import type { Liveness, Readiness } from '@midnite/shared';
import { HealthService } from './health.service';

/**
 * Health endpoints (Phase 54 B). Split into **liveness** (process is up — cheap,
 * never touches the DB) and **readiness** (can serve now — DB/pool/scheduler/
 * spawner re-evaluated live). `/health` is kept as a liveness alias for
 * backwards compatibility; all three are exempt from auth + rate-limiting (see
 * auth-policy / rate-limit.guard) so probes always reach them.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

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
}
