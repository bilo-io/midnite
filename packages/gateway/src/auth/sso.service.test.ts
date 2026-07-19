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

/** The default both-providers sso block; overridable per-test to pin redirect URIs or drop a provider. */
const DEFAULT_SSO = {
  google: { clientId: GOOGLE_CLIENT_ID, clientSecretEnv: 'GOOGLE_SECRET' },
  github: { clientId: 'gh-client-id', clientSecretEnv: 'GITHUB_SECRET' },
};

function makeHarness(ssoConfig: Record<string, unknown> = DEFAULT_SSO): Harness {
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
    gateway: { auth: { sso: ssoConfig } },
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

  // Phase 72 E — a config-pinned `redirectUri` must be the exact string sent to the
  // provider in BOTH the authorize URL and the token exchange. A mismatch in the latter
  // is the classic silent go-live failure (auth step succeeds, exchange 400s). Fixtures
  // cover a local (localhost) and a hosted (https) URI to prove both shapes flow through.
  describe('pinned redirectUri', () => {
    const LOCAL_URI = 'http://localhost:7777/auth/sso/google/callback';
    const HOSTED_URI = 'https://midnite.example.com/auth/sso/github/callback';

    it('pins the configured redirectUri in the Google authorize URL (local fixture)', () => {
      const h2 = makeHarness({ google: { clientId: GOOGLE_CLIENT_ID, clientSecretEnv: 'GOOGLE_SECRET', redirectUri: LOCAL_URI } });
      const url = new URL(h2.sso.buildAuthorizationUrl('google', '/board', 'http://gw.test'));
      expect(url.searchParams.get('redirect_uri')).toBe(LOCAL_URI);
    });

    it('pins the configured redirectUri in the GitHub authorize URL (hosted fixture)', () => {
      const h2 = makeHarness({ github: { clientId: 'gh-client-id', clientSecretEnv: 'GITHUB_SECRET', redirectUri: HOSTED_URI } });
      const url = new URL(h2.sso.buildAuthorizationUrl('github', undefined, 'http://gw.test'));
      expect(url.searchParams.get('redirect_uri')).toBe(HOSTED_URI);
    });

    it('sends the pinned redirectUri in the Google token exchange, not the request-derived one', async () => {
      const h2 = makeHarness({ google: { clientId: GOOGLE_CLIENT_ID, clientSecretEnv: 'GOOGLE_SECRET', redirectUri: LOCAL_URI } });
      const idToken = await googleIdToken({ sub: 'g-pin', email: 'pin@example.com', email_verified: true });
      let sentRedirect: string | null = null;
      vi.stubGlobal('fetch', vi.fn(async (input: unknown, init?: RequestInit) => {
        const url = String(input instanceof Request ? input.url : input);
        if (url.startsWith('https://oauth2.googleapis.com/token')) {
          sentRedirect = new URLSearchParams(String(init?.body)).get('redirect_uri');
          return json({ id_token: idToken });
        }
        throw new Error(`unexpected fetch ${url}`);
      }));
      const state = stateFrom(h2.sso.buildAuthorizationUrl('google', undefined, 'http://gw.test'));
      await h2.sso.handleCallback('google', 'code', state, 'http://gw.test');
      expect(sentRedirect).toBe(LOCAL_URI);
    });

    it('sends the pinned redirectUri in the GitHub token exchange, not the request-derived one', async () => {
      const h2 = makeHarness({ github: { clientId: 'gh-client-id', clientSecretEnv: 'GITHUB_SECRET', redirectUri: HOSTED_URI } });
      let sentRedirect: string | null = null;
      vi.stubGlobal('fetch', vi.fn(async (input: unknown, init?: RequestInit) => {
        const url = String(input instanceof Request ? input.url : input);
        if (url.startsWith('https://github.com/login/oauth/access_token')) {
          sentRedirect = new URLSearchParams(String(init?.body)).get('redirect_uri');
          return json({ access_token: 'gh-token' });
        }
        if (url.startsWith('https://api.github.com/user/emails')) return json([{ email: 'octo@example.com', primary: true, verified: true }]);
        if (url.startsWith('https://api.github.com/user')) return json({ id: 999, login: 'octo' });
        throw new Error(`unexpected fetch ${url}`);
      }));
      const state = stateFrom(h2.sso.buildAuthorizationUrl('github', undefined, 'http://gw.test'));
      await h2.sso.handleCallback('github', 'code', state, 'http://gw.test');
      expect(sentRedirect).toBe(HOSTED_URI);
    });

    it('derives the callback from the request origin when no redirectUri is pinned', () => {
      const h2 = makeHarness(); // default block, no redirectUri
      const url = new URL(h2.sso.buildAuthorizationUrl('github', undefined, 'https://gw.host'));
      expect(url.searchParams.get('redirect_uri')).toBe('https://gw.host/auth/sso/github/callback');
    });
  });

  // Phase 72 E — reassert the resolveClient enablement gate against operator-sourced
  // config: a provider is enabled iff its config block AND its client-secret env are
  // both present; either missing ⇒ it never appears. (The allowlist gate governing
  // first-login provisioning is covered in users.service.test.ts.)
  describe('resolveClient gate (operator-sourced config)', () => {
    it('enables a provider when its config + secret env are both present', () => {
      const h2 = makeHarness();
      expect(h2.sso.enabledProviders().sort()).toEqual(['github', 'google']);
    });

    it('drops a provider whose config is present but secret env is unset', () => {
      const h2 = makeHarness();
      delete process.env['GITHUB_SECRET'];
      expect(h2.sso.enabledProviders()).toEqual(['google']);
    });

    it('drops a provider with no config block even when a matching secret env exists', () => {
      // github omitted from config; GITHUB_SECRET is still set in the environment.
      const h2 = makeHarness({ google: { clientId: GOOGLE_CLIENT_ID, clientSecretEnv: 'GOOGLE_SECRET' } });
      expect(h2.sso.enabledProviders()).toEqual(['google']);
    });
  });
});
