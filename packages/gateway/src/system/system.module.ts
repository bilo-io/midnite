import { Module } from '@nestjs/common';

import { SystemController } from './system.controller';
import { SystemService } from './system.service';

// Real host telemetry (CPU / memory / disk) from node:os + node:fs.statfs,
// served at GET /system/stats. Self-contained — no DB, no cross-domain deps.
@Module({
  controllers: [SystemController],
  providers: [SystemService],
})
export class SystemModule {}
