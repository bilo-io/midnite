import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PresenceController } from './presence.controller';
import { PresenceGateway } from './presence.gateway';
import { PresenceService } from './presence.service';

/**
 * Phase 64 — office multiplayer presence. A thin WS module: the gateway parses
 * typed frames, the service holds the ephemeral last-known-state map + tick
 * fan-out. Theme F adds a REST `GET /presence/summary` for the app-wide surfaces.
 * Reuses the `@Global` WsModule (ConnectionRegistry + WsBroadcastService) and
 * AuthModule (JwtService for the handshake); zero DB.
 */
@Module({
  imports: [AuthModule],
  controllers: [PresenceController],
  providers: [PresenceService, PresenceGateway],
  exports: [PresenceService],
})
export class PresenceModule {}
