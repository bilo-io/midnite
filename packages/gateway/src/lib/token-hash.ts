import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * SHA-256 hex digest of a secret token. Secrets are shown to the holder once and
 * stored only as this hash, so a DB/memory leak doesn't expose the plaintext.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Constant-time check that `token` hashes to `expectedHash` (a hex digest from
 * {@link hashToken}). Compares the raw digest bytes with `timingSafeEqual` so the
 * check doesn't leak how many leading characters matched.
 */
export function tokenMatches(token: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashToken(token), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
