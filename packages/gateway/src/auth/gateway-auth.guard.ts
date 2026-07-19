import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import type { MidniteConfig } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { isAuthExemptPath, isLoopbackHost, isPublicInboundReceiver, resolveAuthToken } from './lib/auth-policy';
import { authenticateRequest } from './lib/authenticate-request';
import type { JwtService } from './jwt.service';
import type { ServiceTokensService } from '../service-tokens/service-tokens.service';

type IncomingRequest = {
  url?: string;
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  user?: { userId: string; email: string; teamId: string | null };
};

/**
 * Optional bearer-token auth for the REST API (Phase 7 A5 + Phase 33 A4).
 *
 * Phase 33 upgrade: when JWT auth is enabled (MIDNITE_JWT_SECRET is set) the
 * guard also accepts HS256 JWTs and attaches req.user = { userId, email }.
 * The legacy static-bearer path remains as a fallback for dev / scripts.
 */
@Injectable()
export class GatewayAuthGuard implements CanActivate {
  private readonly logger = new Logger(GatewayAuthGuard.name);
  private readonly token: string | null;

  constructor(
    @Inject(MIDNITE_CONFIG) config: MidniteConfig,
    @Optional() private readonly jwtSvc?: JwtService,
    @Optional() private readonly serviceTokens?: ServiceTokensService,
  ) {
    this.token = resolveAuthToken(config);
    if (this.token) {
      this.logger.log('REST API bearer auth enabled');
    } else if (!isLoopbackHost(config.gateway.host)) {
      this.logger.warn(
        `gateway bound to non-loopback host ${config.gateway.host} with no auth token — REST API is unauthenticated`,
      );
    }
  }

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;
    if (!this.token && !this.jwtSvc?.enabled) return true;

    const req = context.switchToHttp().getRequest<IncomingRequest>();
    if (isAuthExemptPath(req.url ?? '/')) return true;
    // The inbound receiver authenticates by provider HMAC, not a session bearer.
    if (isPublicInboundReceiver(req.method, req.url ?? '/')) return true;

    // JWT → service token → static token, via the shared helper the health
    // controller also uses (Phase 72 C) so the two never disagree on auth.
    const auth = authenticateRequest(req.headers, {
      token: this.token,
      jwtSvc: this.jwtSvc,
      serviceTokens: this.serviceTokens,
    });
    if (!auth) throw new UnauthorizedException('missing or invalid bearer token');
    if (auth.user) req.user = auth.user;
    return true;
  }
}
