import { Global, Module } from '@nestjs/common';
import { ConnectionRegistry } from './connection-registry';
import { WsBroadcastService } from './ws-broadcast.service';
import { ReliableBroadcastService } from './reliable-broadcast.service';
import { WsSettingsController } from './ws-settings.controller';

@Global()
@Module({
  controllers: [WsSettingsController],
  providers: [ConnectionRegistry, WsBroadcastService, ReliableBroadcastService],
  exports: [ConnectionRegistry, WsBroadcastService, ReliableBroadcastService],
})
export class WsModule {}
