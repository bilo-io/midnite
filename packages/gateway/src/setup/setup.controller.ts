import { Controller, Get, Inject } from '@nestjs/common';
import type { SetupStatus } from '@midnite/shared';
import { SetupService } from './setup.service';

@Controller('setup')
export class SetupController {
  constructor(@Inject(SetupService) private readonly service: SetupService) {}

  /** Aggregate first-run readiness: the per-item checklist + derived `ready`. */
  @Get('status')
  getStatus(): Promise<SetupStatus> {
    return this.service.getStatus();
  }
}
