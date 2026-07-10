import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import type { KdfParams } from '@midnite/shared';

/**
 * Phase 49 G — passphrase-based re-wrapping for portable secrets.
 *
 * A stored secret is encrypted under the instance's per-machine `MIDNITE_SECRET_KEY`
 * (CryptoService, AES-256-GCM). That key never leaves the box, so its ciphertext is
 * **not portable** — moving a secret across instances means decrypting it with the
 * source key and **re-encrypting under a passphrase-derived key** for transit, then
 * decrypting with the passphrase and re-encrypting under the *target*'s key on import.
 *
 * This module owns the transit hop: scrypt(passphrase, salt) → a 32-byte key, and
 * AES-256-GCM wrap/unwrap with a self-describing `p1:` envelope (mirrors CryptoService's
 * `v1:` format but keyed by the passphrase, not the env key). A single salt + params
 * live in the archive manifest (Decision: manifest-level, one salt).
 */

const VERSION_PREFIX = 'p1:';
const IV_BYTES = 12;
const TAG_BYTES = 16;

/** Default scrypt cost. N=2^15 keeps a single-passphrase derivation well under a
 *  second while resisting brute force; r/p/keyLen are the standard AES-256 shape. */
export const DEFAULT_KDF: Omit<KdfParams, 'salt'> = { N: 32768, r: 8, p: 1, keyLen: 32 };
// scrypt needs maxmem ≥ 128 * N * r; give headroom so a raised N doesn't throw.
const MAX_MEM = 256 * 1024 * 1024;

/** Fresh KDF params with a random 16-byte salt (base64) — stamped in the manifest. */
export function newKdfParams(): KdfParams {
  return { salt: randomBytes(16).toString('base64'), ...DEFAULT_KDF };
}

/** Derive the AES key from a passphrase + the archive's KDF params. Deterministic:
 *  the same `(passphrase, params)` always yields the same key (so import can unwrap). */
export function deriveKey(passphrase: string, params: KdfParams): Buffer {
  const salt = Buffer.from(params.salt, 'base64');
  return scryptSync(passphrase, salt, params.keyLen, {
    N: params.N,
    r: params.r,
    p: params.p,
    maxmem: MAX_MEM,
  });
}

/** Wrap plaintext for transit under a passphrase-derived key → `p1:<base64(iv|tag|ct)>`. */
export function wrapSecret(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return VERSION_PREFIX + Buffer.concat([iv, tag, ct]).toString('base64');
}

/**
 * Unwrap a `p1:` blob with the passphrase-derived key. Returns null when the key
 * is wrong or the blob is corrupt (GCM auth-tag mismatch) — the caller treats null
 * as "wrong passphrase" and fails the whole import (no partial write).
 */
export function unwrapSecret(blob: string, key: Buffer): string | null {
  if (!blob.startsWith(VERSION_PREFIX)) return null;
  try {
    const buf = Buffer.from(blob.slice(VERSION_PREFIX.length), 'base64');
    const iv = buf.subarray(0, IV_BYTES);
    const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
    const ct = buf.subarray(IV_BYTES + TAG_BYTES);
    if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) return null;
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  } catch {
    return null; // wrong passphrase / tampered blob
  }
}
