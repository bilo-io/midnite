import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isOperatorEmail, type MidniteConfig } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { REQUIRE_OPERATOR_KEY } from './decorators/require-operator.decorator';

type IncomingRequest = {
  user?: { userId: string; email: string; teamId: string | null };
};

/**
 * Global operator gate (Phase 73 D). Registered as an `APP_GUARD` after
 * `GatewayAuthGuard` (which populates `req.user`), so it can read the authenticated
 * principal. A **no-op** on routes without `@RequiresOperator` — like `RoleGuard`,
 * one global instance guards the whole app cheaply.
 *
 * On a `@RequiresOperator` route:
 * - **401** when there is no authenticated user (`req.user` unset — anonymous, or an
 *   auth-off / static-token install that carries no operator identity): the operator
 *   console requires a real login. Closes the single-user/static-token bypass.
 * - **403** when the user is authenticated but their email is not in
 *   `gateway.auth.operators` (fail-closed; empty list ⇒ nobody is an operator).
 */
@Injectable()
export class OperatorGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    const required = this.reflector.getAllAndOverride<boolean | undefined>(REQUIRE_OPERATOR_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const req = context.switchToHttp().getRequest<IncomingRequest>();
    const email = req.user?.email;
    if (!email) throw new UnauthorizedException('operator authentication required');
    if (!isOperatorEmail(this.config, email)) throw new ForbiddenException('operator access required');
    return true;
  }
}
