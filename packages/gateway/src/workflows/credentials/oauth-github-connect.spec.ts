import { resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { BadRequestException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseConfig, type MidniteConfig } from '@midnite/shared';
import * as schema from '../../db/schema';
import { CryptoService, SECRET_KEY_ENV } from '../../crypto/crypto.service';
import { WorkflowCredentialsRepository } from './workflow-credentials.repository';
import { WorkflowCredentialsService } from './workflow-credentials.service';
import { DEFAULT_GITHUB_CONNECT_CLIENT_ID, OAuthService } from './oauth.service';

// The GitHub **connect** flow (Phase 84 Theme A), against a real `:memory:` SQLite so the
// owner columns and the encrypted blob are exercised for real rather than faked.

const KEY = 'b'.repeat(64);
const USER = { userId: 'user-1', teamId: 'team-1' };

function makeDb() {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(__dirname, '../../../drizzle') });
  return db;
}

/** `githubOauth` mirrors what an operator would configure for the redirect grant. */
function config(githubOauth?: Record<string, unknown>): MidniteConfig {
  return parseConfig({
    agent: {},
    terminal: {},
    gateway: {},
    workflows: { enabled: true, oauth: githubOauth ? { github: githubOauth } : {} },
  });
}

function build(cfg = config()) {
  const crypto = new CryptoService();
  const repo = new WorkflowCredentialsRepository(makeDb(), crypto);
  const credService = new WorkflowCredentialsService(repo);
  const oauthService = new OAuthService(cfg, crypto, credService);
  credService.setOAuthService(oauthService);
  return { credService, oauthService, repo };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** Stub GitHub's device endpoints; `grants` is the token-response sequence. */
function stubDevice(grants: unknown[]) {
  const impl = vi.fn(async (input: unknown, _init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/login/device/code')) {
      return json({
        device_code: 'provider-secret',
        user_code: 'WXYZ-9876',
        verification_uri: 'https://github.com/login/device',
        expires_in: 900,
        interval: 0,
      });
    }
    if (url.includes('/login/oauth/access_token')) return json(grants.shift() ?? grants[0]);
    throw new Error(`unexpected fetch ${url}`);
  });
  vi.stubGlobal('fetch', impl);
  return impl;
}

beforeEach(() => {
  process.env[SECRET_KEY_ENV] = KEY;
});
afterEach(() => {
  delete process.env[SECRET_KEY_ENV];
  delete process.env['TEST_GH_SECRET'];
  vi.unstubAllGlobals();
});

describe('grant selection', () => {
  it('chooses device on a bare install — the zero-config path', () => {
    expect(build().oauthService.grantFor('github')).toBe('device');
  });

  it('chooses device when a clientId is configured but its secret env is unset', () => {
    // A half-configured redirect app must not silently become the connect path.
    const cfg = config({ clientId: 'own-app', clientSecretEnv: 'TEST_GH_SECRET' });
    expect(build(cfg).oauthService.grantFor('github')).toBe('device');
  });

  it('chooses redirect once the operator has both', () => {
    process.env['TEST_GH_SECRET'] = 'shh';
    const cfg = config({ clientId: 'own-app', clientSecretEnv: 'TEST_GH_SECRET' });
    expect(build(cfg).oauthService.grantFor('github')).toBe('redirect');
  });
});

