import { randomBytes } from 'node:crypto';
import { appendFileSync, chmodSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseEnvFile } from './gateway-process';

/**
 * Machine-local gateway secrets the packaged app auto-provisions on first boot.
 *
 * A downloaded midnite must require a login and encrypt stored secrets out of the
 * box — but a fresh machine has no `~/.midnite/.env`, so the embedded gateway would
 * otherwise boot on its local-dev defaults (JWT auth OFF, at-rest encryption OFF)
 * and expose the whole dashboard with no sign-in. We generate these once and
 * persist them so the very next launch (and every one after) runs with auth on:
 *
 * - `MIDNITE_JWT_SECRET`  — HS256 signing secret; a non-empty value flips the
 *   gateway's JWT auth to ON, so the web client requires login (Phase 33 / 71).
 * - `MIDNITE_SECRET_KEY`  — AES-256-GCM key for secrets at rest (provider API keys,
 *   workflow credentials). Also clears the setup wizard's "Secret key" step.
 *
 * Both are 32 random bytes, base64-encoded — `MIDNITE_SECRET_KEY` decodes to exactly
 * 32 bytes (what `crypto.service` accepts) and any non-empty string satisfies JWT.
 */
export const MANAGED_SECRET_ENV_NAMES = ['MIDNITE_JWT_SECRET', 'MIDNITE_SECRET_KEY'] as const;

/** A 32-byte secret, base64-encoded (decodes to 32 bytes for the AES-256 key). */
function generateSecret(): string {
  return randomBytes(32).toString('base64');
}

/**
 * Ensure the shared `~/.midnite/.env` holds every managed gateway secret, generating
 * and appending any that are missing. Idempotent: a secret already present in the
 * file — or already set in `process.env` (an operator-provided value at launch) — is
 * left untouched, so we never clobber a rotated key or regenerate one (which would
 * strand data encrypted under the old key). Returns the `.env` path when it exists
 * after the call (so the caller can hand it to the gateway child), else `null`.
 *
 * Call this ONLY for the packaged app: the dev flows (`moon run gateway:dev`, a dev
 * desktop run) must keep the auth-off local defaults, and they share this same
 * `~/.midnite/.env`.
 */
export function ensureGatewaySecrets(home: string): string | null {
  const envPath = join(home, '.env');
  const fileExisted = existsSync(envPath);
  const existing = fileExisted ? safeParse(envPath) : {};

  const additions = MANAGED_SECRET_ENV_NAMES.filter(
    (name) => !existing[name] && !process.env[name],
  ).map((name) => `${name}=${generateSecret()}`);

  if (additions.length > 0) {
    const header = fileExisted
      ? '\n'
      : '# Auto-generated machine-local midnite secrets — do not commit or share.\n';
    appendFileSync(envPath, `${header}${additions.join('\n')}\n`);
  }

  // Tighten permissions on every run, not only when we just wrote something.
  // Gated on `additions.length > 0`, a file that already held every managed
  // secret was never chmod'ed — so a `.env` created by hand, restored from a
  // backup, or copied between machines with loose modes kept them forever. The
  // file holds the JWT signing secret and the credential encryption key; its
  // permissions shouldn't depend on whether this particular launch happened to
  // add a line.
  if (existsSync(envPath)) {
    try {
      chmodSync(envPath, 0o600);
    } catch {
      // Non-fatal on filesystems that don't honour POSIX modes.
    }
  }

  return existsSync(envPath) ? envPath : null;
}

/** Parse the env file, tolerating a transient read error (treated as empty). */
function safeParse(envPath: string): Record<string, string> {
  try {
    return parseEnvFile(readFileSync(envPath, 'utf-8'));
  } catch {
    return {};
  }
}
