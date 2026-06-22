import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { GatewayAuthGuard } from './gateway-auth.guard';
import { RateLimitGuard } from './rate-limit.guard';

/**
 * Optional remote-access auth (Phase 7 A5). Registers two global guards, in order:
 * rate-limit first (so an unauthenticated flood is throttled before the token
 * check), then bearer auth. Both are inert under the local-only defaults
 * (`max: 0`, no token), so importing this module is behaviour-preserving until the
 * operator opts in via `gateway.auth`.
 */
@Module({
  providers: [
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: GatewayAuthGuard },
  ],
})
export class AuthModule {}
