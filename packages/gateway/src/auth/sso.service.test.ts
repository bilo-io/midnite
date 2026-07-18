import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK, type JWTVerifyGetKey } from 'jose';
import { parseConfig } from '@midnite/shared';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as schema from '../db/schema';
import { CryptoService } from '../crypto/crypto.service';
import { TeamsRepository } from '../teams/teams.repository';
import { TeamsService } from '../teams/teams.service';
import { UserIdentitiesRepository } from './user-identities.repository';
import { UsersRepository } from '../users/users.repository';
import { SsoEmailConflictError, UsersService } from '../users/users.service';
import { JwtService } from './jwt.service';
import { RefreshTokensRepository } from './refresh-tokens.repository';
import { SsoStateRepository } from './sso-state.repository';
import { SsoService, SsoStateInvalidError } from './sso.service';

const GOOGLE_CLIENT_ID = 'google-client-id';

// A signing key we pretend is Google's — the JWKS fetch is stubbed to return its
// public half, so jwtVerify actually verifies the id_token signature end-to-end.
let privateKey: Awaited<ReturnType<typeof generateKeyPair>>['privateKey'];
let publicJwk: JWK;

beforeAll(async () => {
  const pair = await generateKeyPair('RS256');
  privateKey = pair.privateKey;
  publicJwk = { ...(await exportJWK(pair.publicKey)), kid: 'test-key', alg: 'RS256', use: 'sig' };
});

async function googleIdToken(claims: {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
}): Promise<string> {
  return new SignJWT({ email: claims.email, email_verified: claims.email_verified, name: claims.name })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setIssuer('https://accounts.google.com')
    .setAudience(GOOGLE_CLIENT_ID)
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey);
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

type Harness = {
  sso: SsoService;
  users: UsersService;
};

function makeHarness(): Harness {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(__dirname, '../../drizzle') });

  process.env['MIDNITE_JWT_SECRET'] = 'jwt-secret-that-is-at-least-32-chars-long!';
  process.env['MIDNITE_SECRET_KEY'] = randomBytes(32).toString('hex');
  process.env['GOOGLE_SECRET'] = 'google-secret';
  process.env['GITHUB_SECRET'] = 'github-secret';

  const config = parseConfig({
    agent: {},
    terminal: {},
    gateway: {
      auth: {
        sso: {
          google: { clientId: GOOGLE_CLIENT_ID, clientSecretEnv: 'GOOGLE_SECRET' },
          github: { clientId: 'gh-client-id', clientSecretEnv: 'GITHUB_SECRET' },
        },
      },
    },
  });

  const teams = new TeamsService(new TeamsRepository(db));
  const users = new UsersService(
    new UsersRepository(db),
    teams,
    undefined,
    new UserIdentitiesRepository(db),
  );
  const jwt = new JwtService(config, new RefreshTokensRepository(db));
  // Inject a local JWKS so Google id_token verification is deterministic + offline.
  const googleJwks: JWTVerifyGetKey = createLocalJWKSet({ keys: [publicJwk] });
  const sso = new SsoService(config, new CryptoService(), new SsoStateRepository(db), users, jwt, teams, googleJwks);
  return { sso, users };
}

function stateFrom(url: string): string {
  return new URL(url).searchParams.get('state') ?? '';
}

