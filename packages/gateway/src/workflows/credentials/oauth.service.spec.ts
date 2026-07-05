import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { BadRequestException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseConfig } from '@midnite/shared';
import * as schema from '../../db/schema';
import { CryptoService, SECRET_KEY_ENV } from '../../crypto/crypto.service';
import { WorkflowCredentialsRepository } from './workflow-credentials.repository';
import { WorkflowCredentialsService } from './workflow-credentials.service';
import { OAuthService } from './oauth.service';

const KEY = 'b'.repeat(64);

function makeDb() {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(__dirname, '../../../drizzle') });
  return db;
}

const BASE_CONFIG = parseConfig({
  agent: {},
  terminal: {},
  gateway: {},
  workflows: {
    enabled: true,
    oauth: {
      google: {
        clientId: 'google-client-id',
        clientSecretEnv: 'TEST_GOOGLE_SECRET',
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      },
      slack: {
        clientId: 'slack-client-id',
        clientSecretEnv: 'TEST_SLACK_SECRET',
        scopes: ['channels:read', 'chat:write'],
      },
    },
  },
});

function build() {
  const db = makeDb();
  const crypto = new CryptoService();
  const repo = new WorkflowCredentialsRepository(db, crypto);
  const credService = new WorkflowCredentialsService(repo);
  const oauthService = new OAuthService(BASE_CONFIG, crypto, credService);
  credService.setOAuthService(oauthService);
  return { credService, oauthService };
}

describe('OAuthService.buildAuthorizationUrl', () => {
  beforeEach(() => {
    process.env[SECRET_KEY_ENV] = KEY;
    process.env['TEST_GOOGLE_SECRET'] = 'google-secret';
    process.env['TEST_SLACK_SECRET'] = 'slack-secret';
  });
  afterEach(() => {
    delete process.env[SECRET_KEY_ENV];
    delete process.env['TEST_GOOGLE_SECRET'];
    delete process.env['TEST_SLACK_SECRET'];
  });

  it('returns a google consent URL with required params', () => {
    const { oauthService } = build();
    const url = new URL(
      oauthService.buildAuthorizationUrl(
        'google',
        'My Google Creds',
        'http://localhost:3000/settings/credentials',
        'http://localhost:7777',
      ),
    );
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('client_id')).toBe('google-client-id');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:7777/oauth/google/callback');
    expect(url.searchParams.get('state')).toBeTruthy();
  });

  it('returns a slack authorization URL with required params', () => {
    const { oauthService } = build();
    const url = new URL(
      oauthService.buildAuthorizationUrl(
        'slack',
        'My Slack Creds',
        'http://localhost:3000/settings/credentials',
        'http://localhost:7777',
      ),
    );
    expect(url.origin + url.pathname).toBe('https://slack.com/oauth/v2/authorize');
    expect(url.searchParams.get('client_id')).toBe('slack-client-id');
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:7777/oauth/slack/callback');
    expect(url.searchParams.get('scope')).toBe('channels:read,chat:write');
    expect(url.searchParams.get('state')).toBeTruthy();
  });

  it('throws 400 when provider is not configured', () => {
    const config = parseConfig({ agent: {}, terminal: {}, gateway: {}, workflows: { enabled: true } });
    const crypto = new CryptoService();
    const db = makeDb();
    const repo = new WorkflowCredentialsRepository(db, crypto);
    const credService = new WorkflowCredentialsService(repo);
    const svc = new OAuthService(config, crypto, credService);
    expect(() =>
      svc.buildAuthorizationUrl('google', 'name', 'http://localhost:3000', 'http://localhost:7777'),
    ).toThrow(BadRequestException);
  });

  it('throws 400 when client secret env var is missing', () => {
    delete process.env['TEST_GOOGLE_SECRET'];
    const { oauthService } = build();
    expect(() =>
      oauthService.buildAuthorizationUrl(
        'google',
        'name',
        'http://localhost:3000',
        'http://localhost:7777',
      ),
    ).toThrow(BadRequestException);
  });

  it('embeds an encrypted, recoverable state blob', () => {
    const { oauthService, credService: _ } = build();
    const url = new URL(
      oauthService.buildAuthorizationUrl(
        'google',
        'Test Cred',
        'http://localhost:3000/done',
        'http://localhost:7777',
      ),
    );
    const state = url.searchParams.get('state')!;
    expect(state).toMatch(/^v1:/);
  });
});

