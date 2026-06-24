import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { parseConfig } from '@midnite/shared';
import * as schema from '../db/schema';
import { RefreshTokensRepository } from './refresh-tokens.repository';
import { JwtService, RefreshTokenRevokedError, TokenInvalidError } from './jwt.service';

const JWT_SECRET = 'test-secret-that-is-at-least-32-chars-long';

function makeService(): JwtService {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(__dirname, '../../drizzle') });
  const repo = new RefreshTokensRepository(db);
  process.env['MIDNITE_JWT_SECRET'] = JWT_SECRET;
  const config = parseConfig({ agent: {}, terminal: {}, gateway: {} });
  return new JwtService(config, repo);
}

describe('JwtService', () => {
  let svc: JwtService;

  beforeEach(() => {
    svc = makeService();
  });

  it('is enabled when secret env is set', () => {
    expect(svc.enabled).toBe(true);
  });

  it('issues and verifies an access token', () => {
    const token = svc.issueAccessToken('user-1', 'alice@example.com');
    const payload = svc.verifyAccessToken(token);
    expect(payload.sub).toBe('user-1');
    expect(payload.email).toBe('alice@example.com');
  });

  it('rejects a tampered access token', () => {
    const token = svc.issueAccessToken('user-1', 'alice@example.com');
    expect(() => svc.verifyAccessToken(token + 'x')).toThrow(TokenInvalidError);
  });

  it('issues and consumes a refresh token', () => {
    const token = svc.issueRefreshToken('user-1');
    const userId = svc.consumeRefreshToken(token);
    expect(userId).toBe('user-1');
  });

  it('rejects a refresh token after it is consumed', () => {
    const token = svc.issueRefreshToken('user-1');
    svc.consumeRefreshToken(token);
    expect(() => svc.consumeRefreshToken(token)).toThrow(RefreshTokenRevokedError);
  });

  it('revokeAllForUser blocks all outstanding refresh tokens', () => {
    const t1 = svc.issueRefreshToken('user-2');
    const t2 = svc.issueRefreshToken('user-2');
    svc.revokeAllForUser('user-2');
    expect(() => svc.consumeRefreshToken(t1)).toThrow(RefreshTokenRevokedError);
    expect(() => svc.consumeRefreshToken(t2)).toThrow(RefreshTokenRevokedError);
  });
});
