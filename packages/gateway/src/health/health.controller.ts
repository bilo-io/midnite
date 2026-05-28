import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check(): { ok: true } {
    return { ok: true };
  }
}
