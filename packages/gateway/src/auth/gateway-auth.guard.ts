import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { MidniteConfig } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { isLoopbackHost } from './lib/auth-policy';
import { bearerTokenFromHeader, isAuthExemptPath, resolveAuthToken, safeEqual } from './lib/auth-policy';

type IncomingRequest = { url?: string; headers: Record<string, string | string[] | undefined> };

/**
 * Optional bearer-token auth for the REST API (Phase 7 A5). A global guard, so the
 * API is deny-by-default once a token is configured. Off when no token is resolved
 * (the local-only default) — then every request passes, behaviour-preserving.
 *
 * Exempt: `/health` (liveness) and `/hooks/*` (own per-session secret). WS handlers
 * aren't covered (the terminal WS already uses one-time tokens); guarding the
 * board/workflow WS streams is a follow-on.
 */
@Injectable()
export class GatewayAuthGuard implements CanActivate {
  private readonly logger = new Logger(GatewayAuthGuard.name);
  private readonly token: string | null;

  constructor(@Inject(MIDNITE_CONFIG) config: MidniteConfig) {
    this.token = resolveAuthToken(config);
    if (this.token) {
      this.logger.log('REST API bearer auth enabled');
    } else if (!isLoopbackHost(config.gateway.host)) {
      // Reaching here means requireOnNonLoopback was turned off (boot would
      // otherwise have refused) — leave a breadcrumb that the API is open.
      this.logger.warn(
        `gateway bound to non-loopback host ${config.gateway.host} with no auth token — REST API is unauthenticated`,
      );
    }
  }

  canActivate(context: ExecutionContext): boolean {
    // Only HTTP is guarded; WS handlers use their own token flow.
    if (context.getType() !== 'http') return true;
    if (!this.token) return true; // auth disabled

    const req = context.switchToHttp().getRequest<IncomingRequest>();
    if (isAuthExemptPath(req.url ?? '/')) return true;

    const header = req.headers['authorization'];
    const presented = bearerTokenFromHeader(Array.isArray(header) ? header[0] : header);
    if (!presented || !safeEqual(presented, this.token)) {
      throw new UnauthorizedException('missing or invalid bearer token');
    }
    return true;
  }
}