describe('SsoService', () => {
  let h: Harness;

  beforeEach(() => {
    h = makeHarness();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists providers that are configured with a resolvable secret', () => {
    expect(h.sso.enabledProviders().sort()).toEqual(['github', 'google']);
  });

  it('drops a provider whose client secret env is unset', () => {
    delete process.env['GITHUB_SECRET'];
    expect(h.sso.enabledProviders()).toEqual(['google']);
  });

  it('builds a Google authorize URL carrying an encrypted state + persisting a nonce', () => {
    const url = h.sso.buildAuthorizationUrl('google', '/board', 'http://gw.test');
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(parsed.searchParams.get('client_id')).toBe(GOOGLE_CLIENT_ID);
    expect(parsed.searchParams.get('redirect_uri')).toBe('http://gw.test/auth/sso/google/callback');
    expect(parsed.searchParams.get('state')).toBeTruthy();
  });

  it('completes the Google flow: verify id_token → provision → exchange to JWTs', async () => {
    const idToken = await googleIdToken({ sub: 'g-sub-1', email: 'alice@example.com', email_verified: true, name: 'Alice' });
    vi.stubGlobal('fetch', vi.fn(async (input: unknown) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.startsWith('https://oauth2.googleapis.com/token')) return json({ id_token: idToken });
      throw new Error(`unexpected fetch ${url}`);
    }));

    const url = h.sso.buildAuthorizationUrl('google', '/board', 'http://gw.test');
    const { exchangeCode, redirect } = await h.sso.handleCallback('google', 'auth-code', stateFrom(url), 'http://gw.test');
    expect(redirect).toBe('/board');

    const auth = h.sso.exchangeCode(exchangeCode);
    expect(auth.accessToken).toBeTruthy();
    expect(auth.refreshToken).toBeTruthy();
    expect(auth.user.email).toBe('alice@example.com');
    expect(auth.user.identities).toEqual([{ provider: 'google', email: 'alice@example.com' }]);
  });

  it('rejects a replayed state (nonce consumed) and a tampered state', async () => {
    const idToken = await googleIdToken({ sub: 'g-sub-2', email: 'bob@example.com', email_verified: true });
    vi.stubGlobal('fetch', vi.fn(async (input: unknown) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.startsWith('https://oauth2.googleapis.com/token')) return json({ id_token: idToken });
      throw new Error(`unexpected fetch ${url}`);
    }));
    const state = stateFrom(h.sso.buildAuthorizationUrl('google', undefined, 'http://gw.test'));
    await h.sso.handleCallback('google', 'code', state, 'http://gw.test');
    // Same state again → its nonce row is gone → replay rejected.
    await expect(h.sso.handleCallback('google', 'code', state, 'http://gw.test')).rejects.toThrow(SsoStateInvalidError);
    // Garbage state → cannot decrypt.
    await expect(h.sso.handleCallback('google', 'code', 'not-a-real-state', 'http://gw.test')).rejects.toThrow(SsoStateInvalidError);
  });

  it('rejects an unverified Google email that collides with an existing account', async () => {
    await h.users.register('carol@example.com', 'Carol', 'Password123!');
    const idToken = await googleIdToken({ sub: 'g-sub-3', email: 'carol@example.com', email_verified: false });
    vi.stubGlobal('fetch', vi.fn(async (input: unknown) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.startsWith('https://oauth2.googleapis.com/token')) return json({ id_token: idToken });
      throw new Error(`unexpected fetch ${url}`);
    }));
    const state = stateFrom(h.sso.buildAuthorizationUrl('google', undefined, 'http://gw.test'));
    await expect(h.sso.handleCallback('google', 'code', state, 'http://gw.test')).rejects.toThrow(SsoEmailConflictError);
  });

  it('completes the GitHub flow using the primary+verified email', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: unknown) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.startsWith('https://github.com/login/oauth/access_token')) return json({ access_token: 'gh-token' });
      if (url.startsWith('https://api.github.com/user/emails')) {
        return json([
          { email: 'secondary@example.com', primary: false, verified: true },
          { email: 'octo@example.com', primary: true, verified: true },
        ]);
      }
      if (url.startsWith('https://api.github.com/user')) return json({ id: 424242, login: 'octo', name: 'Octo Cat' });
      throw new Error(`unexpected fetch ${url}`);
    }));

    const state = stateFrom(h.sso.buildAuthorizationUrl('github', undefined, 'http://gw.test'));
    const { exchangeCode } = await h.sso.handleCallback('github', 'code', state, 'http://gw.test');
    const auth = h.sso.exchangeCode(exchangeCode);
    expect(auth.user.email).toBe('octo@example.com');
    expect(auth.user.identities).toEqual([{ provider: 'github', email: 'octo@example.com' }]);
  });

  it('rejects an expired exchange code', () => {
    expect(() => h.sso.exchangeCode('never-issued')).toThrow(SsoStateInvalidError);
  });
});
