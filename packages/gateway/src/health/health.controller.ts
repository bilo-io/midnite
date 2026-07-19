import { Controller, Get, Inject, Optional, Req, Res } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Liveness, MidniteConfig, PreflightCheck, PreflightReport, Readiness } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { resolveAuthToken } from '../auth/lib/auth-policy';
import { authenticateRequest } from '../auth/lib/authenticate-request';
import { JwtService } from '../auth/jwt.service';
import { ServiceTokensService } from '../service-tokens/service-tokens.service';
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
 *
 * Phase 72 C — the auth-exempt `preflight` + `ready` responses **redact** each
 * check's `detail`/`remedy` (which name providers + secret env-var names) for
 * unauthenticated callers, so an anonymous probe sees only the status roll-up.
 * The full detail is returned only when the request carries a valid credential
 * (`midnite doctor` / the operator Ops surface authenticate).
 */
@Controller('health')
export class HealthController {
  private readonly token: string | null;

  constructor(
    @Inject(HealthService) private readonly health: HealthService,
    @Inject(PreflightService) private readonly preflight: PreflightService,
    @Inject(MIDNITE_CONFIG) config: MidniteConfig,
    @Optional() @Inject(JwtService) private readonly jwtSvc?: JwtService,
    @Optional() @Inject(ServiceTokensService) private readonly serviceTokens?: ServiceTokensService,
  ) {
    this.token = resolveAuthToken(config);
  }

  /** True when the request carries a valid operator credential (JWT / service /
   * static bearer). Anonymous callers get the status-only report. */
  private isAuthenticated(req: FastifyRequest): boolean {
    return (
      authenticateRequest(req.headers, {
        token: this.token,
        jwtSvc: this.jwtSvc,
        serviceTokens: this.serviceTokens,
      }) !== null
    );
  }

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
  async ready(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<Readiness> {
    const report = await this.health.readiness();
    if (!report.ready) reply.status(503);
    if (this.isAuthenticated(req)) return report;
    return { ...report, checks: redactChecks(report.checks) };
  }

  /**
   * Full boot preflight, re-run live (Phase 54 F): config parse + DB + secret-key
   * + `claude`/`gh` on PATH + spawner + repo paths, with the `strictBoot` verdict.
   * 200 when the report passes, 503 when it fails — same convention as readiness,
   * so a monitor can gate on either.
   */
  @Get('preflight')
  async preflightReport(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<PreflightReport> {
    const report = await this.preflight.report();
    if (!report.ok) reply.status(503);
    if (this.isAuthenticated(req)) return report;
    return { ...report, checks: redactChecks(report.checks) };
  }
}

/** Drop the granular `detail`/`remedy` (provider + secret env-var names) from
 * every check, leaving `name` + `status` — the leak-safe view for anonymous
 * probes (Phase 72 C). The roll-up (`ok`/`ready`/`worst`) is unaffected. */
function redactChecks(checks: readonly PreflightCheck[]): PreflightCheck[] {
  return checks.map(({ name, status }) => ({ name, status }));
}
