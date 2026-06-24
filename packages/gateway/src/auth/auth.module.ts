import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DbModule } from '../db/db.module';
import { UsersModule } from '../users/users.module';
import { TeamsModule } from '../teams/teams.module';
import { AuthController } from './auth.controller';
import { GatewayAuthGuard } from './gateway-auth.guard';
import { JwtService } from './jwt.service';
import { RateLimitGuard } from './rate-limit.guard';
import { RefreshTokensRepository } from './refresh-tokens.repository';

/**
 * Auth module (Phase 7 A5 + Phase 33 A3).
 *
 * Phase 7: two global guards (rate-limit + bearer). Inert under local-only defaults.
 * Phase 33: JwtService (HS256 access + refresh tokens), AuthController (register /
 * login / refresh / logout / me). JWT is opt-in via MIDNITE_JWT_SECRET; the static-
 * bearer fallback remains for legacy / script use.
 * Phase 35: imports TeamsModule so AuthController can embed the user's primary teamId
 * in the JWT on login/register/refresh.
 */
@Module({
  imports: [DbModule, UsersModule, TeamsModule],
  controllers: [AuthController],
  providers: [
    RefreshTokensRepository,
    JwtService,
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: GatewayAuthGuard },
  ],
  exports: [JwtService],
})
export class AuthModule {}
