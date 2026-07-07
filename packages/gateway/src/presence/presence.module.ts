import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PresenceGateway } from './presence.gateway';
import { PresenceService } from './presence.service';

/**
 * Phase 64 — office multiplayer presence. A thin WS module: the gateway parses
 * typed frames, the service holds the ephemeral last-known-state map + tick
 * fan-out. Reuses the `@Global` WsModule (ConnectionRegistry + WsBroadcastService)
 * and AuthModule (JwtService for the handshake); zero DB.
 */
@Module({
  imports: [AuthModule],
  providers: [PresenceService, PresenceGateway],
  exports: [PresenceService],
})
export class PresenceModule {}
