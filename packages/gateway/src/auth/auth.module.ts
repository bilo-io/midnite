import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DbModule } from '../db/db.module';
import { UsersModule } from '../users/users.module';
import { TeamsModule } from '../teams/teams.module';
import { AuthController } from './auth.controller';
import { GatewayAuthGuard } from './gateway-auth.guard';
import { JwtService } from './jwt.service';
import { OperatorGuard } from './operator.guard';
import { OwnershipService } from './ownership.service';
import { RateLimitGuard } from './rate-limit.guard';
import { RefreshTokensRepository } from './refresh-tokens.repository';
import { RoleGuard } from './role.guard';
import { SsoController } from './sso.controller';
import { SsoService } from './sso.service';
import { SsoStateRepository } from './sso-state.repository';

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
  controllers: [AuthController, SsoController],
  providers: [
    RefreshTokensRepository,
    JwtService,
    SsoService,
    SsoStateRepository,
    RoleGuard,
    OperatorGuard,
    OwnershipService,
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: GatewayAuthGuard },
    // Global singleton: RoleGuard is a no-op on routes without @RequiresRole, so
    // registering it globally is safe and avoids per-module TeamsService resolution.
    { provide: APP_GUARD, useClass: RoleGuard },
    // Operator gate (Phase 73 D) — runs after GatewayAuthGuard (so req.user is set);
    // no-op on routes without @RequiresOperator.
    { provide: APP_GUARD, useClass: OperatorGuard },
  ],
  exports: [JwtService, RoleGuard, OperatorGuard, OwnershipService],
})
export class AuthModule {}