describe('startDeviceConnect', () => {
  it('authenticates as the built-in connect app with the connect scopes', async () => {
    const impl = stubDevice([]);
    await build().oauthService.startDeviceConnect('github', 'My GitHub', USER);

    const body = String(vi.mocked(impl).mock.calls[0]?.[1]?.body);
    expect(body).toContain(`client_id=${DEFAULT_GITHUB_CONNECT_CLIENT_ID}`);
    expect(body).toContain('scope=repo+project+read%3Aorg');
  });

  it('uses the login app\'s client id for nothing — the two apps are separate', async () => {
    // Decision §1/§4: OAuth Apps grant scopes app-wide, so reusing the login app would
    // either force mass re-consent at sign-in or leave connect under-scoped.
    const impl = stubDevice([]);
    await build().oauthService.startDeviceConnect('github', 'My GitHub', USER);
    const body = String(vi.mocked(impl).mock.calls[0]?.[1]?.body);
    expect(body).not.toContain('Ov23liKqbNR5atXqqRQk');
  });

  it('prefers an operator-supplied client id', async () => {
    const impl = stubDevice([]);
    const cfg = config({ clientId: 'own-app', clientSecretEnv: 'TEST_GH_SECRET' });
    await build(cfg).oauthService.startDeviceConnect('github', 'My GitHub', USER);
    expect(String(vi.mocked(impl).mock.calls[0]?.[1]?.body)).toContain('client_id=own-app');
  });

  it('never leaks the provider device_code to the caller', async () => {
    stubDevice([]);
    const started = await build().oauthService.startDeviceConnect('github', 'My GitHub', USER);
    expect(started.userCode).toBe('WXYZ-9876');
    expect(JSON.stringify(started)).not.toContain('provider-secret');
  });

  it('refuses the device path when the install is configured for redirect', async () => {
    process.env['TEST_GH_SECRET'] = 'shh';
    const cfg = config({ clientId: 'own-app', clientSecretEnv: 'TEST_GH_SECRET' });
    await expect(
      build(cfg).oauthService.startDeviceConnect('github', 'My GitHub', USER),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('pollDeviceConnect', () => {
  it('stores the granted token as a credential owned by the acting user', async () => {
    stubDevice([{ error: 'authorization_pending' }, { access_token: 'gho_user', scope: 'repo,project' }]);
    const { oauthService, credService, repo } = build();
    const { deviceAuthId } = await oauthService.startDeviceConnect('github', 'My GitHub', USER);

    expect(await oauthService.pollDeviceConnect(deviceAuthId)).toEqual({ status: 'pending' });
    const done = await oauthService.pollDeviceConnect(deviceAuthId);
    if (done.status !== 'complete') throw new Error(`expected complete, got ${done.status}`);

    expect(done.credential.type).toBe('github-oauth');
    // Owned, not install-wide — that distinction is what makes it *your* GitHub.
    expect(repo.get(done.credential.id)?.userId).toBe('user-1');
    expect(repo.get(done.credential.id)?.teamId).toBe('team-1');
    // The stored scope is what GitHub granted, not what we requested.
    const resolved = await credService.resolve(done.credential.id);
    expect(resolved).toMatchObject({ accessToken: 'gho_user', scope: 'repo,project' });
  });

  it('encrypts the token at rest — the raw row never holds it in clear', async () => {
    stubDevice([{ access_token: 'gho_secret_value' }]);
    const { oauthService, repo } = build();
    const { deviceAuthId } = await oauthService.startDeviceConnect('github', 'My GitHub', USER);
    const done = await oauthService.pollDeviceConnect(deviceAuthId);
    if (done.status !== 'complete') throw new Error('expected complete');

    const raw = repo.get(done.credential.id)!;
    expect(raw.data).not.toContain('gho_secret_value');
    expect(raw.data.startsWith('v1:')).toBe(true);
  });

  it('is one-shot — a completed handle reads as expired', async () => {
    stubDevice([{ access_token: 'gho_user' }]);
    const { oauthService } = build();
    const { deviceAuthId } = await oauthService.startDeviceConnect('github', 'My GitHub', USER);
    expect((await oauthService.pollDeviceConnect(deviceAuthId)).status).toBe('complete');
    expect(await oauthService.pollDeviceConnect(deviceAuthId)).toEqual({ status: 'expired' });
  });

  it.each([
    ['expired_token', 'expired'],
    ['access_denied', 'denied'],
  ])('reports %s as the retryable outcome %s, storing nothing', async (error, status) => {
    stubDevice([{ error }]);
    const { oauthService, credService } = build();
    const { deviceAuthId } = await oauthService.startDeviceConnect('github', 'My GitHub', USER);
    expect(await oauthService.pollDeviceConnect(deviceAuthId)).toEqual({ status });
    expect(credService.list()).toEqual([]);
  });

  it('treats an unknown handle as expired', async () => {
    expect(await build().oauthService.pollDeviceConnect('never-existed')).toEqual({ status: 'expired' });
  });
});

describe('disconnect', () => {
  /** Land a real connection for USER and return the ids. */
  async function connect(cfg = config()) {
    stubDevice([{ access_token: 'gho_user', scope: 'repo' }]);
    const built = build(cfg);
    const { deviceAuthId } = await built.oauthService.startDeviceConnect('github', 'My GitHub', USER);
    const done = await built.oauthService.pollDeviceConnect(deviceAuthId);
    if (done.status !== 'complete') throw new Error('expected complete');
    return { ...built, credentialId: done.credential.id };
  }

  it('deletes locally and says it could NOT revoke, pointing the user at GitHub', async () => {
    // The honest secretless case: GitHub's revocation endpoints need Basic auth with the
    // client secret, which a device-flow install doesn't have.
    const { oauthService, credService, credentialId } = await connect();
    vi.unstubAllGlobals();

    const result = await oauthService.disconnect('github', 'user-1');

    expect(result.disconnected).toBe(true);
    expect(result.revokedAtProvider).toBe(false);
    expect(result.manageUrl).toBe('https://github.com/settings/applications');
    expect(credService.list().find((c) => c.id === credentialId)).toBeUndefined();
  });

  it('revokes at GitHub when a client secret IS configured', async () => {
    process.env['TEST_GH_SECRET'] = 'shh';
    const cfg = config({ clientId: 'own-app', clientSecretEnv: 'TEST_GH_SECRET' });
    // Connect via device first (grantFor would say redirect, so build the row directly).
    const { oauthService, credService } = build(cfg);
    credService.create(
      { name: 'My GitHub', data: { type: 'github-oauth', accessToken: 'gho_user', scope: 'repo' } },
      USER,
    );
    const revoke = vi.fn(async (_url: unknown, _init?: RequestInit) => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', revoke);

    const result = await oauthService.disconnect('github', 'user-1');

    expect(result).toEqual({ disconnected: true, revokedAtProvider: true, manageUrl: undefined });
    const [url, init] = vi.mocked(revoke).mock.calls[0]!;
    expect(String(url)).toBe('https://api.github.com/applications/own-app/grant');
    expect(init?.method).toBe('DELETE');
    const headers = init?.headers as Record<string, string> | undefined;
    expect(headers?.['authorization']).toMatch(/^Basic /);
  });

  it('treats a 404 from GitHub as already-revoked', async () => {
    process.env['TEST_GH_SECRET'] = 'shh';
    const cfg = config({ clientId: 'own-app', clientSecretEnv: 'TEST_GH_SECRET' });
    const { oauthService, credService } = build(cfg);
    credService.create(
      { name: 'My GitHub', data: { type: 'github-oauth', accessToken: 'gho_user', scope: 'repo' } },
      USER,
    );
    vi.stubGlobal('fetch', vi.fn(async (_u: unknown, _i?: RequestInit) => new Response(null, { status: 404 })));

    expect((await oauthService.disconnect('github', 'user-1')).revokedAtProvider).toBe(true);
  });

  it('still deletes locally when the revoke call fails', async () => {
    process.env['TEST_GH_SECRET'] = 'shh';
    const cfg = config({ clientId: 'own-app', clientSecretEnv: 'TEST_GH_SECRET' });
    const { oauthService, credService } = build(cfg);
    credService.create(
      { name: 'My GitHub', data: { type: 'github-oauth', accessToken: 'gho_user', scope: 'repo' } },
      USER,
    );
    vi.stubGlobal('fetch', vi.fn(async (_u: unknown, _i?: RequestInit): Promise<Response> => { throw new Error('network down'); }));

    const result = await oauthService.disconnect('github', 'user-1');
    expect(result).toMatchObject({ disconnected: true, revokedAtProvider: false });
    expect(credService.list()).toEqual([]);
  });

  it('reports nothing to disconnect when the user has no connection', async () => {
    const { oauthService } = build();
    await expect(oauthService.disconnect('github', 'user-1')).resolves.toEqual({
      disconnected: false,
      revokedAtProvider: false,
    });
  });

  it('never touches another user\'s connection', async () => {
    const { oauthService, credService } = build();
    credService.create(
      { name: 'Theirs', data: { type: 'github-oauth', accessToken: 'gho_other', scope: 'repo' } },
      { userId: 'user-2' },
    );

    expect((await oauthService.disconnect('github', 'user-1')).disconnected).toBe(false);
    expect(credService.list()).toHaveLength(1);
  });
});
