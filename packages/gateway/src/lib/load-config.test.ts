import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadConfigFromDisk } from './load-config';

// The desktop app serves the web from the gateway (single origin) and sets
// MIDNITE_SSO_WEB_BASE_URL to the gateway's own URL so the SSO callback redirects back
// to the app, not the operator config's `webBaseUrl` (which targets the hosted/dev web).
describe('loadConfigFromDisk — MIDNITE_SSO_WEB_BASE_URL override', () => {
  let dir: string;
  const saved = { ...process.env };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'midnite-cfg-'));
    // Minimal valid user config (via MIDNITE_CONFIG_PATH) so it doesn't walk up to a
    // real one and parses cleanly (schema fills every default).
    writeFileSync(join(dir, 'midnite.json'), JSON.stringify({ agent: {}, terminal: {}, gateway: {} }));
    // Operator config enabling SSO with the dev webBaseUrl.
    writeFileSync(
      join(dir, 'operator.json'),
      JSON.stringify({
        gateway: {
          auth: {
            jwt: { secretEnv: 'MIDNITE_JWT_SECRET' },
            sso: {
              webBaseUrl: 'http://localhost:3000',
              github: {
                clientId: 'cid',
                clientSecretEnv: 'MIDNITE_GITHUB_CLIENT_SECRET',
                scopes: ['read:user'],
              },
            },
          },
        },
      }),
    );
    process.env['MIDNITE_CONFIG_PATH'] = join(dir, 'midnite.json');
    process.env['MIDNITE_OPERATOR_CONFIG'] = join(dir, 'operator.json');
    process.env['MIDNITE_JWT_SECRET'] = 'test-secret';
    process.env['MIDNITE_GITHUB_CLIENT_SECRET'] = 'test-gh-secret';
  });

  afterEach(() => {
    process.env = { ...saved };
    rmSync(dir, { recursive: true, force: true });
  });

  it('rewrites sso.webBaseUrl to the override', () => {
    process.env['MIDNITE_SSO_WEB_BASE_URL'] = 'http://localhost:7777';
    const config = loadConfigFromDisk();
    expect(config.gateway.auth.sso?.webBaseUrl).toBe('http://localhost:7777');
  });

  it('leaves the config webBaseUrl untouched when the override is absent', () => {
    delete process.env['MIDNITE_SSO_WEB_BASE_URL'];
    const config = loadConfigFromDisk();
    expect(config.gateway.auth.sso?.webBaseUrl).toBe('http://localhost:3000');
  });
});
