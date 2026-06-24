import { Global, Module } from '@nestjs/common';
import { ConnectionRegistry } from './connection-registry';
import { WsBroadcastService } from './ws-broadcast.service';

@Global()
@Module({
  providers: [ConnectionRegistry, WsBroadcastService],
  exports: [ConnectionRegistry, WsBroadcastService],
})
export class WsModule {}
