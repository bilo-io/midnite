import { Controller, Get, Inject } from '@nestjs/common';
import type { EnvironmentResponse } from '@midnite/shared';
import { EnvironmentService } from './environment.service';

@Controller('environment')
export class EnvironmentController {
  constructor(@Inject(EnvironmentService) private readonly service: EnvironmentService) {}

  /** Host OS + live status of every system tool the user needs locally. */
  @Get()
  getEnvironment(): Promise<EnvironmentResponse> {
    return this.service.getEnvironment();
  }
}