describe('OAuthService.handleCallback', () => {
  beforeEach(() => {
    process.env[SECRET_KEY_ENV] = KEY;
    process.env['TEST_GOOGLE_SECRET'] = 'google-secret';
    process.env['TEST_SLACK_SECRET'] = 'slack-secret';
  });
  afterEach(() => {
    delete process.env[SECRET_KEY_ENV];
    delete process.env['TEST_GOOGLE_SECRET'];
    delete process.env['TEST_SLACK_SECRET'];
    vi.restoreAllMocks();
  });

  it('exchanges a google code for tokens and stores a credential', async () => {
    const { oauthService, credService } = build();
    const authUrl = oauthService.buildAuthorizationUrl(
      'google',
      'My Google Sheets',
      'http://localhost:3000/settings/credentials',
      'http://localhost:7777',
    );
    const state = new URL(authUrl).searchParams.get('state')!;

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'ya29.access',
            refresh_token: 'rt-refresh',
            expires_in: 3600,
            scope: 'https://www.googleapis.com/auth/drive.file',
            token_type: 'Bearer',
          }),
      }),
    );

    const { credential, redirectUri } = await oauthService.handleCallback(
      'google',
      'auth-code-xyz',
      state,
      'http://localhost:7777',
    );

    expect(credential.type).toBe('google-oauth');
    expect(credential.name).toBe('My Google Sheets');
    expect(redirectUri).toBe('http://localhost:3000/settings/credentials');
    expect(JSON.stringify(credential)).not.toContain('ya29.access');

    // The secret is resolvable server-side.
    const data = await credService.resolve(credential.id);
    expect(data?.type).toBe('google-oauth');
    if (data?.type === 'google-oauth') {
      expect(data.accessToken).toBe('ya29.access');
      expect(data.refreshToken).toBe('rt-refresh');
    }
  });

  it('exchanges a slack code for tokens and stores a credential', async () => {
    const { oauthService, credService } = build();
    const authUrl = oauthService.buildAuthorizationUrl(
      'slack',
      'My Slack',
      'http://localhost:3000/settings/credentials',
      'http://localhost:7777',
    );
    const state = new URL(authUrl).searchParams.get('state')!;

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            ok: true,
            access_token: 'xoxb-slack-token',
            scope: 'channels:read,chat:write',
            team: { id: 'T123ABC', name: 'My Team' },
          }),
      }),
    );

    const { credential } = await oauthService.handleCallback(
      'slack',
      'auth-code-abc',
      state,
      'http://localhost:7777',
    );

    expect(credential.type).toBe('slack-oauth');
    const data = await credService.resolve(credential.id);
    if (data?.type === 'slack-oauth') {
      expect(data.teamId).toBe('T123ABC');
      expect(data.accessToken).toBe('xoxb-slack-token');
    }
  });

  it('throws 400 on invalid state', async () => {
    const { oauthService } = build();
    await expect(
      oauthService.handleCallback('google', 'code', 'invalid-state', 'http://localhost:7777'),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws 400 when provider in state does not match path param', async () => {
    const { oauthService } = build();
    const authUrl = oauthService.buildAuthorizationUrl(
      'slack',
      'name',
      'http://localhost:3000',
      'http://localhost:7777',
    );
    const slackState = new URL(authUrl).searchParams.get('state')!;
    await expect(
      oauthService.handleCallback('google', 'code', slackState, 'http://localhost:7777'),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws 400 when the google token exchange fails', async () => {
    const { oauthService } = build();
    const authUrl = oauthService.buildAuthorizationUrl(
      'google',
      'name',
      'http://localhost:3000',
      'http://localhost:7777',
    );
    const state = new URL(authUrl).searchParams.get('state')!;

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 400, text: () => Promise.resolve('error') }),
    );

    await expect(
      oauthService.handleCallback('google', 'bad-code', state, 'http://localhost:7777'),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('OAuthService.refreshGoogleToken', () => {
  beforeEach(() => {
    process.env[SECRET_KEY_ENV] = KEY;
    process.env['TEST_GOOGLE_SECRET'] = 'google-secret';
  });
  afterEach(() => {
    delete process.env[SECRET_KEY_ENV];
    delete process.env['TEST_GOOGLE_SECRET'];
    vi.restoreAllMocks();
  });

  it('refreshes an expired google token and updates the credential', async () => {
    const { credService } = build();

    // Create the initial credential directly.
    const cred = credService.create({
      name: 'Google Sheets',
      data: {
        type: 'google-oauth',
        accessToken: 'old-token',
        refreshToken: 'rt-token',
        expiresAt: new Date(Date.now() - 1000).toISOString(), // already expired
        scope: 'https://www.googleapis.com/auth/drive.file',
      },
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'new-token',
            expires_in: 3600,
            scope: 'https://www.googleapis.com/auth/drive.file',
            token_type: 'Bearer',
          }),
      }),
    );

    // resolve() should trigger the refresh transparently.
    const data = await credService.resolve(cred.id);
    expect(data?.type).toBe('google-oauth');
    if (data?.type === 'google-oauth') {
      expect(data.accessToken).toBe('new-token');
    }
  });

  it('returns stale token when refresh fails (fail-open on stale vs fail-closed on no token)', async () => {
    const { credService } = build();
    const cred = credService.create({
      name: 'Google Sheets',
      data: {
        type: 'google-oauth',
        accessToken: 'stale-token',
        refreshToken: 'rt-token',
        expiresAt: new Date(Date.now() - 1000).toISOString(),
        scope: 'scope',
      },
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }));

    const data = await credService.resolve(cred.id);
    // Falls back to stale token rather than null — callers can attempt and fail naturally.
    expect(data?.type).toBe('google-oauth');
    if (data?.type === 'google-oauth') {
      expect(data.accessToken).toBe('stale-token');
    }
  });
});
