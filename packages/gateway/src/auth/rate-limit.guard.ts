import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { MidniteConfig } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { isAuthExemptPath } from './lib/auth-policy';

type IncomingRequest = { url?: string; ip?: string };

/**
 * Basic per-IP fixed-window rate limit (Phase 7 A5). Off by default (`max: 0`) —
 * a local single-user gateway needs no throttling. When enabled it bounds bursts
 * (incl. brute-forcing the bearer token) per IP. Runs before the auth guard so an
 * unauthenticated flood is throttled too. In-memory: a single-process gateway, so
 * no shared store needed; `/health` is never throttled (probes hit it often).
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly windowMs: number;
  private readonly max: number;
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(@Inject(MIDNITE_CONFIG) config: MidniteConfig) {
    this.windowMs = config.gateway.auth.rateLimit.windowMs;
    this.max = config.gateway.auth.rateLimit.max;
  }

  canActivate(context: ExecutionContext): boolean {
    if (this.max <= 0) return true; // disabled
    if (context.getType() !== 'http') return true;

    const req = context.switchToHttp().getRequest<IncomingRequest>();
    if (isAuthExemptPath(req.url ?? '/')) return true;

    const ip = req.ip ?? 'unknown';
    const now = Date.now();
    const bucket = this.hits.get(ip);
    if (!bucket || now >= bucket.resetAt) {
      // Drop expired buckets before adding a fresh one so a long-running gateway
      // seeing many distinct IPs can't accumulate them unbounded.
      if (this.hits.size > 1024) {
        for (const [k, v] of this.hits) if (now >= v.resetAt) this.hits.delete(k);
      }
      this.hits.set(ip, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    bucket.count += 1;
    if (bucket.count > this.max) {
      throw new HttpException('rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
