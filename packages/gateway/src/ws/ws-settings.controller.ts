import { BadRequestException, Body, Controller, Get, Inject, Patch } from '@nestjs/common';
import { UpdateWsSettingsRequestSchema, type WsSettingsResponse } from '@midnite/shared';
import { RequiresRole } from '../auth/decorators/require-role.decorator';
import { ReliableBroadcastService } from './reliable-broadcast.service';

/**
 * Phase 56 A — read + tune the realtime event-ring size at runtime. Reading is
 * open (the Settings panel shows it to anyone); changing it is an **admin**
 * action. The change is in-memory (resets to the `midnite.json` default on
 * restart, like the ring itself) — a runtime knob, not persisted config.
 */
@Controller('ws/settings')
export class WsSettingsController {
  constructor(@Inject(ReliableBroadcastService) private readonly reliable: ReliableBroadcastService) {}

  @Get()
  get(): WsSettingsResponse {
    return { settings: { ringSize: this.reliable.getRingSize() } };
  }

  @Patch()
  @RequiresRole('admin')
  update(@Body() body: unknown): WsSettingsResponse {
    const parsed = UpdateWsSettingsRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    this.reliable.setRingSize(parsed.data.ringSize);
    return { settings: { ringSize: this.reliable.getRingSize() } };
  }
}
