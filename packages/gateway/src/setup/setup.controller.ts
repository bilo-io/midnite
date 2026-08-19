import { BadRequestException, Body, Controller, Get, Inject, Put } from '@nestjs/common';
import { UpdateAgentPoolRequestSchema, type SetupStatus } from '@midnite/shared';
import { SetupService } from './setup.service';

@Controller('setup')
export class SetupController {
  constructor(@Inject(SetupService) private readonly service: SetupService) {}

  /** Aggregate first-run readiness: the per-item checklist + derived `ready`. */
  @Get('status')
  getStatus(): Promise<SetupStatus> {
    return this.service.getStatus();
  }

  /** Size the agent pool and toggle autonomous scheduling. Returns the refreshed
   *  status so the wizard's checklist updates from the same round-trip. */
  @Put('agent-pool')
  updateAgentPool(@Body() body: unknown): Promise<SetupStatus> {
    const parsed = UpdateAgentPoolRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.service.updateAgentPool(parsed.data);
  }
}
