import { Controller, Get, Inject } from '@nestjs/common';
import type { SystemStats } from '@midnite/shared';

import { SystemService } from './system.service';

@Controller('system')
export class SystemController {
  constructor(@Inject(SystemService) private readonly service: SystemService) {}

  // GET /system/stats — real host CPU / memory / disk telemetry.
  @Get('stats')
  stats(): Promise<SystemStats> {
    return this.service.getStats();
  }
}
