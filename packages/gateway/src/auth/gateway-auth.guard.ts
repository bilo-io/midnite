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
import {
  isAuthExemptPath,
  isLoopbackHost,
  isPublicInboundReceiver,
  isValidBearer,
  resolveAuthToken,
} from './lib/auth-policy';
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

    const authHeader = req.headers['authorization'];
    const bearer = extractBearerToken(authHeader);

    if (bearer && this.jwtSvc?.enabled) {
      try {
        const payload = this.jwtSvc.verifyAccessToken(bearer);
        req.user = { userId: payload.sub, email: payload.email, teamId: payload.teamId ?? null };
        return true;
      } catch {
        // fall through to service-token / static-token check
      }
    }

    // Service account tokens: `mnt_<hex>` bearer values issued by /service-tokens.
    if (bearer && this.serviceTokens) {
      const st = this.serviceTokens.validate(bearer);
      if (st) {
        req.user = {
          userId: st.createdBy ?? 'service',
          email: '',
          teamId: st.teamId ?? null,
        };
        return true;
      }
    }

    if (this.token && isValidBearer(authHeader, this.token)) return true;

    throw new UnauthorizedException('missing or invalid bearer token');
  }
}

function extractBearerToken(header: string | string[] | undefined): string | null {
  const value = Array.isArray(header) ? header[0] : header;
  if (!value || !value.startsWith('Bearer ')) return null;
  return value.slice(7).trim() || null;
}
