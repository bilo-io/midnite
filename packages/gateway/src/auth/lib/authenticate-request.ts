import { bearerTokenFromHeader, isValidBearer } from './auth-policy';
import type { JwtService } from '../jwt.service';
import type { ServiceTokensService } from '../../service-tokens/service-tokens.service';

/** The principal attached to `req.user` once a request authenticates. */
export type AuthenticatedUser = { userId: string; email: string; teamId: string | null };

/** The credential paths available to verify a request. A static-bearer match
 * authenticates the request but carries no user identity (`user: null`). */
export type AuthenticateDeps = {
  /** Static bearer token (`resolveAuthToken`), or null when unset. */
  token: string | null;
  jwtSvc?: Pick<JwtService, 'enabled' | 'verifyAccessToken'>;
  serviceTokens?: Pick<ServiceTokensService, 'validate'>;
};

/**
 * Verify a request's `Authorization` bearer against the enabled credential paths
 * — JWT → service token → static token — returning `{ user }` when a credential
 * is valid (user is `null` for the static-token path, which authenticates but has
 * no identity), else `null`.
 *
 * Single source of truth shared by {@link GatewayAuthGuard} (which protects routes
 * by throwing on `null`) and the health controller (which gates whether the
 * auth-exempt `/health/preflight` + `/health/ready` probes include the granular
 * `detail`/`remedy` — Phase 72 C), so "who counts as authenticated" can't drift
 * between the two.
 */
export function authenticateRequest(
  headers: Record<string, string | string[] | undefined>,
  deps: AuthenticateDeps,
): { user: AuthenticatedUser | null } | null {
  const rawHeader = headers['authorization'];
  const header = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  const bearer = bearerTokenFromHeader(header);

  if (bearer && deps.jwtSvc?.enabled) {
    try {
      const payload = deps.jwtSvc.verifyAccessToken(bearer);
      return { user: { userId: payload.sub, email: payload.email, teamId: payload.teamId ?? null } };
    } catch {
      // Not a valid JWT — fall through to the service-token / static-token paths.
    }
  }

  if (bearer && deps.serviceTokens) {
    const st = deps.serviceTokens.validate(bearer);
    if (st) {
      return { user: { userId: st.createdBy ?? 'service', email: '', teamId: st.teamId ?? null } };
    }
  }

  if (deps.token && isValidBearer(header, deps.token)) {
    return { user: null };
  }

  return null;
}
