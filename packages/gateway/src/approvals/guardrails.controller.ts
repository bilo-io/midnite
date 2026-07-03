import { BadRequestException, Body, Controller, Get, Inject, Post } from '@nestjs/common';
import {
  EmergencyStopRequestSchema,
  PauseRequestSchema,
  type GuardrailCaps,
  type GuardrailsResponse,
  type MidniteConfig,
} from '@midnite/shared';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { RequiresRole } from '../auth/decorators/require-role.decorator';
import { MIDNITE_CONFIG } from '../config.token';
import { ApprovalsService } from './approvals.service';

/**
 * Phase 50 Theme A — kill switch & pause. Reading guardrail state is open (the
 * board shows a paused banner to everyone); changing it is an **admin** action
 * and audited. Pause/resume is a soft scheduling gate; emergency-stop additionally
 * aborts in-flight agents (the pool reacts to the broadcast event).
 */
@Controller('guardrails')
export class GuardrailsController {
  constructor(
    @Inject(ApprovalsService) private readonly service: ApprovalsService,
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
  ) {}

  @Get()
  get(): GuardrailsResponse {
    return { guardrails: this.service.getGuardrails(), caps: this.caps() };
  }

  // Phase 50 F — the configured safety caps + mode, read-only, so `guardrails
  // status` (CLI) and the Safety panel (Theme E) see the whole picture in one
  // read. Sourced from config + the DB-backed autonomy mode.
  private caps(): GuardrailCaps {
    const { usage, agent, guardrails } = this.config;
    return {
      mode: this.service.getMode(),
      hardDailyCapUsd: usage.hardDailyCapUsd ?? null,
      hardMonthlyCapUsd: usage.hardMonthlyCapUsd ?? null,
      softDailyBudgetUsd: usage.dailyBudgetUsd ?? null,
      softMonthlyBudgetUsd: usage.monthlyBudgetUsd ?? null,
      maxSpawnsPerHour: agent.maxSpawnsPerHour,
      blastRadiusEnabled: guardrails.blastRadius.enabled,
      protectedBranches: guardrails.blastRadius.protectedBranches,
      protectedPathGlobs: guardrails.blastRadius.protectedPathGlobs,
      scrubSpawnEnv: guardrails.scrubSpawnEnv,
    };
  }

  @Post('pause')
  @RequiresRole('admin')
  pause(@Body() body: unknown, @CurrentUser() user?: CurrentUserPayload | null): GuardrailsResponse {
    const parsed = PauseRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { guardrails: this.service.setPause(parsed.data.scope, parsed.data.paused, user?.userId ?? null) };
  }

  @Post('emergency-stop')
  @RequiresRole('admin')
  emergencyStop(
    @Body() body: unknown,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): GuardrailsResponse {
    const parsed = EmergencyStopRequestSchema.safeParse(body ?? {});
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { guardrails: this.service.emergencyStop(parsed.data.scope, user?.userId ?? null) };
  }
}
