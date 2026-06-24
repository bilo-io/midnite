import { createHash, randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import type { MidniteConfig } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { RefreshTokensRepository } from './refresh-tokens.repository';

export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
}

export class TokenInvalidError extends Error {
  constructor() {
    super('invalid or expired token');
    this.name = 'TokenInvalidError';
  }
}

export class RefreshTokenRevokedError extends Error {
  constructor() {
    super('refresh token has been revoked or expired');
    this.name = 'RefreshTokenRevokedError';
  }
}

@Injectable()
export class JwtService {
  private readonly logger = new Logger(JwtService.name);
  private readonly secret: string | null;

  constructor(
    @Inject(MIDNITE_CONFIG) private readonly config: MidniteConfig,
    private readonly refreshRepo: RefreshTokensRepository,
  ) {
    const raw = process.env[config.gateway.auth.jwt.secretEnv];
    this.secret = raw?.trim() || null;
    if (this.secret) {
      this.logger.log('JWT auth enabled');
    }
  }

  get enabled(): boolean {
    return this.secret !== null;
  }

  issueAccessToken(userId: string, email: string): string {
    if (!this.secret) throw new Error('JWT secret not configured');
    return jwt.sign({ email } as Record<string, unknown>, this.secret, {
      subject: userId,
      expiresIn: this.config.gateway.auth.jwt.accessTtlSeconds,
      algorithm: 'HS256',
    });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    if (!this.secret) throw new TokenInvalidError();
    try {
      const payload = jwt.verify(token, this.secret, { algorithms: ['HS256'] }) as jwt.JwtPayload;
      if (typeof payload.sub !== 'string' || typeof payload['email'] !== 'string') {
        throw new TokenInvalidError();
      }
      return { sub: payload.sub, email: payload['email'] as string };
    } catch {
      throw new TokenInvalidError();
    }
  }

  issueRefreshToken(userId: string): string {
    if (!this.secret) throw new Error('JWT secret not configured');
    const token = randomUUID();
    const tokenHash = this.hashToken(token);
    const ttlDays = this.config.gateway.auth.jwt.refreshTtlDays;
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();
    this.refreshRepo.insert({
      id: randomUUID(),
      userId,
      tokenHash,
      expiresAt,
      revokedAt: null,
      createdAt: new Date().toISOString(),
    });
    return token;
  }

  consumeRefreshToken(token: string): string {
    const tokenHash = this.hashToken(token);
    const row = this.refreshRepo.findByHash(tokenHash);
    if (!row) throw new RefreshTokenRevokedError();
    if (new Date(row.expiresAt) < new Date()) {
      this.refreshRepo.revoke(row.id, new Date().toISOString());
      throw new RefreshTokenRevokedError();
    }
    this.refreshRepo.revoke(row.id, new Date().toISOString());
    return row.userId;
  }

  revokeAllForUser(userId: string): void {
    this.refreshRepo.revokeAllForUser(userId, new Date().toISOString());
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
