import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DbModule } from '../db/db.module';
import { UsersModule } from '../users/users.module';
import { TeamsModule } from '../teams/teams.module';
import { AuthController } from './auth.controller';
import { GatewayAuthGuard } from './gateway-auth.guard';
import { JwtService } from './jwt.service';
import { OwnershipService } from './ownership.service';
import { RateLimitGuard } from './rate-limit.guard';
import { RefreshTokensRepository } from './refresh-tokens.repository';
import { RoleGuard } from './role.guard';

/**
 * Auth module (Phase 7 A5 + Phase 33 A3 + Phase 35 B1).
 *
 * Phase 7: two global guards (rate-limit + bearer). Inert under local-only defaults.
 * Phase 33: JwtService (HS256 access + refresh tokens), AuthController (register /
 * login / refresh / logout / me). JWT is opt-in via MIDNITE_JWT_SECRET; the static-
 * bearer fallback remains for legacy / script use.
 * Phase 35: imports TeamsModule so AuthController can embed the user's primary teamId
 * in the JWT on login/register/refresh. Exports RoleGuard + OwnershipService for use
 * on mutation routes across all feature modules.
 */
@Module({
  imports: [DbModule, UsersModule, TeamsModule],
  controllers: [AuthController],
  providers: [
    RefreshTokensRepository,
    JwtService,
    RoleGuard,
    OwnershipService,
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: GatewayAuthGuard },
    // Global singleton: RoleGuard is a no-op on routes without @RequiresRole, so
    // registering it globally is safe and avoids per-module TeamsService resolution.
    { provide: APP_GUARD, useClass: RoleGuard },
  ],
  exports: [JwtService, RoleGuard, OwnershipService],
})
export class AuthModule {}
