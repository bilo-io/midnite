import { Global, Module } from '@nestjs/common';
import { ConnectionRegistry } from './connection-registry';
import { WsBroadcastService } from './ws-broadcast.service';
import { ReliableBroadcastService } from './reliable-broadcast.service';
import { WsMetricsService } from './ws-metrics.service';
import { HeartbeatService } from './heartbeat.service';
import { WsSettingsController } from './ws-settings.controller';
import { WsMetricsController } from './ws-metrics.controller';

@Global()
@Module({
  controllers: [WsSettingsController, WsMetricsController],
  providers: [
    ConnectionRegistry,
    WsBroadcastService,
    ReliableBroadcastService,
    WsMetricsService,
    HeartbeatService,
  ],
  exports: [ConnectionRegistry, WsBroadcastService, ReliableBroadcastService, WsMetricsService],
})
export class WsModule {}
