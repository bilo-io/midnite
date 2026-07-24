import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { parseEnvFile } from './gateway-process';
import { ensureGatewaySecrets, MANAGED_SECRET_ENV_NAMES } from './gateway-secrets';

let home: string;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'midnite-secrets-'));
});

afterEach(() => {
  rmSync(home, { recursive: true, force: true });
  for (const name of MANAGED_SECRET_ENV_NAMES) delete process.env[name];
});

describe('ensureGatewaySecrets', () => {
  it('creates .env with every managed secret on a fresh machine', () => {
    const envPath = ensureGatewaySecrets(home);
    expect(envPath).toBe(join(home, '.env'));

    const parsed = parseEnvFile(readFileSync(envPath!, 'utf-8'));
    for (const name of MANAGED_SECRET_ENV_NAMES) {
      expect(parsed[name], `${name} should be generated`).toBeTruthy();
    }
  });

  it('generates a MIDNITE_SECRET_KEY that decodes to a 32-byte AES key', () => {
    const envPath = ensureGatewaySecrets(home)!;
    const key = parseEnvFile(readFileSync(envPath, 'utf-8')).MIDNITE_SECRET_KEY;
    expect(key).toBeTruthy();
    expect(Buffer.from(key!, 'base64')).toHaveLength(32);
  });

  it('is idempotent — a second run adds nothing and preserves the values', () => {
    ensureGatewaySecrets(home);
    const first = readFileSync(join(home, '.env'), 'utf-8');
    ensureGatewaySecrets(home);
    const second = readFileSync(join(home, '.env'), 'utf-8');
    expect(second).toBe(first);
  });

  it('never clobbers a secret already present in the .env file', () => {
    const envPath = join(home, '.env');
    writeFileSync(envPath, 'MIDNITE_JWT_SECRET=operator-provided\n');
    ensureGatewaySecrets(home);

    const parsed = parseEnvFile(readFileSync(envPath, 'utf-8'));
    expect(parsed.MIDNITE_JWT_SECRET).toBe('operator-provided');
    // The other managed secret is still filled in.
    expect(parsed.MIDNITE_SECRET_KEY).toBeTruthy();
  });

  it('skips a secret already provided via process.env', () => {
    process.env.MIDNITE_JWT_SECRET = 'from-launch-env';
    ensureGatewaySecrets(home);

    const parsed = parseEnvFile(readFileSync(join(home, '.env'), 'utf-8'));
    // We don't persist a launch-env value, and we don't generate over it.
    expect(parsed.MIDNITE_JWT_SECRET).toBeUndefined();
    expect(parsed.MIDNITE_SECRET_KEY).toBeTruthy();
  });
});
